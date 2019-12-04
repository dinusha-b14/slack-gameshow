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
    pointsAllocationMessage,
    gameContinuationMessage,
    gameContinuedMessage,
    gameFinishedMessage
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

    await axios.post(postMessageUrl, {
        channel,
        ...buzzerMessage
    }, {
        headers: {
            'Authorization': `Bearer ${botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, gameStartedMessage);
};

const continueGame = async payload => {
    const { response_url: responseUrl } = payload;
    return axios.post(responseUrl, gameContinuedMessage);
};

const finishGame = async payload => {
    const { response_url: responseUrl, channel: { id: channel }, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    const doc = await documentRef.get();
    const { scores } = doc.data();

    await documentRef.delete();

    await axios.post(postMessageUrl, {
        channel,
        ...scoreSheet({ scores, gameStatus: 'finish' })
    }, {
        headers: {
            'Authorization': `Bearer ${botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, gameFinishedMessage);
};

const answerCorrect = async payload => {
    const { response_url: responseUrl } = payload;

    return axios.post(responseUrl, pointsAllocationMessage);
};

const answerWrong = async payload => {
    return continueGameWithBuzzer(payload);
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
    return continueGameWithBuzzer(payload);
};

const allocatePoints = async payload => {
    const {
        response_url: responseUrl,
        channel: { id: channel },
        team: { id: teamId },
        actions: [{ selected_option: { value: userPoints } }]
    } = payload;

    const numericPoints = Number(userPoints);
    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const { buzzedUser, scores = {} } = document.data();

    const newScores = {
        ...scores
    };

    newScores[buzzedUser]
        ? newScores[buzzedUser] += numericPoints
        : newScores[buzzedUser] = numericPoints;

    await documentRef.update({
        scores: newScores
    });

    await axios.post(postMessageUrl, {
        channel,
        ...scoreSheet({ scores: newScores })
    }, {
        headers: {
            'Authorization': `Bearer ${botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, gameContinuationMessage);
};

const continueGameWithBuzzer = async payload => {
    const { response_url: responseUrl, channel: { id: channel }, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);

    await documentRef.update({
        buzzedUser: null
    });

    await axios.post(postMessageUrl, {
        channel,
        ...buzzerMessage
    }, {
        headers: {
            'Authorization': `Bearer ${botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, gameContinuedMessage);
};

const actionMap = {
    startGame,
    cancelGame,
    continueGame,
    finishGame,
    buzz,
    answerCorrect,
    answerWrong,
    nextQuestion,
    allocatePoints
};

module.exports = {
    post: async (req, res) => {
        // console.log(JSON.parse(req.body.payload));
        const payload = JSON.parse(req.body.payload);
        const { token, actions } = payload;
        const [{ value: actionValue, action_id: actionId }] =  actions;
    
        if (token !== verificationToken) {
            res.status(403).end('Forbidden');
        } else {
            let responseAction;
            if (actionValue) {
                responseAction = actionMap[actionValue];
            } else if (actionId) {
                responseAction = actionMap[actionId];
            }

            if (responseAction) {
                await responseAction(payload);
            }

            res.status(200).end();
        }
    }
};
