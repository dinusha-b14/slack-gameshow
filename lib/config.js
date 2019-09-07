'use strict';

const envVariables = process.env.NODE_ENV === 'production'
    ? process.env
    : require('config').envVariables;

/**
 * @module config
 * @description Handles loading of various configuration files depending on the execution environment.
 *
 * - Running server on local: `config/default.json`
 * - Running tests: `config/default.json` with overrides from `config/test.json`
 */
module.exports = {
    port: envVariables.PORT,
    clientId: envVariables.CLIENT_ID,
    clientSecret: envVariables.CLIENT_SECRET,
    verificationToken: envVariables.VERIFICATION_TOKEN,
    botUserAccessToken: envVariables.BOT_USER_ACCESS_TOKEN,
    imOpenUrl: 'https://slack.com/api/im.open',
    postMessageUrl: 'https://slack.com/api/chat.postMessage'
};
