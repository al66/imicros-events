/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const { Kafka, logLevel } = require("kafkajs");
const { v4: uuid } = require("uuid");
const _ = require("lodash");
const { Serializer } = require("./serializer/base");
const { Constants } = require("./events.constants");

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
    
                // set meta
                let meta = ctx.meta;
                // set key: 
                //      1) ownerId 
                //      2) user.id 
                //      3) "core"  (DEFAULT_KEY)
                let key = _.get(meta,"user.id",Constants.DEFAULT_KEY);
                key = _.get(meta,"ownerId",key);
                
                // clean up meta
                meta = _.omit(meta, ["acl","auth","token","accessToken","serviceToken"]);
                
                // set message content
                let content = {
                    event: ctx.params.event,
                    payload: await this.serializer.serialize(ctx.params.payload),
                    meta:  await this.serializer.serialize(meta),
                    version: Constants.VERSION,
                    uid: uuid(),
                    timestamp: Date.now()
                };
                
                // Emit event
                try {
                    await this.producer.send({
                        topic: topic,
                        messages: [
                                { key: key, value: JSON.stringify(content) }
                        ]
                    });
                    this.logger.info("Event emitted", { topic: topic, event: content.event, uid: content.uid, timestamp: content.timestamp, version: content.version });
                    return { topic: topic, event: content.event, uid: content.uid, timestamp: content.timestamp, version: content.version };
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
        
        this.clientId = this.name + uuid(); 
        this.brokers = this.settings.brokers || ["localhost:9092"];
        
        // serviceLogger = kafkaLogLevel => ({ namespace, level, label, log }) ...
        this.serviceLogger = () => ({ level, log }) => {
            switch(level) {
				/* istanbul ignore next */
                case logLevel.ERROR:
                    return this.logger.error("namespace:" + log.message, log);
				/* istanbul ignore next */
                case logLevel.WARN:
                    return this.logger.warn("namespace:" + log.message, log);
				/* istanbul ignore next */
                case logLevel.INFO:
                    return this.logger.info("namespace:" + log.message, log);
				/* istanbul ignore next */
                case logLevel.DEBUG:
                    return this.logger.debug("namespace:" + log.message, log);
				/* istanbul ignore next */
                case logLevel.NOTHING:
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