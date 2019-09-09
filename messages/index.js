'use strict';

const welcomeMessage = require('./welcomeMessage');
const gameAlreadyStartedMessage = require('./gameAlreadyStartedMessage');
const startGameMessage = require('./startGameMessage');
const cancelGameMessage = require('./cancelGameMessage');
const buzzerMessage = require('./buzzerMessage');
const userAlreadyBuzzed = require('./userAlreadyBuzzed');
const userBuzzedFirst = require('./userBuzzedFirst');
const buzzedNotification = require('./buzzedNotification');

module.exports = {
    welcomeMessage,
    gameAlreadyStartedMessage,
    startGameMessage,
    cancelGameMessage,
    buzzerMessage,
    userAlreadyBuzzed,
    userBuzzedFirst,
    buzzedNotification
};
