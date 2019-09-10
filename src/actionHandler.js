'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const {
    verificationToken,
    botUserAccessToken,
    imOpenUrl,
    postMessageUrl,
    postEphemeralMessageUrl,
    deleteMessageUrl
} = require('../lib/config');
const {
    scoreSheet,
    cancelGameMessage,
    buzzerMessage,
    userAlreadyBuzzed,
    userBuzzedFirst,
    buzzedNotification
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
    const doc = await documentRef.get();
    const docData = doc.data();

    const { buzzerMessagesData } = docData;

    if (buzzerMessagesData) {
        await deleteUsersBuzzers(buzzerMessagesData);
    }

    await documentRef.delete();

    await axios.post(responseUrl, cancelGameMessage);
};

const startGame = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const { scores } = document.data();


    const userIds = Object.keys(scores);

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
        buzzerMessagesData
    });

    return axios.post(responseUrl, scoreSheet({ scores, gameStatus: 'start' }));
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
    const { response_url: responseUrl, team: { id: teamId } } = payload;
    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const { buzzedUser, scores, buzzerMessagesData } = document.data();

    // increment score for user
    let userScore = scores[buzzedUser];
    userScore++;
    scores[buzzedUser] = userScore;

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
        scores,
        buzzerMessagesData: newBuzzerMessagesData,
        buzzedUser: null
    });

    return axios.post(responseUrl, scoreSheet({ scores }));
};

const answerWrong = async payload => {
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
        buzzerMessagesData: newBuzzerMessagesData,
        buzzedUser: null
    });

    return axios.post(responseUrl, scoreSheet({ scores }));
};

const buzz = async payload => {
    const { user: { id: userId }, response_url: responseUrl, team: { id: teamId }, channel: { id: userChannelId} } = payload;

    const documentRef = firestore.doc(`games/${teamId}`);
    const document = await documentRef.get();
    const { buzzedUser, channelId, buzzerMessagesData, createdUserId } = document.data();

    if (buzzedUser) {
        return axios.post(responseUrl, userAlreadyBuzzed);
    } else {
        await documentRef.update({
            buzzedUser: userId
        });

        if (buzzerMessagesData) {
            await deleteUsersBuzzers(buzzerMessagesData);
        }

        return axios.post(postEphemeralMessageUrl, {
            channel: channelId,
            user: createdUserId,
            ...buzzedNotification(userId)

        }, {
            headers: {
                'Authorization': `Bearer ${botUserAccessToken}`
            }
        });  
    }
};

const actionMap = {
    startGame,
    cancelGame,
    continueGame,
    finishGame,
    buzz,
    answerCorrect,
    answerWrong
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
