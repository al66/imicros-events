/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 */
"use strict";

module.exports = ({service}) => { return {

    // When event is emitted
    emit(next) {
        return async function emitter(eventName, payload, opts) {            

            let params = {
                event: eventName,
                payload: payload
            };
            
            // Emit persistent event
            try {
                await this.call(service + ".emit", params, opts);
                this.logger.debug(`Emitted event ${eventName}`, { opts: opts });
            } catch (err) {
                this.logger.error(`Failed to emit event ${eventName}`, { opts: opts, err: err });
            }

            // Call default handler
            return next(eventName, payload, opts);
        };
    },

    // After broker started
    async started(broker) {
        
        // wait for event emitter
        await broker.waitForServices([service]);

    }

};};