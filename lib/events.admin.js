/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const { Kafka, logLevel } = require("kafkajs");
const uuidV4 = require("uuid/v4");
//const _ = require("lodash");

module.exports = {
    name: "events.admin",
    
	/**
	 * Service settings
	 */
    settings: {
        /*
        brokers: ["localhost:9092"]
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

        createTopics: {
            params: {
                topics: { type: "array",
                    items: {
                        type: "object",
                        props: {
                            topic: { type: "string", empty: false },
                            numPartitions: { type: "number", optional: true },                      // default: 1
                            replicationFactor: { type: "number", optional: true },                  // default: 1
                            replicaAssignment: { type: "array", items: "number", optional: true },  // default: []
                            configEntries: { type: "array", items: "object", optional: true }
                        }
                    }
                },
                validateOnly: { type: "boolean", optional: true },      // default: 1
                waitForLeaders: { type: "boolean", optional: true },    // default: 1
                timeout: { type: "number", optional: true }             // default: 5000 (ms)
            },
            async handler(ctx) {
                this.logger.info("Create topics ", ctx.params.topics);
                await this.admin.createTopics({
                    validateOnly: ctx.params.validateOnly,
                    waitForLeaders: ctx.params.waitForLeaders,
                    timeout: ctx.params.timeout,
                    topics: ctx.params.topics,
                });
                return { topics: ctx.params.topics };
            }
        },
        
        getTopicMetadata: {
            params: { 
                topics: { type: "array", items: "string", optional: true}
            },
            async handler(ctx) {
                let res = await this.admin.getTopicMetadata(ctx.params);
                this.logger.debug("Get topic meta data ", ctx.params.topics, res);
                return res;
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

    },

	/**
	 * Service started lifecycle event handler
	 */
    async started() {
        
        this.admin = await this.kafka.admin();
        await this.admin.connect();
        this.logger.info("Admin client connected to kafka brokers " + this.brokers.join(","));
        
    },

	/**
	 * Service stopped lifecycle event handler
	 */
    async stopped() {
        
        await this.admin.disconnect();
        this.logger.info("Admin client disconnected");
        
    }
};