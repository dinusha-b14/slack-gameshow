'use strict';

const headerMessage = gameStatus => {
    switch (gameStatus) {
        case 'continue':
            return 'Current scores:';
        case 'start':
            return 'A new GameShow has been started for the following users:';
        case 'finish':
            return 'GameShow ended. Here are the final scores:';
    }
};

const footerMessage = gameStatus => {
    if (gameStatus === 'finish') {
        return {
            type: 'section',
            text: {
                type: 'plain_text',
                text: 'Congratulations to the winner!'
            }
        }
    } else {
        return {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Finish Game'
                    },
                    value: 'finishGame',
                    style: 'danger'
                }
            ]
        }
    }
};

module.exports = ({ scores, gameStatus = 'continue' }) => {
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
                    text: `${headerMessage(gameStatus)}`,
                    emoji: true
                }
            },
            ...scoreSection,
            footerMessage(gameStatus)
        ]
    };
};
