'use strict';

const welcomeMessage = require('./welcomeMessage');
const gameAlreadyStartedMessage = require('./gameAlreadyStartedMessage');
const gameStartedMessage = require('./gameStartedMessage');
const scoreSheet = require('./scoreSheet');
const cancelGameMessage = require('./cancelGameMessage');
const buzzerMessage = require('./buzzerMessage');
const buzzedNotificationForHost = require('./buzzedNotificationForHost');
const buzzedNotificationForContestant = require('./buzzedNotificationForContestant');
const pointsAllocationMessage = require('./pointsAllocationMessage');
const gameContinuationMessage = require('./gameContinuationMessage');

module.exports = {
    welcomeMessage,
    gameAlreadyStartedMessage,
    gameStartedMessage,
    scoreSheet,
    cancelGameMessage,
    buzzerMessage,
    buzzedNotificationForHost,
    buzzedNotificationForContestant,
    pointsAllocationMessage,
    gameContinuationMessage
};
