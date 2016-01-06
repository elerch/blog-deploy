'use strict';

var fs           = require('fs');
var http         = require('http');
var os           = require('os');
var childProcess = require('child_process');
var path         = require('path');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function downloadFileFromUrl(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  http.get(url, function handleResponse(response) {
    response.pipe(file);
    file.on('finish', function closeFile() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function removeFile(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) { cb(err.message); return; }
  });
}
function unpackTarball(file, location, cb) {
  // BUG: will not work if file is absolute already
  var absoluteFile = path.join(process.cwd(), file);
  // Does not work on Windows

  childProcess.exec('tar -xzf ' + absoluteFile, {
    cwd: location
  }, function done(err) {
    if (err) { cb(err); return; }
    cb(err, location);
  });
}
function unpackDirectory(githubRepository, shortCommitId) {
  return githubRepository.owner.name + '-' +
         githubRepository.name + '-' +
         shortCommitId;
}
exports.shortCommitId = function shortCommitId(commitid) {
  return commitid.substr(0,7);
};

exports.unpackDirectory = unpackDirectory;
exports.unpackTarball = unpackTarball;
exports.downloadTarball = function downloadTarball(githubRepository, shortCommitId, callback) {
  var archiveUrl = githubRepository.archive_url;
  var path = os.tmpdir();
  var file = unpackDirectory(githubRepository, shortCommitId) + '.tgz';

  archiveUrl = archiveUrl.replace('{archive_format}', 'tarball');
  archiveUrl = archiveUrl.replace('{/ref}', '');
  return downloadFileFromUrl(archiveUrl, path + file, function done(err) {
    if (err) { callback(err); return; }
    unpackTarball(file, path, callback);
  });
};
