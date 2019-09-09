'use strict';

module.exports = scores => {
    const scoreSection = Object.keys(scores).sort().map(userId => {
        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*<@${userId}>*: ${scores[userId]}`
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
