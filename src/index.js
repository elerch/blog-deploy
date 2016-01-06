'use strict';

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    context.succeed('yo');  // Echo back the first key value
    // context.fail('Something went wrong');
}
