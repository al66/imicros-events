"use strict";
const { ServiceBroker } = require("moleculer");
const { Subscriber } = require("../index");
const { Publisher } = require("../index");

const timestamp = Date.now();
const calls = [];
const Handler = {
    name: "handler",
    actions: {
        eachEvent: {
            async handler(ctx) {
                let result = { service: this.name, meta: ctx.meta, params: ctx.params };
                this.logger.info("Service called:", result);
                await calls.push(result);
                return result;
            }
        }
    }
};

let broker  = new ServiceBroker({
    nodeID: "Subscriber" + timestamp,
    logger: console,
    logLevel: "error", //"debug"
    transporter: "nats://192.168.2.124:4222"
});
let brokerAction  = new ServiceBroker({
    nodeID: "Action" + timestamp,
    logger: console,
    logLevel: "error", //"debug"
    transporter: "nats://192.168.2.124:4222"
});
let n = 10000;
let count = 0;
let emit = async () => {
    let opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, groupId: `g-${timestamp}`, access: [`g-${timestamp}`] } };
    let params;
    for (let i = 0; i<n; i++) {
        params = {
            event: "user.created",
            payload: { msg: "Number" + i }
        };
        await broker.call("events.publisher.emit", params, opts);
        count++;
    }
};
let ts, te, tf;
let run = async () => {
    await brokerAction.createService(Handler);
    await broker.createService(Publisher, Object.assign({ settings: { brokers: ["192.168.2.124:9092"] } }));
    await broker.createService(Subscriber, Object.assign({ settings: { 
        brokers: ["192.168.2.124:9092"], 
        groupId: "performance.subscriber", 
        fromBeginning: false, 
        handler: "handler.eachEvent"
    }}));
    await brokerAction.start();
    await broker.start();
    await broker.waitForServices(["handler"]).then(async () => {
        ts = Date.now();
        await emit();
        te = Date.now();
        console.log({
            "emit completed": {
                "events emitted": count,
                "handler calls": calls.length,
                "time (ms)": te-ts
            }
        });
        await new Promise((resolve) => {
            let running = true;
            setTimeout(() => {
                running = false;
                resolve();
            }, 10000);
            let loop = () => {
                if (!running) return;
                if (calls.length >= count) return resolve();
                setImmediate(loop); 
            };
            loop();                
        });
        tf = Date.now();
        console.log({
            "handler completed": {
                "events emitted": count,
                "handler calls": calls.length,
                "time (ms)": tf-ts
            }
        });
    });
    await broker.stop();
    await brokerAction.stop();
    
};
run();