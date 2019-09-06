'use strict';

const request = require('supertest');
const { expect } = require('chai');
const nock = require('nock');
const axios = require('axios');
const sinon = require('sinon');
const { Firestore } = require('@google-cloud/firestore');
const app = require('../src/app');
const config = require('../lib/config');
const { welcomeMessage, gameAlreadyStartedMessage, startGameMessage } = require('../messages');

const responseUrlBasePath = 'https://response.url.com';
const sandbox = sinon.createSandbox();
// Create a new firestore client
const firestore = new Firestore();
const responseUrl = `${responseUrlBasePath}/response-url`;
const teamId = 'my-team-id';

let axiosSpy;

before(() => {
    axiosSpy = sandbox.spy(axios, 'post');
});

after(() => {
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

            try {
                await firestore.doc(`games/${teamId}`).delete();
            } catch (err) {
                //
            }
        });

        describe('when users are provided correctly', () => {
            describe('when game has not already started', () => {
                it('returns 200 OK and initializes a document with users scores and sends a welcome message to start the game', async () => {
                    const response = await request(app).post('/start').send({
                        token: config.verificationToken,
                        response_url: responseUrl,
                        team_id: teamId,
                        text: '<@U3287462873|user> <@U7457344589|user>'
                    });
    
                    const documentRef = firestore.doc(`games/${teamId}`);

                    const document = await documentRef.get();

                    const documentData = document.data();
                    
                    sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, welcomeMessage);

                    expect(response.statusCode).to.equal(200);
                    expect(documentData.teamId).to.equal(teamId);
                    expect(documentData.scores).to.eql({
                        'U3287462873': 0,
                        'U7457344589': 0
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
                        text: '<@U3287462873|user> <@U7457344589|user>'
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
        beforeEach(async () => {
            nock(responseUrlBasePath)
                .post('/response-url', startGameMessage)
                .reply(200);
        });

        describe('when actionValue is startGame', () => {
            it('returns 200 OK and sends a message stating that the game has started', async () => {
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
    
                sandbox.assert.calledWith(axiosSpy, `${responseUrlBasePath}/response-url`, startGameMessage);
                expect(response.statusCode).to.equal(200);
            });
        });
    });
});
