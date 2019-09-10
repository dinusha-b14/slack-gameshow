'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { welcomeMessage, gameAlreadyStartedMessage } = require('../messages');
const {
    verificationToken,
    channelInfoUrl,
    botUserAccessToken
} = require('../lib/config');

const firestore = new Firestore();

module.exports = {
    post: async (req, res) => {
        const { response_url: responseUrl, token, team_id: teamId, channel_id: channelId, text, user_id: createdUserId } = req.body;

        if (token !== verificationToken) {
            res.status(403).end('Forbidden');
        } else {
            // First check to see if a document with the team ID already exists
            const documentRef = firestore.doc(`games/${teamId}`);
    
            // Extract user IDs from the list of users passed in.
            const channelInfoResponse = await axios.get(channelInfoUrl, {
                params: {
                    channel: channelId,
                    token: botUserAccessToken
                }
            });

            const { channel: { members } } = channelInfoResponse.data;

            // Initialize scores for each user.
            const scores = members.reduce((result, userId) => {
                result[userId] = 0;
                return result;
            }, {});

            try {
                await documentRef.create({
                    createdUserId,
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
