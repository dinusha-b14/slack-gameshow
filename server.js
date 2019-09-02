'use strict';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = require('./src/app');

const PORT = process.env.PORT;

app.listen(PORT, () => console.log(`Gameshow app listening on port ${PORT}`));
