"use strict";

const { ServiceBroker } = require("moleculer");
const { EventsMiddleware } = require("../index");

const timestamp = Date.now();

let g = {};

let emitter = {
    name: "emitter",
    actions: {
        emit: {
            params: {
                event: { type: "string" },
                payload: { type: "any" }
            },
            async handler(ctx) {
                if (g.fail) throw new Error("Failed");
                g = {
                    event: ctx.params.event,
                    payload: ctx.params.payload,
                    meta: ctx.meta
                };
                this.logger.info(`Event '${ctx.params.event}' has been received.`, ctx.params.payload, ctx.meta);
            }
        }
    }
};

let test = {
    name: "test",
    actions: {
        emit: {
            params: {
                event: { type: "string" },
                payload: { type: "any" }
            },
            async handler(ctx) {
                if (g.await) {
                    await ctx.emit(ctx.params.event, ctx.params.payload);
                } else {
                    ctx.emit(ctx.params.event, ctx.params.payload);
                }
                this.logger.info(`Event '${ctx.params.event}' has been emitted.`, ctx.params.payload, ctx.meta);
                return ctx.params;
            }
        }
    }
};

describe("Test publisher service", () => {

    let broker; //, service, opts;
    beforeAll(() => {
    });
    
    afterAll(async () => {
    });
    
    describe("Test broker", () => {

        it("it should be created & started", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "info", //"debug"
                middlewares: [EventsMiddleware({service: "emitter"})],
            });
            await broker.createService(emitter);
            await broker.createService(test);
            await broker.start();
            expect(broker).toBeDefined();
        });
    });

    describe("Test emit event with meta data", () => {

        it("it should emit event", async () => {
            let meta = {
                a: 5, 
                owner: { type: "group",id: "group" + timestamp },
                onDone: { event: "test.hello.done" }
            };
            let params = {
                event: "test.emit.event",
                payload: {
                    a: 5
                }
            };
            await broker.call("test.emit", params, { meta: meta } );
            expect(g.event).toEqual(params.event);
            expect(g.payload).toEqual(params.payload);
            expect(g.meta).toEqual(meta);
        });
		
    });

    describe("Test emitter error with await", () => {

        it("it should fail to emit", async () => {
            let meta = {
                a: 5, 
                owner: { type: "group",id: "group" + timestamp },
                onDone: { event: "test.hello.done" }
            };
            let params = {
                event: "test.emit.event",
                payload: {
                    a: 5
                }
            };
            g.fail = true;
            g.await = true;
            expect.assertions(1);
            try {
                let res = await broker.call("test.emit", params, { meta: meta } );
                expect(res).toEqual(params);
            } catch (err) {
				// 
            }
        });
		
    });

    describe("Test emitter error w/o await", () => {

        it("it should fail to emit w/o throwing the error", async () => {
            let meta = {
                a: 5, 
                owner: { type: "group",id: "group" + timestamp },
                onDone: { event: "test.hello.done" }
            };
            let params = {
                event: "test.emit.event",
                payload: {
                    a: 5
                }
            };
            g.fail = true;
            g.await = false;
            expect.assertions(1);
            try {
                let res = await broker.call("test.emit", params, { meta: meta } );
                expect(res).toEqual(params);
            } catch (err) {
				// 
            }
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