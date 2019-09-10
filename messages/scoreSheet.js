'use strict';

const headerMessage = gameStatus => {
    switch (gameStatus) {
        case 'start':
            return 'A new Gameshow has been started for the following contestants:';
        case 'finish':
            return 'You have ended the Gameshow. Here are the final scores:';
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
    } else if (gameStatus === 'start') {
        return [
                {
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
        ]
    } else if (gameStatus === 'waiting') {
        return [
            {
                type: "section",
                text: {
                    type: "plain_text",
                    text: "Waiting for contestants to buzz in...",
                    emoji: true
                }
            },
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
                        style: "danger"
                    }
                ]
            }
        ]
    } else {
        return [
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Next Question'
                        },
                        value: 'nextQuestion',
                        style: 'primary'
                    },
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
        ]
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
            ...footerMessage(gameStatus)
        ]
    };
};
