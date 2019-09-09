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
                    text: 'Scoresheet:',
                    emoji: true
                }
            },
            ...scoreSection,
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Finish Game"
                        },
                        value: "finishGame",
                        style: "primary"
                    }
                ]
            }
        ]
    };
};
