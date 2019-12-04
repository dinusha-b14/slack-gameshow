'use strict';

module.exports = {
    replace_original: true,
    blocks: [
        {
            type: 'section',
            text: {
                type: 'plain_text',
                text: 'How many points would you like to award them?'
            },
            accessory: {
                action_id: 'allocatePoints',
                type: 'static_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select a score'
                },
                options: [
                    {
                        text: {
                            type: 'plain_text',
                            text: '1'
                        },
                        value: '1'
                    },
                    {
                        text: {
                            type: 'plain_text',
                            text: '2'
                        },
                        value: '2'
                    },
                    {
                        text: {
                            type: 'plain_text',
                            text: '3'
                        },
                        value: '3'
                    },
                    {
                        text: {
                            type: 'plain_text',
                            text: '4'
                        },
                        value: '4'
                    },
                    {
                        text: {
                            type: 'plain_text',
                            text: '5'
                        },
                        value: '5'
                    }
                ]
            }
        }
    ]
};
