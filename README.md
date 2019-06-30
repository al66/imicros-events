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
      KAFKA_ADVERTISED_HOST_NAME: 192.168.2.124
    #  KAFKA_ADVERTISED_HOST_NAME: ${DOCKER_KAFKA_HOST}
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
