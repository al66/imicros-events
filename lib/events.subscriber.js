/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const { Kafka, logLevel } = require("kafkajs");
const uuidV4 = require("uuid/v4");
const _ = require("lodash");
const { Serializer } = require("./serializer/base");

module.exports = {
    name: "events.subscriber",
    
    /**
     * Service settings
     */
    settings: {
        /*
        brokers: ["localhost:9092"]
        topic: "events",
        groupId: "flow",
        fromBeginning: false,
        handler: "service.action"
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
    actions: {},

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {
        
        /**
         * Subscribe 
         *     - Starts a consumer for the subscription 
         * 
         * @param {Object} subscription 
         * 
         */
        async subscribe (subscription) {
            try {

                let consumer = this.kafka.consumer({ groupId: subscription.groupId });

                // connect consumer and subscribe to the topic
                await consumer.connect();
                await consumer.subscribe({ topic: subscription.topic, fromBeginning: subscription.fromBeginning });
                // don't know how to set offset ... better to start always with "fromBeginning"...consuming is quite cheap
                //await this.consumer.seek({ topic: this.topics.events, partition: 0, offset: 0 })

                // start runner
                await consumer.run({
                    eachMessage: this.eachEvent(JSON.parse(JSON.stringify(subscription))),
                });

                // memorize consumer for cleaning up on service stop
                this.consumers.push(consumer);

                this.logger.debug(`Subscription for topic '${subscription.topic}' running`, { subscription: subscription });

            } catch (e) {
                this.logger.warn(`Subscription for topic ${subscription.topic}) failed`);
                throw e;
            }
        },

        /**
         * eachEvent
         *      - Calls the event handler 
         * 
         * @param {Object} subscription 
         * 
         * @returns {Boolean} result
         */
        eachEvent (subscription) {
            // available parameters { topic, partition, message }
            return async ({ topic, message }) => {

                let offset = message.offset.toString();
                try {

                    let content = JSON.parse(message.value.toString());
                    let params, options, result;
                    
                    this.logger.debug(`Event topic ${topic} offset ${offset} received`, {
                        subscription: subscription,
                        value: content
                    });

                    /* 
                     * call the given handler of subscription
                     */
                    if (subscription.handler) {
                        /*
                        params =  this.serializer.deserialize(content.payload);
                        options = {
                            meta: this.serializer.deserialize(content.meta)
                        };
                        */
                        params =  content.payload;
                        options = {
                            meta: content.meta
                        };
                        _.set(options.meta,"events.uid", content.uid);
                        _.set(options.meta,"events.timestamp", content.timestamp);
                        result = await this.broker.call(subscription.handler, params, options);
                        this.logger.debug(`Event topic ${topic} offset ${offset} handler called`, {
                            handler: subscription.handler,
                            result: result
                        });
                    }
                    
                } catch(err) {
                    switch (err.constructor) {
                        default: {
                            this.logger.error(`Unreadable event in topic ${topic} offset ${offset}`, err);
                            return Promise.reject(err);
                        }
                    }
                }
            };
        }        
        
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        
        this.clientId = this.name + uuidV4(); 
        this.brokers = this.settings.brokers || ["localhost:9092"];

				// Map kafkajs log to service logger
        // serviceLogger = kafkaLogLevel => ({ namespace, level, label, log }) ...
        this.serviceLogger = () => ({ namespace, level, log }) => {
            switch(level) {
                case logLevel.ERROR:
                case logLevel.NOTHING:
                    return this.logger.error("KAFKAJS: " + namespace + log.message, log);
                case logLevel.WARN:
                    return this.logger.warn("KAFKAJS: " + namespace + log.message, log);
                case logLevel.INFO:
                    return this.logger.info("KAFKAJS: " + namespace + log.message, log);
                case logLevel.DEBUG:
                    return this.logger.debug("KAFKAJS: " + namespace + log.message, log);
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
        this.subscription = {
            topic: this.settings.topic || "events",
            groupId: this.settings.groupId || uuidV4(),
            fromBeginning: this.settings.fromBeginning || false,
            handler: this.settings.handler
        };
        this.consumers = [];

        this.serializer = new Serializer();
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        
        // Start consumer
        await this.subscribe(this.subscription);

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {

        try {
            let topic = this.topic;
            await Promise.all(this.consumers.map(consumer => consumer.pause([{ topic }])));
            await Promise.all(this.consumers.map(consumer => consumer.disconnect()));
            this.logger.info("All consumers disconnected");
        } catch (err) {
            this.logger.error("Failed to disconnect consumers", err);
        }
    
    }

};