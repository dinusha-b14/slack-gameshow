'use strict';

module.exports = userId => (
    {
        replace_original: true,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `<@${userId}> buzzed first!`
                }
            }
        ]
    }
);
