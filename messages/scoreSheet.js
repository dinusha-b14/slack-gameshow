'use strict';

const headerMessage = gameStatus => {
    switch (gameStatus) {
        case 'finish':
            return 'The Gameshow has finished. Here are the final scores:';
        default:
            return 'The scores so far are:';
    }
};

const footerMessage = gameStatus => {
    if (gameStatus === 'finish') {
        return [
            {
                type: 'section',
                text: {
                    type: 'plain_text',
                    text: 'Congratulations to the winner!'
                }
            }
        ]
    } else {
        return []
    }
};

module.exports = ({ scores, gameStatus = 'continue' }) => {
    const scoreSection = Object.entries(scores).sort((a, b) => (
        a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0
    )).map(([userId, score]) => {
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
                    text: `${headerMessage(gameStatus)}`,
                    emoji: true
                }
            },
            ...scoreSection,
            ...footerMessage(gameStatus)
        ]
    };
};
