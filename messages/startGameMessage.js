'use strict';

module.exports = scores => {
    const scoreSection = Object.entries(scores).map(([userId, score]) => {
        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*<@${userId}>*: ${score}`
            }
        }
    });

    return {
        replace_original: true,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'plain_text',
                    text: 'Game started for the following users:',
                    emoji: true
                }
            },
            ...scoreSection
        ]
    };
};
