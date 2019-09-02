'use strict';

const express = require('express');
const axios = require('axios');
const { verificationToken } = require('../lib/config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to Gameshow!');
});

app.post('/start', async (req, res) => {
    const { token, response_url: responseUrl } = req.body;

    if (token !== verificationToken) {
        res.status(403).end('Forbidden');
    } else {
        res.status(200).end();
        const message = {
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

        try {
            await axios.post(responseUrl, message);
        } catch (err) {
            console.log(err);
        }
    }
});

app.post('/buzz', async (req, res) => {
    const { token, response_url: responseUrl, actions } = JSON.parse(req.body.payload);
    const [{ value: actionValue }] =  actions;

    let message = {};

    if (token !== verificationToken) {
        res.status(403).end('Forbidden');
        return;
    }

    res.status(200).end();

    if (actionValue === 'start_game') {
        message = {
            replace_original: true,
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "plain_text",
                        "text": "Game started!",
                        "emoji": true
                    }
                }
            ]
        }
    } else if (actionValue === 'cancel_game') {
        message = {
            replace_original: true,
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "plain_text",
                        "text": "Game cancelled!",
                        "emoji": true
                    }
                }
            ]
        }
    }

    try {
        await axios.post(responseUrl, message);
    } catch (err) {
        console.log(err);
    }
});

module.exports = app;
