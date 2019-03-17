"use strict";
const { ServiceBroker } = require("moleculer");
const { Subscriber } = require("../index");
const { Publisher } = require("../index");

const timestamp = Date.now();
const kafka = process.env.KAFKA_BROKER || "localhost:9092";

const handler = {
    name: "handler",
    actions: {
        eachEvent: {
            handler(ctx) {
                let result = { service: this.name, meta: ctx.meta, params: ctx.params };
                this.logger.info(this.name + " called", result);
                return result;
            }
        }
    }
};

describe("Test subscriber service", () => {

    let broker, publisherService, subscriberService, handlerService, opts;
    beforeAll(() => {
        broker  = new ServiceBroker({
            logger: console,
            logLevel: "info" //"debug"
        });
        handlerService = broker.createService(handler);
        publisherService = broker.createService(Publisher, Object.assign({ settings: { brokers: [kafka] } }));
        opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}`, access: [`g-${timestamp}`] } };
        return broker.start();
    });

    afterAll(async () => {
    });

    describe("Test create publisher service", () => {

        it("it should be created", () => {
            expect(handlerService).toBeDefined();
            expect(publisherService).toBeDefined();
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

    describe("Test create subscriber service", () => {

        it("it should be created", async () => {
            await broker.stop();
            subscriberService = await broker.createService(Subscriber, Object.assign({ 
                settings: { brokers: [kafka], groupId: "Test", fromBeginning: false, handler: "handler.eachEvent" } 
            }));
            await broker.start();
            expect(subscriberService).toBeDefined();
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
    
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });
    
});
