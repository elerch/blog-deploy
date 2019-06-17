'use strict';

let os   = require('os');
let path = require('path');
let util = require('./util');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function unpackDirectory(message) {
  return message.ownerName + '-' +
         message.repoName + '-' +
         util.shortCommitId(message.commit);
}
let processMessage = message => {
  let rc = {};

  // This is a stupid, stupid auth mechanism, but we'll go with it until
  // https://github.com/go-gitea/go-sdk/pull/157 is accepted
  if (message.secret !== process.env.GITLAB_WEBHOOK_SECRET) { return; }
  if (!message.repository) { return; }
  rc.url = message.repository.html_url;
  if (!rc.url) { return; }

  // after is the commit that is head after the push has completed
  // The commits in a multi-commit push webhook also seem to be returned in
  // reverse chronological order, so commits[0].id should be equivalent
  rc.commit = message.after;
  if (!rc.commit) { return; }

  if (!message.repository || !message.repository.owner) { return; }
  rc.ownerName = message.repository.owner.username;
  rc.repoName = message.repository.name;
  if (!rc.ownerName || !rc.repoName) { console.log('username/reponame'); console.log(message); return; }//{ return; }


  // https://git.lerch.org/lobo/Testrepo
  // message.repository.full_name="lobo/Testrepo"
  // https://git.lerch.org/api/v1/repos/lobo/Testrepo
  rc.apiRepoUrl = rc.url.substr(0, rc.url.length - message.repository.full_name.length) +
                  'api/v1/repos/' +
                  message.repository.full_name;
  return rc;
};

exports.name = 'gitlab';
exports.isSource = message => Boolean(processMessage(message));
exports.downloadTarball = (message, callback) => {
  let processedMessage = processMessage(message);
  let archiveUrl = processedMessage.apiRepoUrl + '/archive/' + processedMessage.commit + '.tar.gz?token=' + process.env.GITLAB_API_TOKEN;
  let tmppath = os.tmpdir();
  let file = unpackDirectory(processedMessage) + '.tgz';

  // Two formats for archives. We'll be more specific
  // https://git.lerch.org/lobo/Testrepo/archive/b3c8bac88aeceb5e54c1063f4fc2172ed6ee478f.tar.gz
  // https://git.lerch.org/lobo/Testrepo/archive/master.tar.gz
  archiveUrl = archiveUrl.replace('{archive_format}', 'tarball');
  archiveUrl = archiveUrl.replace('{/ref}', '');
  return util.downloadFileFromUrl(archiveUrl, path.join(tmppath, file), (err) => {
    if (err) { callback(err); return; }
    util.unpackTarball(path.join(tmppath, file), tmppath, callback);
  });
};
