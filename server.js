'use strict';

const { port } = require('./lib/config');

const app = require('./src/app');

app.listen(port, () => console.log(`Gameshow app listening on port ${port}`));

module.exports = app;
