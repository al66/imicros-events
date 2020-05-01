"use strict";
const { ServiceBroker } = require("moleculer");
const { Subscriber } = require("../index");
const { Publisher } = require("../index");
const { Admin } = require("../index");

const timestamp = Date.now();
const kafka = process.env.KAFKA_BROKER || "localhost:9092";
//const topic = `test-topic-${timestamp}`;
const topic = "events";
const groupId = `consumer-${timestamp}`;

const handler = {
    name: "handler",
    actions: {
        eachEvent: {
            params: {
                event: { type: "string" },
                payload: { type: "any" },
                version: { type: "string" },
                uid: { type: "string" },
                timestamp: { type: "number" }
            },
            handler(ctx) {
                let result = { service: this.name, meta: ctx.meta, params: ctx.params };
                this.logger.info(this.name + " called", result);
                return result;
            }
        }
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
        opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}`, access: [`g-${timestamp}`] } };
    });

    afterAll(async () => {
    });

    describe("Test create publisher service and topic", () => {

        it("it should create services", async () => {
            handlerService = await broker.createService(handler);
            adminService = await broker.createService(Admin, Object.assign({ settings: { brokers: [kafka] } }));
            publisherService = await broker.createService(Publisher, Object.assign({ settings: { brokers: [kafka], topic: topic } }));
            subscriberService = await broker.createService(Subscriber, Object.assign({ 
                settings: { brokers: [kafka], topic: topic, groupId: groupId, fromBeginning: false, handler: "handler.eachEvent" } 
            }));
            await broker.start();
            expect(handlerService).toBeDefined();
            expect(adminService).toBeDefined();
            expect(publisherService).toBeDefined();
            expect(subscriberService).toBeDefined();
        });
        
        it("it should create topic " + `test-topic-${timestamp}`, async () => {
            opts = { };
            let params = {
                topics: [ { 
                    topic: `test-topic-${timestamp}`,
                    numPartitions: 1,
                    replicationFactor: 1
                } ],
                waitForLeaders: true,
                timeout: 1000
            };
            let res = await broker.call("events.admin.createTopics", params, opts);
            expect(res.topics).toBeDefined();  
            expect(res.topics).toEqual(expect.objectContaining(params.topics));
        });        
        
    });
    
    describe("Test emit event ", () => {

        it("it should emit event", async () => {
            let params = {
                event: "test.emit",
                payload: { msg: "say hello to the world" }
            };
            let res = await broker.call("events.publisher.emit", params, opts);
            expect(res.topic).toBeDefined();
            expect(res.event).toEqual(params.event);
        });
        
    });

    describe("Test consume & call action", () => {
        let params = {
            event: "test.emit",
            payload: { msg: "say hello to the world" }
        };
        it("event match should call action ", async () => {
            expect.assertions(2);
            let res = await broker.call("events.publisher.emit", params, opts);
            expect(res.topic).toBeDefined();
            expect(res.event).toEqual(params.event);
        });
    });

    describe("Cleanup ", () => {

        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}` } };
        });

        it("it should delete topic", () => {
            opts = { };
            let params = {
                topics: [ `test-topic-${timestamp}` ],
                timeout: 1000
            };
            return broker.call("events.admin.deleteTopics", params, opts).then(res => {
                console.log(res);
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
