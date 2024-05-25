

const { Kafka, logLevel } = require("kafkajs");

const kafka = new Kafka({
    clientId: "TEST",
    brokers: ["192.168.2.124:30088"],
    logLevel: 5,                        //logLevel.DEBUG,
    ssl: null,     // refer to kafkajs documentation
    sasl: null,   // refer to kafkajs documentation
    connectionTimeout: 1000,
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const consumer = kafka.consumer({ 
    groupId: "MY_GROUP",
    allowAutoTopicCreation: false   
});

const run = async () => {

    await consumer.connect();
    await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

    await consumer.run({
        eachMessage: async({ topic, partition, message}) =>{
            console.log("received:", {
                partition,
                offset: message.offset,
                value: message.value.toString()
            })
        }
    })
}

run().catch(e => console.error(`[simple-consumer] ${e.message}` ));

