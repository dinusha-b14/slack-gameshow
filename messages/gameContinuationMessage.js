'use strict';

/**
 * @module gameContinuationMessage
 * @description Message displayed after points allocation.
 */

module.exports = {
    replace_original: true,
    blocks: [
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
};
