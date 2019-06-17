'use strict';

let os   = require('os');
let path = require('path');
let util = require('./util');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function unpackDirectory(githubRepository, shortCommitId) {
  return githubRepository.owner.name + '-' +
         githubRepository.name + '-' +
         shortCommitId;
}
let processMessage = message => {
  let rc = {};

  rc.repo = message.repository;
  if (!rc.repo) { return; }
  if (!message.head_commit) { return; }
  rc.commitHash = message.head_commit.id;
  if (!rc.commitHash) { return; }
  rc.shorthash = util.shortCommitId(rc.commitHash);
  if (!rc.shorthash) { return; }
  rc.unpackDirectory = unpackDirectory(rc.repo, rc.shorthash);
  if (!rc.unpackDirectory) { return; }
  return rc;
};

exports.name = 'github';
exports.isSource = message => Boolean(processMessage(message));
exports.downloadTarball = (message, callback) => {
  let processedMessage = processMessage(message);
  let archiveUrl = message.repo.archive_url;
  let tmppath = os.tmpdir();
  let file = unpackDirectory(processedMessage.repo, processedMessage.shortHash) + '.tgz';

  archiveUrl = archiveUrl.replace('{archive_format}', 'tarball');
  archiveUrl = archiveUrl.replace('{/ref}', '');
  return util.downloadFileFromUrl(archiveUrl, path.join(tmppath, file), (err) => {
    if (err) { callback(err); return; }
    util.unpackTarball(path.join(tmppath, file), tmppath, callback);
  });
};
