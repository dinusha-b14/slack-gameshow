'use strict';

module.exports = {
    blocks: [
        {
            "type": "section",
            "text": {
                "type": "plain_text",
                "text": "A game has already been started for this workspace. Would you like to keep playing or cancel the game?",
                "emoji": true
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Continue playing"
                    },
                    "value": "continueGame",
                    "style": "primary"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Cancel"
                    },
                    "value": "cancelGame",
                    "style": "danger"
                }
            ]
        }
    ]
};
