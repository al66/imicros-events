/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 *
 */
"use strict";

class Constants {

    static get VERSION() { return "1"; }
    
    constructor (object) {
        Object.assign(this, object);
    }
    
}

module.exports = {
    Constants: Constants
};