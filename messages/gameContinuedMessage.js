'use strict';

/**
 * @module gameContinuedMessage
 * @description Message displayed when a game is continued.
 */

module.exports = {
    replace_original: true,
    blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Game continued!"
            }
        }
    ]
};
