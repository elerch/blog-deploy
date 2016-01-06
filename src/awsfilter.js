'use strict';

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

exports.extractSnsMessage = function extractSnsMessage(event) {
  return JSON.parse(event.Records[0].Sns.Message);
};
