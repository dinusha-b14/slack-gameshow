'use strict';

module.exports = {
    blocks: [
        {
            type: "section",
            text: {
                type: "plain_text",
                text: "Welcome to Gameshow!",
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
