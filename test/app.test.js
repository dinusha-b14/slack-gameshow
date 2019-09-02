'use strict';

const request = require('supertest');
const { expect } = require('chai');
const nock = require('nock');
const app = require('../src/app');
const config = require('../lib/config');

const responseUrlBasePath = 'https://response.url.com';

describe('GET /', () => {
    it('returns 200 OK', async () => {
        const response = await request(app).get('/')
        expect(response.statusCode).to.equal(200);
        expect(response.header['content-type']).to.equal('text/html; charset=utf-8');
        expect(response.text).to.equal('Welcome to Gameshow!');
    });
});

describe('POST /start', () => {
    const responseUrl = `${responseUrlBasePath}/response-url`;

    describe('when verification token is invalid', () => {
        it('returns 403 Forbidden', async () => {
            const response = await request(app).post('/start').send({
                token: 'some-other-token', response_url: responseUrl
            });

            expect(response.statusCode).to.equal(403);
            expect(response.text).to.equal('Forbidden');
        });
    });

    describe('when verification token is valid', () => {
        const responseMessage = {
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "plain_text",
                        "text": "Welcome to Gameshow!",
                        "emoji": true
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Start Game"
                            },
                            "value": "start_game",
                            "style": "primary"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Cancel"
                            },
                            "value": "cancel_game",
                            "style": "danger"
                        }
                    ]
                }
            ]
        };

        describe('when response_url request does not throw an error', () => {
            beforeEach(() => {
                nock(responseUrlBasePath)
                    .post('/response-url', responseMessage)
                    .reply(200);
            });

            it('returns 200 OK', async () => {
                const response = await request(app).post('/start').send({
                    token: config.verificationToken, response_url: responseUrl
                });
    
                expect(response.statusCode).to.equal(200);
            });
        });
    });
});
