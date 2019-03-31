"use strict";
const { ServiceBroker } = require("moleculer");
const { Admin } = require("../index");

const timestamp = Date.now();
const kafka = process.env.KAFKA_BROKER || "localhost:9092";

//const util = require("util");

describe("Test admin service", () => {

    let broker, service, opts;
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
            service = broker.createService(Admin, Object.assign({ settings: { brokers: [kafka] } }));
            await broker.start();
            expect(service).toBeDefined();
        });
    });

    describe("Test create topic ", () => {

        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}` } };
        });

        it("it should create topic " + `test-topic-${timestamp}`, () => {
            opts = { };
            let params = {
                topics: [ { topic: `test-topic-${timestamp}` } ],
                waitForLeaders: true,
                timeout: 1000
            };
            return broker.call("events.admin.createTopics", params, opts).then(res => {
                expect(res.topics).toBeDefined();
                expect(res.topics).toEqual(expect.objectContaining(params.topics));
            });
        });
        
    });
    
    describe("Get topics", () => {

        it("it should return existing topic 'events' ", () => {
            opts = { };
            let params = { topics: [`test-topic-${timestamp}`] };
            return broker.call("events.admin.getTopicMetadata", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.topics).toContainEqual(expect.objectContaining({ name: `test-topic-${timestamp}`, partitions: expect.anything() }));
                //console.log(util.inspect(res,{ depth: null }));
            });
        });
        
        it("it should return existing topics", () => {
            opts = { };
            let params = { topics: ["events"] };
            return broker.call("events.admin.getTopicMetadata", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.topics).toContainEqual(expect.objectContaining({ name: "events", partitions: expect.anything() }));
                //console.log(util.inspect(res,{ depth: null }));
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