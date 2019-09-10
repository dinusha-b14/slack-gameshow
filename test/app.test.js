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
    scoreSheet,
    buzzerMessage,
    cancelGameMessage,
    userAlreadyBuzzed,
    buzzedNotification
} = require('../messages');

const responseUrlBasePath = 'https://response.url.com';
const slackApiBasePath = 'https://slack.com/api';

const sandbox = sinon.createSandbox();

const firestore = new Firestore();
const responseUrl = `${responseUrlBasePath}/response-url`;
const teamId = 'my-team-id';
const channelId = 'my-channel-id';
const createdUserId = 'created-user-id';

let axiosSpy, axiosSpyGet;

beforeEach(() => {
    axiosSpy = sandbox.spy(axios, 'post');
    axiosSpyGet = sandbox.spy(axios, 'get');
});

afterEach(() => {
    nock.cleanAll();
    sandbox.restore();
});

describe('GET /', () => {
    it('returns 200 OK', async () => {
        const response = await request(app).get('/')
        expect(response.statusCode).to.equal(200);
        expect(response.header['content-type']).to.equal('text/html; charset=utf-8');
        expect(response.text).to.equal('Welcome to Gameshow!');
    });
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
        beforeEach(async () => {
            // Clean up any existing docs with the testing team ID
            try {
                await firestore.doc(`games/${teamId}`).delete();
            } catch (err) {
                // We can ignore any errors during this deletion.
            }

            nock(responseUrlBasePath)
                .post('/response-url', welcomeMessage)
                .reply(200);
            
            nock(responseUrlBasePath)
                .post('/response-url', gameAlreadyStartedMessage)
                .reply(200);
        });

        describe('when users are provided correctly', () => {
            beforeEach(async () => {
                nock(slackApiBasePath)
                    .get('/channels.info')
                    .query({ channel: channelId, token: config.botUserAccessToken })
                    .reply(200, {
                        channel: {
                            members: ['UMYR57FST', 'USLY76FDY']
                        }
                    });
            });

            describe('when game has not already started', () => {
                it('returns 200 OK and initializes a document with users scores and sends a welcome message to start the game', async () => {
                    const response = await request(app).post('/start').send({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team_id: teamId,
                        channel_id: channelId,
                        text: '',
                        user_id: createdUserId
                    });
    
                    const documentRef = firestore.doc(`games/${teamId}`);

                    const document = await documentRef.get();

                    const documentData = document.data();

                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, welcomeMessage);
                    sandbox.assert.calledWith(axiosSpyGet, `${slackApiBasePath}/channels.info`, { params: { token: config.botUserAccessToken, channel: channelId } });

                    expect(response.statusCode).to.equal(200);
                    expect(documentData.teamId).to.equal(teamId);
                    expect(documentData.channelId).to.equal(channelId);
                    expect(documentData.createdUserId).to.equal(createdUserId);
                    expect(documentData.scores).to.eql({
                        'UMYR57FST': 0,
                        'USLY76FDY': 0
                    });
                });
            });

            describe('when game already started', () => {
                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);

                    await documentRef.create({
                        teamId,
                        channelId,
                        scores: {
                            'U3287462873': 0,
                            'U7457344589': 0
                        }
                    });
                });

                it('returns 200 OK and does not reinitialize a new game and sends a message stating that the game has already started', async () => {
                    const response = await request(app).post('/start').send({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team_id: teamId,
                        channel_id: channelId,
                        text: '<@UMYR57FST|user> <@USLY76FDY|user>'
                    });

                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, gameAlreadyStartedMessage);
                    expect(response.statusCode).to.equal(200);
                });
            });
        });
    });
});

describe('POST /action', () => {
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

    describe('when verification token is valid', () => {
        const userScores = {
            'UMYR57FST': 0,
            'USLY76FDY': 0
        };

        beforeEach(async () => {
            nock(responseUrlBasePath)
                .post('/response-url', scoreSheet({ scores: userScores, gameStatus: 'start' }))
                .reply(200);
            
            nock(slackApiBasePath, {
                reqheaders: {
                    'Authorization': `Bearer ${config.botUserAccessToken}`
                }
            })
                .post('/im.open', { user: 'UMYR57FST' })
                .reply(200, { ok: true, channel: { id: 'D2346XH78' } });

            nock(slackApiBasePath, {
                reqheaders: {
                    'Authorization': `Bearer ${config.botUserAccessToken}`
                }
            })
                .post('/im.open', { user: 'USLY76FDY' })
                .reply(200, { ok: true, channel: { id: 'D23564GHG' } });

            const documentRef = firestore.doc(`games/${teamId}`);

            await documentRef.set({
                teamId,
                channelId,
                scores: userScores
            });
        });

        describe('when actionValue is startGame', () => {
            beforeEach(async () => {
                nock(slackApiBasePath, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('/chat.postMessage', { channel: 'D2346XH78', ...buzzerMessage })
                    .reply(200, { ok: true, channel: 'D2346XH78', ts: '2384342786.3468723423' });
    
                nock(slackApiBasePath, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('/chat.postMessage', { channel: 'D23564GHG', ...buzzerMessage })
                    .reply(200, { ok: true, channel: 'D23564GHG', ts: '5468973453.3762384683' });
            });

            it('returns 200 OK and sets up the game', async () => {
                const response = await request(app).post('/action').send({
                    payload: JSON.stringify({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team: {
                            id: teamId
                        },
                        actions: [
                            {
                                value: 'startGame'
                            }
                        ]
                    })
                });

                const documentRef = firestore.doc(`games/${teamId}`);

                const document = await documentRef.get();

                const documentData = document.data();

                sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, scoreSheet({ scores: userScores, gameStatus: 'start' }));
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/im.open`, { user: 'UMYR57FST' });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/im.open`, { user: 'USLY76FDY' });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D2346XH78', ...buzzerMessage });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D23564GHG', ...buzzerMessage });

                expect(response.statusCode).to.equal(200);
                expect(documentData.buzzerMessagesData).to.deep.include(
                    {
                        channel: 'D2346XH78',
                        ts: '2384342786.3468723423'
                    }
                );
                expect(documentData.buzzerMessagesData).to.deep.include(
                    {
                        channel: 'D23564GHG',
                        ts: '5468973453.3762384683'
                    }
                );
            });
        });

        describe('when actionValue is cancelGame', () => {
            beforeEach(async () => {
                nock(responseUrlBasePath)
                    .post('/response-url', cancelGameMessage)
                    .reply(200);
            });

            describe('when buzzerMessagesData exists', () => {
                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);

                    await documentRef.set({
                        teamId,
                        channelId,
                        scores: userScores,
                        buzzerMessagesData: [
                            {
                                ts: '2384342786.3468723423',
                                channel: 'D2346XH78'
                            },
                            {
                                ts: '5468973453.3762384683',
                                channel: 'D23564GHG'
                            }
                        ]
                    });

                    nock(slackApiBasePath, {
                        reqheaders: {
                            'Authorization': `Bearer ${config.botUserAccessToken}`
                        }
                    })
                        .post('/chat.delete', { channel: 'D2346XH78', ts: '2384342786.3468723423' })
                        .reply(200);
                    
                    nock(slackApiBasePath, {
                        reqheaders: {
                            'Authorization': `Bearer ${config.botUserAccessToken}`
                        }
                    })
                        .post('/chat.delete', { channel: 'D23564GHG', ts: '5468973453.3762384683' })
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

                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, cancelGameMessage);
                    sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.delete`, { channel: 'D2346XH78', ts: '2384342786.3468723423' });
                    sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.delete`, { channel: 'D23564GHG', ts: '5468973453.3762384683' });

                    expect(response.statusCode).to.equal(200);
                    expect(doc.exists).to.equal(false);
                });
            });

            describe('when buzzerMessagesData does not exist', () => {
                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);

                    await documentRef.set({
                        teamId,
                        channelId,
                        scores: userScores
                    }); 
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

                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, cancelGameMessage);
                    expect(response.statusCode).to.equal(200);
                    expect(doc.exists).to.equal(false);
                });
            });
        });

        describe('when actionValue is buzz', () => {
            const buzzedInUser = 'USLY76FDY';
            const buzzedInUserChannel = 'D23564GHG';

            describe('when user has already buzzed in', () => {
                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);

                    await documentRef.set({
                        teamId,
                        channelId,
                        createdUserId,
                        scores: userScores,
                        buzzedUser: 'UMYR57FST'
                    });

                    nock(responseUrlBasePath)
                        .post('/response-url', userAlreadyBuzzed)
                        .reply(200);
                });

                it('returns 200 OK and mentions that another user has already buzzed in', async () => {
                    const response = await request(app).post('/action').send({
                        payload: JSON.stringify({
                            token: config.verificationToken,
                            response_url: responseUrl,
                            team: {
                                id: teamId
                            },
                            user: {
                                id: buzzedInUser
                            },
                            channel: {
                                id: buzzedInUserChannel
                            },
                            actions: [
                                {
                                    value: 'buzz'
                                }
                            ]
                        })
                    });

                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, userAlreadyBuzzed);
                    expect(response.statusCode).to.equal(200);
                });
            });

            describe('when user is first to buzz in', () => {
                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);

                    await documentRef.set({
                        teamId,
                        channelId,
                        createdUserId,
                        scores: userScores,
                        buzzerMessagesData: [
                            {
                                channel: 'D2346XH78',
                                ts: '2384342786.3468723423'
                            },
                            {
                                channel: 'D23564GHG',
                                ts: '5468973453.3762384683'
                            }
                        ]
                    });
                    
                    nock(slackApiBasePath, {
                        reqheaders: {
                            'Authorization': `Bearer ${config.botUserAccessToken}`
                        }
                    })
                        .post('/chat.postEphemeral', { channel: channelId, user: createdUserId, ...buzzedNotification(buzzedInUser) })
                        .reply(200);
                    
                    nock(slackApiBasePath, {
                        reqheaders: {
                            'Authorization': `Bearer ${config.botUserAccessToken}`
                        }
                    })
                        .post('/chat.delete', { channel: 'D2346XH78', ts: '2384342786.3468723423' })
                        .reply(200);

                    nock(slackApiBasePath, {
                        reqheaders: {
                            'Authorization': `Bearer ${config.botUserAccessToken}`
                        }
                    })
                        .post('/chat.delete', { channel: 'D23564GHG', ts: '5468973453.3762384683' })
                        .reply(200);
                });

                it('returns 200 OK and notifies the game host that a user has buzzed in', async () => {
                    const response = await request(app).post('/action').send({
                        payload: JSON.stringify({
                            token: config.verificationToken,
                            response_url: responseUrl,
                            team: {
                                id: teamId
                            },
                            user: {
                                id: buzzedInUser
                            },
                            channel: {
                                id: buzzedInUserChannel
                            },
                            actions: [
                                {
                                    value: 'buzz'
                                }
                            ]
                        })
                    });

                    const documentRef = firestore.doc(`games/${teamId}`);

                    const doc = await documentRef.get();
                    const { buzzedUser } = doc.data();

                    sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postEphemeral`, { channel: channelId, user: createdUserId, ...buzzedNotification(buzzedInUser)});
                    sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.delete`, { channel: 'D2346XH78', ts: '2384342786.3468723423' });
                    sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.delete`, { channel: 'D23564GHG', ts: '5468973453.3762384683' });
                    expect(response.statusCode).to.equal(200);
                    expect(buzzedUser).to.equal(buzzedInUser);
                });
            });
        });

        describe('when actionValue is answerCorrect', () => {
            const updatedUserScores = {
                'UMYR57FST': 1,
                'USLY76FDY': 0
            };

            beforeEach(async () => {
                const documentRef = firestore.doc(`games/${teamId}`);

                await documentRef.set({
                    teamId,
                    channelId,
                    scores: userScores,
                    buzzedUser: 'UMYR57FST',
                    buzzerMessagesData: [
                        {
                            ts: '2384342786.3468723423',
                            channel: 'D2346XH78'
                        },
                        {
                            ts: '5468973453.3762384683',
                            channel: 'D23564GHG'
                        }
                    ]
                });

                nock(slackApiBasePath, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('/chat.postMessage', { channel: 'D2346XH78', ...buzzerMessage })
                    .reply(200, { ok: true, channel: 'D2346XH78', ts: '927387234.2346782348' });
                
                nock(slackApiBasePath, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('/chat.postMessage', { channel: 'D23564GHG', ...buzzerMessage })
                    .reply(200, { ok: true, channel: 'D23564GHG', ts: '3245762.237683475683' });
                
                nock(responseUrlBasePath)
                    .post('/response-url', scoreSheet({ scores: updatedUserScores }))
                    .reply(200);
            });

            it('returns 200 OK and increments the scores the for buzzed user', async () => {
                const response = await request(app).post('/action').send({
                    payload: JSON.stringify({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team: {
                            id: teamId
                        },
                        actions: [
                            {
                                value: 'answerCorrect'
                            }
                        ]
                    })
                });

                const documentRef = firestore.doc(`games/${teamId}`);
                const doc = await documentRef.get();

                const { scores, buzzerMessagesData } = doc.data();

                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D2346XH78', ...buzzerMessage });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D23564GHG', ...buzzerMessage });
                expect(response.statusCode).to.equal(200);
                expect(scores['UMYR57FST']).to.equal(1);
                expect(buzzerMessagesData).to.deep.eql(
                    [
                        {
                            ts: '927387234.2346782348',
                            channel: 'D2346XH78'
                        },
                        {
                            ts: '3245762.237683475683',
                            channel: 'D23564GHG'
                        }
                    ]
                )
            });
        });

        describe('when actionValue is answerWrong', () => {
            beforeEach(async () => {
                const documentRef = firestore.doc(`games/${teamId}`);

                await documentRef.set({
                    teamId,
                    channelId,
                    createdUserId,
                    scores: userScores,
                    buzzedUser: 'UMYR57FST',
                    buzzerMessagesData: [
                        {
                            ts: '2384342786.3468723423',
                            channel: 'D2346XH78'
                        },
                        {
                            ts: '5468973453.3762384683',
                            channel: 'D23564GHG'
                        }
                    ]
                });

                nock(responseUrlBasePath)
                    .post('/response-url', scoreSheet({ scores: userScores }))
                    .reply(200);

                nock(slackApiBasePath, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('/chat.postMessage', { channel: 'D2346XH78', ...buzzerMessage })
                    .reply(200, { ok: true, channel: 'D2346XH78', ts: '927387234.2346782348' });

                nock(slackApiBasePath, {
                    reqheaders: {
                        'Authorization': `Bearer ${config.botUserAccessToken}`
                    }
                })
                    .post('/chat.postMessage', { channel: 'D23564GHG', ...buzzerMessage })
                    .reply(200, { ok: true, channel: 'D23564GHG', ts: '3245762.237683475683' });
            });

            it('returns 200 OK, leaves the scores the same and resends buzzers to contestants', async () => {
                const response = await request(app).post('/action').send({
                    payload: JSON.stringify({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team: {
                            id: teamId
                        },
                        actions: [
                            {
                                value: 'answerWrong'
                            }
                        ]
                    })
                });

                const documentRef = firestore.doc(`games/${teamId}`);
                const doc = await documentRef.get();

                const { buzzedUser, buzzerMessagesData, scores } = doc.data();

                sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, scoreSheet({ scores }));
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D2346XH78', ...buzzerMessage });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D23564GHG', ...buzzerMessage });
                expect(response.statusCode).to.equal(200);
                expect(buzzerMessagesData).to.deep.eql([
                    {
                        ts: '927387234.2346782348',
                        channel: 'D2346XH78'
                    },
                    {
                        ts: '3245762.237683475683',
                        channel: 'D23564GHG'
                    }
                ]);
                expect(buzzedUser).to.equal(null);
            });
        });
    });
});
