"use strict";
const { ServiceBroker } = require("moleculer");
const { Publisher } = require("../index");

const timestamp = Date.now();
const kafka = process.env.KAFKA_BROKER || "localhost:9092";

describe("Test publisher service", () => {

    let broker, service, opts;
    beforeAll(() => {
        broker = new ServiceBroker({
            logger: console,
            logLevel: "info" //"debug"
        });
        service = broker.createService(Publisher, Object.assign({ settings: { brokers: [kafka] } }));
        return broker.start();
    });
    
    afterAll(async () => {
        await broker.stop();
    });
    
    describe("Test create service", () => {

        it("it should be created", () => {
            expect(service).toBeDefined();
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
            });
        });
        
    });

});