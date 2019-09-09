'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { verificationToken, botUserAccessToken, imOpenUrl, postMessageUrl, deleteMessageUrl } = require('../lib/config');
const { welcomeMessage, startGameMessage, cancelGameMessage, buzzerMessage } = require('../messages');

const firestore = new Firestore();

const cancelGame = async ({ responseUrl, teamId }) => {
    const documentRef = firestore.doc(`games/${teamId}`);
    const doc = await documentRef.get();
    const docData = doc.data();

    const { buzzerMessagesData } = docData;

    if (buzzerMessagesData) {
        await Promise.all(buzzerMessagesData.map(({ channel, ts }) => {
            return axios.post(deleteMessageUrl, {
                channel,
                ts
            }, {
                headers: {
                    'Authorization': `Bearer ${botUserAccessToken}`
                }
            });
        }));
    }

    await documentRef.delete();

    await axios.post(responseUrl, cancelGameMessage);
};

const startGame = async ({ responseUrl, teamId }) => {
    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const documentData = document.data();

    const userIds = Object.keys(documentData.scores);

    const imResponses = await Promise.all(userIds.map(user => (
        axios.post(imOpenUrl, { user }, { headers: { 'Authorization': `Bearer ${botUserAccessToken}` } })
    )));

    const imChannelIds = imResponses.map(imResponse => imResponse.data.channel.id);

    const buzzerResponses = await Promise.all(imChannelIds.map(channel => (
        axios.post(postMessageUrl, {
            channel,
            ...buzzerMessage
        }, {
            headers: {
                'Authorization': `Bearer ${botUserAccessToken}`
            }
        })
    )));

    const buzzerMessagesData = buzzerResponses.map(response => {
        const { ts, channel } = response.data;
        return { ts, channel };
    });

    await documentRef.update({
        buzzerMessagesData: buzzerMessagesData
    });

    return axios.post(responseUrl, startGameMessage(documentData.scores));
};

const continueGame = async () => {

};

const finishGame = async ({ responseUrl, teamId }) => {

};

const actionMap = {
    startGame,
    cancelGame,
    continueGame,
    finishGame
};

module.exports = {
    post: async (req, res) => {
        // console.log(JSON.parse(req.body.payload));
        const { token, response_url: responseUrl, actions, team: { id: teamId } } = JSON.parse(req.body.payload);
        const [{ value: actionValue }] =  actions;
    
        if (token !== verificationToken) {
            res.status(403).end('Forbidden');
        } else {
            const responseAction = actionMap[actionValue];

            if (responseAction) {
                await responseAction({ responseUrl, teamId });
            }

            res.status(200).end();
        }
    }
};
