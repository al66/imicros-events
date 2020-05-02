"use strict";
const { ServiceBroker } = require("moleculer");
const { Subscriber } = require("../index");
const { Publisher } = require("../index");
const { Admin } = require("../index");

const timestamp = Date.now();
const kafka = process.env.KAFKA_BROKER || "localhost:9092";
const topic = `test-topic-${timestamp}`;
const groupId = `consumer-${timestamp}`;

let g = {};

const handler = {
    name: "handler",
    actions: {
        eachEvent: {
            params: {
                offset: { type: "string" },
                event: { type: "string" },
                payload: { type: "any" },
                version: { type: "string" },
                uid: { type: "string" },
                timestamp: { type: "number" }
            },
            handler(ctx) {
                let result = { service: this.name, meta: ctx.meta, params: ctx.params };
                g = result;
                this.logger.info(this.name + " called", result);
                return result;
            }
        }
    }
};

// Subscriber service
const Sub = {
    name: "subsriber",
    mixins: [ Subscriber ],
    settings: { 
        brokers: [kafka], 
        topic: topic, 
        groupId: groupId, 
        fromBeginning: false, 
        handler: "handler.eachEvent" 
    } 
};

describe("Test subscriber service", () => {

    let broker, adminService, publisherService, subscriberService, handlerService, opts;
    beforeAll(() => {
        broker  = new ServiceBroker({
            logger: console,
            logLevel: "info" //"debug"
        });
    });

    beforeEach(() => {
        opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}` } };
    });

    afterAll(async () => {
    });

    describe("Test create publisher service and topic", () => {

        it("it should create services", async () => {
            handlerService = await broker.createService(handler);
            adminService = await broker.createService(Admin, Object.assign({ settings: { brokers: [kafka] } }));
            publisherService = await broker.createService(Publisher, Object.assign({ settings: { brokers: [kafka], topic: topic } }));
            await broker.start();
            expect(handlerService).toBeDefined();
            expect(adminService).toBeDefined();
            expect(publisherService).toBeDefined();
        });
        
        it("it should create topic " + `test-topic-${timestamp}`, async () => {
            opts = { };
            let params = {
                topics: [ { 
                    topic: topic,
                    numPartitions: 1,
                    replicationFactor: 1
                } ],
                waitForLeaders: true,
                timeout: 1000
            };
            let res = await broker.call("events.admin.createTopics", params, opts);
            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await sleep(2000);   // wait some time to avoid group coordinator error with travis test
            expect(res.topics).toBeDefined();  
            expect(res.topics).toEqual(expect.objectContaining(params.topics));
        });        
        
        it("it should create subscriber service", async () => {
            await broker.stop();
            subscriberService = await broker.createService(Sub);
            await broker.start();
            expect(subscriberService).toBeDefined();
        });
		
    });
    
    describe("Test consume & call action", () => {

        it("it should emit event", async () => {
            let params = {
                event: "test.emit",
                payload: { msg: "say hello to the world" }
            };
            g = {};
            let res = await broker.call("events.publisher.emit", params, opts);
            expect(res.topic).toBeDefined();
            expect(res.event).toEqual(params.event);
            console.log(g);
            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await sleep(100);   // give subscriber time to process the message
            expect(g.meta).toEqual(opts.meta);
            expect(g.params.event).toEqual(params.event);
            expect(g.params.payload).toEqual(params.payload);
            expect(g.params.version).toBeDefined();
            expect(g.params.uid).toBeDefined();
            expect(g.params.timestamp).toBeDefined();
        });
        
    });

    describe("Cleanup ", () => {

        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}` } };
        });

        it("it should delete topic", () => {
            opts = { };
            let params = {
                topics: [ topic ],
                timeout: 1000
            };
            return broker.call("events.admin.deleteTopics", params, opts).then(res => {
                expect(res.topics).toBeDefined();
                expect(res.topics).toEqual(expect.objectContaining(params.topics));
            });
        });
        
    });

    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });
    
});
