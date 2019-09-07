'use strict';

const request = require('supertest');
const { expect } = require('chai');
const nock = require('nock');
const axios = require('axios');
const sinon = require('sinon');
const { Firestore } = require('@google-cloud/firestore');
const app = require('../src/app');
const config = require('../lib/config');
const { welcomeMessage, gameAlreadyStartedMessage, startGameMessage, buzzerMessage } = require('../messages');

const responseUrlBasePath = 'https://response.url.com';
const slackApiBasePath = 'https://slack.com/api';

const sandbox = sinon.createSandbox();

const firestore = new Firestore();
const responseUrl = `${responseUrlBasePath}/response-url`;
const teamId = 'my-team-id';

let axiosSpy;

beforeEach(() => {
    axiosSpy = sandbox.spy(axios, 'post');
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
                text: '<@U3287462873|user> <@U7457344589|user>'
            });

            expect(response.statusCode).to.equal(403);
            expect(response.text).to.equal('Forbidden');
        });
    });

    describe('when verification token is valid', () => {
        beforeEach(async () => {
            nock(responseUrlBasePath)
                .post('/response-url', welcomeMessage)
                .reply(200);
            
            nock(responseUrlBasePath)
                .post('/response-url', gameAlreadyStartedMessage)
                .reply(200);

            // Clean up any existing docs with the testing team ID
            try {
                await firestore.doc(`games/${teamId}`).delete();
            } catch (err) {
                // We can ignore any errors during this deletion.
            }
        });

        describe('when users are provided correctly', () => {
            describe('when game has not already started', () => {
                it('returns 200 OK and initializes a document with users scores and sends a welcome message to start the game', async () => {
                    const response = await request(app).post('/start').send({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team_id: teamId,
                        text: '<@UMYR57FST|user> <@USLY76FDY|user>'
                    });
    
                    const documentRef = firestore.doc(`games/${teamId}`);

                    const document = await documentRef.get();

                    const documentData = document.data();
                    
                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, welcomeMessage);

                    expect(response.statusCode).to.equal(200);
                    expect(documentData.teamId).to.equal(teamId);
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
            'USLY76FDY': 0,
            'UMYR57FST': 0
        };

        beforeEach(async () => {
            nock(responseUrlBasePath)
                .post('/response-url', startGameMessage(userScores))
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

            const documentRef = firestore.doc(`games/${teamId}`);

            await documentRef.set({
                teamId,
                scores: userScores
            });
        });

        describe('when actionValue is startGame', () => {
            it('returns 200 OK and sends a message stating that the game has started for the requested users and individually messages each user with a buzz button', async () => {
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

                sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, startGameMessage(userScores));
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/im.open`, { user: 'UMYR57FST' });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/im.open`, { user: 'USLY76FDY' });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D2346XH78', ...buzzerMessage });
                sandbox.assert.calledWith(axiosSpy, `${slackApiBasePath}/chat.postMessage`, { channel: 'D23564GHG', ...buzzerMessage });

                expect(response.statusCode).to.equal(200);
            });
        });
    });
});
