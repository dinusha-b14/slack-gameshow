'use strict';

const welcomeMessage = require('./welcomeMessage');
const gameAlreadyStartedMessage = require('./gameAlreadyStartedMessage');
const gameStartedMessage = require('./gameStartedMessage');
const scoreSheet = require('./scoreSheet');
const cancelGameMessage = require('./cancelGameMessage');
const buzzerMessage = require('./buzzerMessage');
const userAlreadyBuzzed = require('./userAlreadyBuzzed');
const userBuzzedFirst = require('./userBuzzedFirst');
const buzzedNotificationForHost = require('./buzzedNotificationForHost');
const buzzedNotificationForContestant = require('./buzzedNotificationForContestant');
const pointsAllocationMessage = require('./pointsAllocationMessage');

module.exports = {
    welcomeMessage,
    gameAlreadyStartedMessage,
    gameStartedMessage,
    scoreSheet,
    cancelGameMessage,
    buzzerMessage,
    userAlreadyBuzzed,
    userBuzzedFirst,
    buzzedNotificationForHost,
    buzzedNotificationForContestant,
    pointsAllocationMessage
};
