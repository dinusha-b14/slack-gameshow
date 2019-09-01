'use strict';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');

const app = express();
const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send('Welcome to Gameshow!');
});

app.listen(PORT, () => console.log(`Gameshow app listening on port ${PORT}`));
