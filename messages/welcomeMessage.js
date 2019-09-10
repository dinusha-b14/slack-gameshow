'use strict';

module.exports = {
    blocks: [
        {
            type: "section",
            text: {
                type: "plain_text",
                text: "Welcome to Gameshow! The app that allows you to host your very own quiz show!",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "plain_text",
                text: "Click the Start Game button below to start the game with everyone in this channel!",
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
                        text: "Start Game"
                    },
                    value: "startGame",
                    style: "primary"
                },
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Cancel"
                    },
                    value: "cancelGame",
                    style: "danger"
                }
            ]
        }
    ]
};
