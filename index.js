/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 */
"use strict";

module.exports = {
    // Static [kafka]
    Publisher: require("./lib/events.publisher"),
    Subscriber: require("./lib/events.subscriber"),
    Middleware: require("./lib/events.middleware"),
    Admin: require("./lib/events.admin")
};
