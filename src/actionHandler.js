'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { verificationToken } = require('../lib/config');
const { startGameMessage, cancelGameMessage } = require('../messages');

const firestore = new Firestore();

const cancelGame = async ({ responseUrl, teamId }) => {
    const documentRef = firestore.doc(`games/${teamId}`);

    await documentRef.delete();

    await axios.post(responseUrl, cancelGameMessage);
};

const startGame = async ({ responseUrl, teamId }) => {
    const documentRef = firestore.doc(`games/${teamId}`);

    const document = await documentRef.get();

    const documentData = document.data();

    await axios.post(responseUrl, startGameMessage(documentData.scores));
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
