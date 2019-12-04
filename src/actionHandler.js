'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const {
    verificationToken,
    botUserAccessToken,
    postMessageUrl,
    postEphemeralMessageUrl,
    deleteMessageUrl
} = require('../lib/config');

const {
    scoreSheet,
    cancelGameMessage,
    buzzerMessage,
    buzzedNotificationForHost,
    buzzedNotificationForContestant,
    gameStartedMessage,
    pointsAllocationMessage
} = require('../messages');

const firestore = new Firestore();

const deleteUsersBuzzers = async buzzerMessagesData => {
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
};

const cancelGame = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    await documentRef.delete();

    await axios.post(responseUrl, cancelGameMessage);
};

const startGame = async payload => {
    const { response_url: responseUrl, channel: { id: channel } } = payload;

    axios.post(postMessageUrl, {
        channel,
        ...buzzerMessage
    }, {
        headers: {
            'Authorization': `Bearer ${botUserAccessToken}`
        }
    })

    return axios.post(responseUrl, gameStartedMessage);
};

const continueGame = async payload => {
    const { response_url: responseUrl } = payload;
    return axios.post(responseUrl, { replace_original: true, text: 'Game continued' });
};

const finishGame = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    const doc = await documentRef.get();
    const { scores, buzzerMessagesData } = doc.data();

    if (buzzerMessagesData) {
        await deleteUsersBuzzers(buzzerMessagesData);
    }

    await documentRef.delete();

    return axios.post(responseUrl, scoreSheet({ scores, gameStatus: 'finish' }));
};

const answerCorrect = async payload => {
    const { response_url: responseUrl } = payload;

    return axios.post(responseUrl, pointsAllocationMessage);
};

const answerWrong = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const { scores } = document.data();

    await documentRef.update({
        buzzedUser: null
    });

    return axios.post(responseUrl, scoreSheet({ scores }));
};

const buzz = async payload => {
    const { response_url: responseUrl, user: { id: userId }, team: { id: teamId }, channel: { id: channel } } = payload;

    const docRef = firestore.doc(`games/${teamId}`);
    const doc = await docRef.get();
    const { createdUserId, buzzedUser } = doc.data();

    if (!buzzedUser) {
        await docRef.update({
            buzzedUser: userId
        });
    
        await axios.post(postEphemeralMessageUrl, {
            channel,
            user: createdUserId,
            ...buzzedNotificationForHost(userId)
        }, {
            headers: {
                'Authorization': `Bearer ${botUserAccessToken}`
            }
        });

        return axios.post(responseUrl, buzzedNotificationForContestant(userId));
    }
};

const nextQuestion = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const { scores, buzzerMessagesData } = document.data();

    const buzzerResponses = await Promise.all(buzzerMessagesData.map(({ channel }) => (
        axios.post(postMessageUrl, {
            channel,
            ...buzzerMessage
        }, {
            headers: {
                'Authorization': `Bearer ${botUserAccessToken}`
            }
        })
    )));

    const newBuzzerMessagesData = buzzerResponses.map(response => {
        const { ts, channel } = response.data;
        return { ts, channel };
    });

    await documentRef.update({
        buzzerMessagesData: newBuzzerMessagesData
    });

    return axios.post(responseUrl, scoreSheet({ scores, gameStatus: 'waiting' }));
};

const actionMap = {
    startGame,
    cancelGame,
    continueGame,
    finishGame,
    buzz,
    answerCorrect,
    answerWrong,
    nextQuestion
};

module.exports = {
    post: async (req, res) => {
        // console.log(JSON.parse(req.body.payload));
        const payload = JSON.parse(req.body.payload);
        const { token, actions } = payload;
        const [{ value: actionValue }] =  actions;
    
        if (token !== verificationToken) {
            res.status(403).end('Forbidden');
        } else {
            const responseAction = actionMap[actionValue];

            if (responseAction) {
                await responseAction(payload);
            }

            res.status(200).end();
        }
    }
};
