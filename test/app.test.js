'use strict';

const request = require('supertest');
const { expect } = require('chai');
const nock = require('nock');
const axios = require('axios');
const sinon = require('sinon');
const { Firestore } = require('@google-cloud/firestore');
const app = require('../src/app');
const config = require('../lib/config');
const {
    welcomeMessage,
    gameAlreadyStartedMessage,
    cancelGameMessage,
    gameStartedMessage,
    buzzerMessage,
    buzzedNotificationForHost,
    buzzedNotificationForContestant
} = require('../messages');

const responseUrlBasePath = 'https://response.url.com';
const slackApiBasePath = 'https://slack.com/api';

const firestore = new Firestore();
const sandbox = sinon.createSandbox();

const responseUrl = `${responseUrlBasePath}/response-url`;
const teamId = 'my-team-id';
const channelId = 'my-channel-id';
const createdUserId = 'created-user-id';

beforeEach(async () => {
    sandbox.stub(axios, 'post');
});

afterEach(() => {
    nock.cleanAll();
    sandbox.restore();
});

describe('POST /start', () => {
    describe('when verification token is invalid', () => {
        it('returns 403 Forbidden', async () => {
            const response = await request(app).post('/start').send({
                token: 'some-other-token',
                response_url: responseUrl,
                team_id: 'my-team-id',
                text: '',
                user_id: createdUserId
            });

            expect(response.statusCode).to.equal(403);
            expect(response.text).to.equal('Forbidden');
        });
    });

    describe('when verification token is valid', () => {
        const requestBody = {
            token: config.verificationToken,
            response_url: responseUrl,
            team_id: teamId,
            channel_id: channelId,
            text: '',
            user_id: createdUserId
        };

        describe('when game has not already started', () => {
            beforeEach(async() => {
                const docRef = firestore.doc(`games/${teamId}`);
                try {
                    await docRef.delete();
                } catch(err) {
                    // do nothing.
                }

                nock(responseUrlBasePath)
                    .post('/response-url', welcomeMessage)
                    .reply(200);

                nock(responseUrlBasePath)
                    .post('/response-url', gameAlreadyStartedMessage)
                    .reply(200);
            })

            it('returns 200 OK', async () => {
                const response = await request(app).post('/start').send(requestBody);

                sandbox.assert.calledWith(axios.post, responseUrl, welcomeMessage);
                sandbox.assert.neverCalledWith(axios.post, responseUrl, gameAlreadyStartedMessage);

                const documentRef = firestore.doc(`games/${teamId}`);
                const document = await documentRef.get();
                const documentData = document.data();

                expect(documentData.teamId).to.equal(teamId);
                expect(documentData.channelId).to.equal(channelId);
                expect(documentData.createdUserId).to.equal(createdUserId);
                expect(documentData.scores).to.eql({});
                expect(response.statusCode).to.equal(200);
            });
        });

        describe('when game already started', () => {
            beforeEach(async () => {
                const docRef = firestore.doc(`games/${teamId}`);
                try {
                    await docRef.delete();
                } catch(err) {
                    // do nothing.
                }

                nock(responseUrlBasePath)
                    .post('/response-url', welcomeMessage)
                    .reply(200);

                nock(responseUrlBasePath)
                    .post('/response-url', gameAlreadyStartedMessage)
                    .reply(200);

                await docRef.create({
                    createdUserId,
                    teamId,
                    channelId
                });
            });

            it('returns 200 OK', async () => {
                const response = await request(app).post('/start').send(requestBody);

                sandbox.assert.neverCalledWith(axios.post, responseUrl, welcomeMessage);
                sandbox.assert.calledWith(axios.post, responseUrl, gameAlreadyStartedMessage);

                expect(response.statusCode).to.equal(200);
            });
        });
    });
});

describe('POST /action', () => {
    beforeEach(async () => {
        const documentRef = firestore.doc(`games/${teamId}`);

        await documentRef.set({
            teamId,
            channelId,
            createdUserId,
            scores: {}
        });
    });

    afterEach(async () => {
        const documentRef = firestore.doc(`games/${teamId}`);

        try {
            await documentRef.delete();
        } catch(err) {
            // do nothing.
        }
    });

    describe('when verification token is invalid', () => {
        it('returns 403 Forbidden', async () => {
            const response = await request(app).post('/action').send({
                payload: JSON.stringify({
                    token: 'some-other-token',
                    response_url: responseUrl,
                    team: {
                        id: teamId
                    },
                    actions: [
                        {
                            value: 'someAction'
                        }
                    ]
                })
            });

            expect(response.statusCode).to.equal(403);
            expect(response.text).to.equal('Forbidden');
        });
    });

    describe('when actionValue is cancelGame', () => {
        beforeEach(async () => {
            nock(responseUrlBasePath)
                .post('/response-url', cancelGameMessage)
                .reply(200);
        });

        it('returns 200 OK and cancels the game', async () => {
            const response = await request(app).post('/action').send({
                payload: JSON.stringify({
                    token: config.verificationToken,
                    response_url: responseUrl,
                    team: {
                        id: teamId
                    },
                    actions: [
                        {
                            value: 'cancelGame'
                        }
                    ]
                })
            });

            const documentRef = firestore.doc(`games/${teamId}`);

            const doc = await documentRef.get();

            sandbox.assert.calledWith(axios.post, `${responseUrlBasePath}/response-url`, cancelGameMessage);

            expect(response.statusCode).to.equal(200);
            expect(doc.exists).to.equal(false);
        });
    });

    describe('when actionValue is startGame', () => {
        beforeEach(async () => {
            nock(responseUrlBasePath)
                .post('/response-url', gameStartedMessage)
                .reply(200);

            nock(slackApiBasePath, {
                reqheaders: {
                    'Authorization': `Bearer ${config.botUserAccessToken}`
                }
            })
                .post('/chat.postMessage', { channel: 'D2346XH78', ...buzzerMessage })
                .reply(200, { ok: true, channel: 'D2346XH78', ts: '2384342786.3468723423' });
        });

        it('returns 200 OK and starts the game', async () => {
            const response = await request(app).post('/action').send({
                payload: JSON.stringify({
                    token: config.verificationToken,
                    response_url: responseUrl,
                    team: {
                        id: teamId
                    },
                    channel: {
                        id: 'D2346XH78'
                    },
                    actions: [
                        {
                            value: 'startGame'
                        }
                    ]
                })
            });

            sandbox.assert.calledWith(axios.post, config.postMessageUrl, { channel: 'D2346XH78', ...buzzerMessage });
            sandbox.assert.calledWith(axios.post, responseUrl, gameStartedMessage);

            expect(response.statusCode).to.equal(200);
        });
    });

    describe('when actionValue is buzz', () => {
        const buzzedUserId = 'U0D15K92L';

        describe('when a user has not already buzzed in', () => {
            beforeEach(async () => {
                nock(responseUrlBasePath)
                    .post('/response-url', buzzedNotificationForContestant(buzzedUserId))
                    .reply(200);
                
                nock(config.postEphemeralMessageUrl, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('', buzzedNotificationForHost(buzzedUserId))
                    .reply(200);
            });

            it('returns 200 OK, sets the buzzed user in the DB and responds back to both the host and the buzzed user', async () => {
                const response = await request(app).post('/action').send({
                    payload: JSON.stringify({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        user: {
                            id: buzzedUserId
                        },
                        team: {
                            id: teamId
                        },
                        channel: {
                            id: channelId
                        },
                        actions: [
                            {
                                value: 'buzz'
                            }
                        ]
                    })
                });

                const docRef = firestore.doc(`games/${teamId}`);
                const doc = await docRef.get();
                const docData = doc.data();

                sandbox.assert.calledWith(axios.post, responseUrl, buzzedNotificationForContestant(buzzedUserId));
                sandbox.assert.calledWith(axios.post, config.postEphemeralMessageUrl, {
                    channel: channelId,
                    user: createdUserId,
                    ...buzzedNotificationForHost(buzzedUserId)
                }, {
                    headers: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                });

                expect(response.statusCode).to.equal(200);
                expect(docData.buzzedUser).to.equal(buzzedUserId);
            });
        });

        describe('when a user has already buzzed in and a different user buzzes in', () => {
            beforeEach(async () => {
                const docRef = firestore.doc(`games/${teamId}`);

                await docRef.update({
                    buzzedUser: buzzedUserId
                });

                nock(responseUrlBasePath)
                    .post('/response-url', buzzedNotificationForContestant(buzzedUserId))
                    .reply(200);
                
                nock(config.postEphemeralMessageUrl, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('', buzzedNotificationForHost(buzzedUserId))
                    .reply(200);
            });

            it('returns 200 OK and does not send any further messages', async () => {
                const response = await request(app).post('/action').send({
                    payload: JSON.stringify({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        user: {
                            id: 'U83JK7327'
                        },
                        team: {
                            id: teamId
                        },
                        channel: {
                            id: channelId
                        },
                        actions: [
                            {
                                value: 'buzz'
                            }
                        ]
                    })
                });

                const docRef = firestore.doc(`games/${teamId}`);
                const doc = await docRef.get();
                const docData = doc.data();

                sandbox.assert.neverCalledWith(axios.post, responseUrl, buzzedNotificationForContestant('U83JK7327'));
                sandbox.assert.neverCalledWith(axios.post, config.postEphemeralMessageUrl, {
                    channel: channelId,
                    user: createdUserId,
                    ...buzzedNotificationForHost('U83JK7327')
                }, {
                    headers: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                });

                expect(response.statusCode).to.equal(200);
                expect(docData.buzzedUser).to.equal(buzzedUserId);
            });
        });
    });
});

