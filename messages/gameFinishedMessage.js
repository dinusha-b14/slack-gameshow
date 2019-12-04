'use strict';

/**
 * @module gameFinishedMessage
 * @description Message displayed when a game is finished.
 */

module.exports = {
    replace_original: true,
    blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Game finished!"
            }
        }
    ]
};
