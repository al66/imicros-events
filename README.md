# imicros-events
[![Build Status](https://travis-ci.org/al66/imicros-events.svg?branch=master)](https://travis-ci.org/al66/imicros-events)
[![Coverage Status](https://coveralls.io/repos/github/al66/imicros-events/badge.svg?branch=master)](https://coveralls.io/github/al66/imicros-events?branch=master)

[Moleculer](https://github.com/moleculerjs/moleculer) service for persistent event queue with Kafka

## Installation
```
$ npm install imicros-events --save
```
## Dependencies
Requires a running [Kafka](https://kafka.apache.org/) broker - [docker example](#docker).

# Usage
## Usage Publisher
```js
const { ServiceBroker } = require("moleculer");
const { Publisher } = require("imicros-events");

let broker  = new ServiceBroker({ logger: console });

broker.createService(Publisher, Object.assign({ 
    name: "publisher",
    settings: { 
        brokers: ['localhost:9092'],    // list of Kafka brokers
        topic: "events"                 // must already exist (can be created with Admin)
    } 
}));


let run = async () => {
    await broker.start();
    await broker.call("publisher.emit", {
        event: "my.first.event",
        payload: { msg: "somthing useful" }
    })
    await broker.stop();
}
run();
```
## Usage Middleware
Calls the publisher service for each emitted event (w/o broadcast events).
```js
const { ServiceBroker } = require("moleculer");
const { EventsMiddleware } = require("imicros-events");

let broker  = new ServiceBroker({ 
    logger: console,
    middlewares: [EventsMiddleware({service: "publisher"})],
});

```
## Usage Subscriber
Calls the defined action for each received message.
```js
const { ServiceBroker } = require("moleculer");
const { Subscriber } = require("imicros-events");

const Handler = {
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
                // do something useful...
                this.logger.info(this.name + " called", { service: this.name, meta: ctx.meta, params: ctx.params });
                // if you don't throw an error, the message will acknowledged for this group 
                return true;
            }
        }
    }
};

// Subscriber service
const Sub = {
    name: "subsriber",
    mixins: [ Subscriber ],
    dependencies: ["handler"],
    settings: { 
        brokers: ['localhost:9092'],    // list of Kafka brokers
        topic: "events",                // must already exist (can be created with Admin)
        groupId: "subscriber",          // group id for consuming messages 
        fromBeginning: false, 
        handler: "handler.eachEvent"    // action to call for event handling (signature see service Handler)
    } 
};

broker  = new ServiceBroker({
    logger: console
});

await broker.createService(handler);
await broker.createService(Sub);
await broker.start();

```
# Published Kafka Message
```js
JSON.stringify({
    event: ctx.params.event,
    payload: await this.serializer.serialize(ctx.params.payload),
    meta:  await this.serializer.serialize(meta),
    version: Constants.VERSION,
    uid: uuid(),
    timestamp: Date.now()
})

```
# Docker
## Kafka/Zookeeper example
```
version: '2'
services:
  zookeeper:
    image: wurstmeister/zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    networks:
      - kafka
  kafka:
    image: wurstmeister/kafka
    container_name: kafka
    ports:
      - "9092:9092"
    links:
        - zookeeper
    environment:
    #  KAFKA_ADVERTISED_HOST_NAME: ${HOST_IP}
    #  KAFKA_ADVERTISED_HOST_NAME: ${DOCKER_KAFKA_HOST}
      KAFKA_ADVERTISED_HOST_NAME: 192.168.2.124
    #  KAFKA_ADVERTISED_PORT: ${DOCKER_KAFKA_PORT}
      KAFKA_ADVERTISED_PORT: 9092
    #  KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://${HOST_IP}:${DOCKER_KAFKA_PORT}
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://192.168.2.124:9092
      KAFKA_CREATE_TOPICS: "events:1:1"
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
    volumes:
        - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - kafka
networks:
    kafka:
        external: true
```
