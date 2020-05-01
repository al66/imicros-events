"use strict";
const { ServiceBroker } = require("moleculer");
const { Publisher } = require("../index");
const { Admin } = require("../index");

const timestamp = Date.now();
const kafka = process.env.KAFKA_BROKER || "localhost:9092";
const topic = `test-topic-${timestamp}`;

describe("Test publisher service", () => {

    let broker, service, admin, opts;
    beforeAll(() => {
    });
    
    afterAll(async () => {
    });
    
    describe("Test create service", () => {

        it("it should be created", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "info" //"debug"
            });
            service = await broker.createService(Publisher, Object.assign({ settings: { brokers: [kafka], topic: topic } }));
            admin = await broker.createService(Admin, Object.assign({ settings: { brokers: [kafka] } }));
            await broker.start();
            expect(service).toBeDefined();
            expect(admin).toBeDefined();
        });

        it("it should create topic event", () => {
            opts = { };
            let params = {
                topics: [ { topic: topic } ],
                waitForLeaders: true,
                timeout: 1000
            };
            return broker.call("events.admin.createTopics", params, opts).then(res => {
                expect(res.topics).toBeDefined();
            });
        });
        
    });

    describe("Test emit event ", () => {

        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}` } };
        });

        it("it should emit event", () => {
            opts = { };
            let params = {
                event: "test.emit",
                payload: { msg: "say hello to the world" }
            };
            return broker.call("events.publisher.emit", params, opts).then(res => {
                expect(res.topic).toBeDefined();
                expect(res.event).toEqual(params.event);
                expect(res.version).toEqual("1");
            });
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