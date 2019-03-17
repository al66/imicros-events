/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const { Kafka, logLevel } = require("kafkajs");
const uuidV4 = require("uuid/v4");
const _ = require("lodash");
const { Serializer } = require("./serializer/base");

module.exports = {
    name: "events.publisher",
    
	/**
	 * Service settings
	 */
    settings: {
        /*
        brokers: ["localhost:9092"]
        topic: "events"
        */
    },

	/**
	 * Service metadata
	 */
    metadata: {},

	/**
	 * Service dependencies
	 */
	//dependencies: [],	

	/**
	 * Actions
	 */
    actions: {

        emit: {
            params: {
                event: { type: "string" },
                payload: { type: "any" }
            },
            async handler(ctx) {
                
                // set topic
                let topic = this.topic;
                
                // set message content
                let content = {
                    event: ctx.params.event,
                    payload: await this.serializer.serialize(ctx.params.payload),
                    meta:  await this.serializer.serialize(ctx.meta),
                    uid: uuidV4(),
                    timestamp: Date.now()
                };
                
                // set key: 
                //      1) goupId 
                //      2) userId 
                //      3) "core"
                let key = _.get(content.meta,"userId","core");
                key = _.get(content.meta,"groupId",key);
                
                // set new context id, if not provided
                _.set(content.meta, "flow.contextId", _.get(ctx.meta,"flow.contextId", uuidV4()));
                
                // Emit event
                try {
                    await this.producer.send({
                        topic: topic,
                        messages: [
                                { key: key, value: JSON.stringify(content) }
                        ]
                    });
                    this.logger.info("Event emitted", { topic: topic, event: content.event, uid: content.uid, timestamp: content.timestamp });
                    return { topic: topic, event: content.event, uid: content.uid, timestamp: content.timestamp };
                } catch (err) {
                    this.logger.error(`Failed to emit event ${content.event} to topic ${topic}`, { content: content, error: err });
                    throw err;
                }
            }
        }
        
    },

    /**
     * Events
     */
    events: {},

    /**
	   * Methods
	   */
    methods: {},

    /**
     * Service created lifecycle event handler
     */
    created() {
        
        this.clientId = this.name + uuidV4(); 
        this.brokers = this.settings.brokers || ["localhost:9092"];
        
        // serviceLogger = kafkaLogLevel => ({ namespace, level, label, log }) ...
        this.serviceLogger = () => ({ level, log }) => {
            switch(level) {
                case logLevel.ERROR:
                case logLevel.NOTHING:
                    return this.logger.error("namespace:" + log.message, log);
                case logLevel.WARN:
                    return this.logger.warn("namespace:" + log.message, log);
                case logLevel.INFO:
                    return this.logger.info("namespace:" + log.message, log);
                case logLevel.DEBUG:
                    return this.logger.debug("namespace:" + log.message, log);
            }
        };
        
        this.defaults = {
            connectionTimeout: 1000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        };
        
        // Create the client with the broker list
        this.kafka = new Kafka({
            clientId: this.clientId,
            brokers: this.brokers,
            logLevel: 5, //logLevel.DEBUG,
            logCreator: this.serviceLogger,
            ssl: this.settings.ssl || null,     // refer to kafkajs documentation
            sasl: this.settings.sasl || null,   // refer to kafkajs documentation
            connectionTimeout: this.settings.connectionTimeout ||  this.defaults.connectionTimeout,
            retry: this.settings.retry || this.defaults.retry
        });

        this.topic = this.settings.topic || "events";
        
        this.serializer = new Serializer();
    },

	/**
	 * Service started lifecycle event handler
	 */
    async started() {
        
        this.producer = await this.kafka.producer();
        await this.producer.connect();
        this.logger.info("Producer connected to kafka brokers " + this.brokers.join(","));
        
    },

	/**
	 * Service stopped lifecycle event handler
	 */
    async stopped() {
        
        await this.producer.disconnect();
        this.logger.info("Producer disconnected");
        
    }
};