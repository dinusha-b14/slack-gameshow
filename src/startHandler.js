'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { welcomeMessage, gameAlreadyStartedMessage } = require('../messages');
const { verificationToken, postMessageUrl, botUserAccessToken } = require('../lib/config');

const firestore = new Firestore();

const getUserIds = text => {
    const regex = /<@(U[A-Za-z0-9]+)/g;
    const userIds = [];
    while (true) {
        const match = regex.exec(text);
        if (match !== null) {
            userIds.push(match[1]);
        } else {
            break;
        }
    }
    return userIds;
};

module.exports = {
    post: async (req, res) => {
        const { response_url: responseUrl, token, team_id: teamId, channel_id: channelId, text } = req.body;

        if (token !== verificationToken) {
            res.status(403).end('Forbidden');
        } else {
            // First check to see if a document with the team ID already exists
            const documentRef = firestore.doc(`games/${teamId}`);
    
            // Extract user IDs from the list of users passed in.
            const userIds = getUserIds(text);
            // Initialize scores for each user.
            const scores = userIds.reduce((result, userId) => {
                result[userId] = 0;
                return result;
            }, {});

            try {
                await documentRef.create({
                    teamId,
                    channelId,
                    scores,
                });
    
                await axios.post(responseUrl, welcomeMessage);
            } catch (err) {
                await axios.post(responseUrl, gameAlreadyStartedMessage);
            };
    
            res.status(200).end();
        }
    }
};
