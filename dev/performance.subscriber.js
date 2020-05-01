"use strict";
const { ServiceBroker } = require("moleculer");
const { Subscriber } = require("../index");
const { Publisher } = require("../index");
const { Admin } = require("../index");

const timestamp = Date.now();
const topic = `performance-topic-${timestamp}`;

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

let brokerAdmin  = new ServiceBroker({
    nodeID: "Admin" + timestamp,
    logger: console,
    logLevel: "error", //"debug"
    transporter: "nats://192.168.2.124:4222"
});
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
    for (let i = 1; i<=n; i++) {
        params = {
            event: "user.created",
            payload: { msg: "Number" + i, offset: i }
        };
        await broker.call("events.publisher.emit", params, opts);
        count++;
    }
};
let ts, te, tf;
let run = async () => {
    
    // Create new topic first
    await brokerAdmin.createService(Admin, Object.assign({ settings: { brokers: ["192.168.2.124:9092"] } }));
    await brokerAdmin.start();
    let params = {
        topics: [ { topic: topic } ],
        //topics: [ { topic: topic, numPartitions: 1, replicationFactor: 1, replicaAssignment: [{ partition: 0, replicas: [0] }]  } ],
        waitForLeaders: false,
        timeout: 1000
    };
    await brokerAdmin.call("events.admin.createTopics", params, {});
    
    await brokerAction.createService(Handler);
    await broker.createService(Publisher, Object.assign({ settings: { 
        brokers: ["192.168.2.124:9092"], 
        topic: topic 
    }}));
    await broker.createService(Subscriber, Object.assign({ settings: { 
        brokers: ["192.168.2.124:9092"], 
        topic: topic, 
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
        let offset = calls.length;
        console.log({
            "emit completed": {
                "events emitted": count,
                "handler calls": offset,
                "handler offset": calls[offset-1] ? calls[offset-1].params.offset : "undefined",
                "time (ms)": te-ts
            }
        });
        await new Promise((resolve) => {
            let running = true;
            let timeout = setTimeout(() => {
                running = false;
                console.log("timeout");
                resolve();
            }, 50000);
            let loop = () => {
                if (!running) return;
                if (calls.length >= count) {
                    clearTimeout(timeout);
                    return resolve();
                }
                setImmediate(loop); 
            };
            loop();                
        });
        tf = Date.now();
        offset = calls.length;
        console.log({
            "handler completed": {
                "events emitted": count,
                "handler calls": offset,
                "handler offset": calls[offset-1] ? calls[offset-1].params.offset : "undefined",
                "time (ms)": tf-ts
            }
        });
    });
    await broker.stop();
    await brokerAction.stop();
    await brokerAdmin.stop();
    
};
run();