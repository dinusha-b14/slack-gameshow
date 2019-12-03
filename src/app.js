'use strict';

const express = require('express');
const StartHandler = require('./startHandler');
const ActionHandler = require('./actionHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to Gameshow!');
});

app.post('/start', StartHandler.post);

app.post('/action', ActionHandler.post);

module.exports = app;
