/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 */
"use strict";

const _ = require("lodash");

module.exports = {

    // After broker is created
    async created(broker) {

        // set options
        /*
        imicros: {
            options: {
                events: {
                    publisher: "events.publisher"
                }
            }
        }
        */
        _.set(broker,"imicros.options.events.publisher", _.get(this.options,"imicros.options.events.publisher","events.publisher"));
        
    },
    
    // When event is emitted
    emit(next) {
        return async function emitter(eventName, payload, groups, meta) {            

            let opts = { meta: meta };
            let params = {
                event: eventName,
                payload: payload
            };
            
            // Emit persistent event
            try {
                await this.call(this.imicros.options.events.publisher + ".emit", params, opts);
                this.logger.debug(`Emitted event ${eventName}`, { meta: meta });
            } catch (err) {
                this.logger.error(`Failed to emit event ${eventName}`, { meta: meta });
                throw err;
            }

            // Call default handler
            return next(eventName, payload, groups);
        };
    },

    // After broker started
    async started(broker) {
        
        // wait for event emitter
        await broker.waitForServices([this.imicros.options.events.publisher]);

    }

};