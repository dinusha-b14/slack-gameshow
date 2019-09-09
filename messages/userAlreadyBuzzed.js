'use strict';

module.exports = {
    replace_original: true,
    blocks: [
        {
            type: "mrkdwn",
            text: {
                type: 'plain_text',
                text: 'Someone else has already buzzed in'
            }
        }
    ]
};
