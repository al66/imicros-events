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
                logger: {
                    type: "Console",
                    options: {
						// Logging level
                        level: "info",
						// Using colors on the output
                        colors: true,
						// Print module names with different colors (like docker-compose for containers)
                        moduleColors: true,
						// Line formatter. It can be "json", "short", "simple", "full", a `Function` or a template string like "{timestamp} {level} {nodeID}/{mod}: {msg}"
                        formatter: "full",
						// Custom object printer. If not defined, it uses the `util.inspect` method.
                        objectPrinter: null,
						// Auto-padding the module name in order to messages begin at the same column.
                        autoPadding: true
                    }
                }
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

        it("it should create topic events, if it does not exist", async () => {
            opts = { };
            let params = {
                topics: [ { topic: "events" } ],
                waitForLeaders: true,
                timeout: 1000
            };
            return broker.call("events.admin.createTopics", params, opts).then(res => {
                expect(res.topics).toBeDefined();
                expect(res.topics).toEqual(expect.objectContaining(params.topics));
            });
        });

    });

    describe("Fetch topic meta data", () => {

        it("it should return existing topic " + `test-topic-${timestamp}`, () => {
            opts = { };
            let params = { topics: [`test-topic-${timestamp}`] };
            return broker.call("events.admin.fetchTopicMetadata", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.topics).toContainEqual(expect.objectContaining({ name: `test-topic-${timestamp}`, partitions: expect.anything() }));
                //console.log(util.inspect(res,{ depth: null }));
            });
        });
        
        it("it should return existing topics", () => {
            opts = { };
            let params = {};
            return broker.call("events.admin.fetchTopicMetadata", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.topics).toContainEqual(expect.objectContaining({ name: "events", partitions: expect.anything() }));
                expect(res.topics).toContainEqual(expect.objectContaining({ name: `test-topic-${timestamp}`, partitions: expect.anything() }));
                //console.log(util.inspect(res,{ depth: null }));
            });
        });
        
    });
    
    describe("Delete tocpics", () => {
        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}` } };
        });

        it("it should delete topic " + `test-topic-${timestamp}`, () => {
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