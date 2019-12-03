'use strict';

module.exports = userId => {
    return {
        blocks: [
            {
                type: "section",
                text: {
                    type: 'mrkdwn',
                    text: `<@${userId}> buzzed first! Did they get it right?`
                }
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Yes"
                        },
                        value: "answerCorrect",
                        style: "primary"
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "No"
                        },
                        value: "answerWrong",
                        style: "danger"
                    }
                ]
            }
        ]
    }
};
