'use strict';

var fs           = require('fs');
var https        = require('follow-redirects').https;
var url          = require('url');
var os           = require('os');
var childProcess = require('child_process');
var path         = require('path');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function downloadFileFromUrl(address, dest, cb) {
  var file = fs.createWriteStream(dest);
  var opt = url.parse(address);
  opt.headers = {
    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
  };
  https.get(opt, function handleResponse(response) {
    // console.log('STATUS:' + response.statusCode);
    // console.log('HEADERS:' + JSON.stringify(response.headers));

    response.pipe(file);
    file.on('finish', function closeFile() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function removeFile(err) { // Handle errors
    console.log(err.message);
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) { cb(err.message); return; }
  });
}
function unpackTarball(file, location, cb) {
  var absoluteFile = path.join(process.cwd(), file);
  if (file[0] === '/') {
    absoluteFile = file;
  }
  // Does not work on Windows

  childProcess.exec('tar -xzvf ' + absoluteFile, {
    cwd: location
  }, function done(err, stdout, stderr) {
    var subdir;
    if (err) { cb(err); return; }
    subdir = stdout.split(/\r?\n/)[0].replace('x ', ''); // linux
    subdir = subdir || stderr.split(/\r?\n/)[0].replace('x ', ''); // mac
    cb(err, path.join(location, subdir));
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
  var tmppath = os.tmpdir();
  var file = unpackDirectory(githubRepository, shortCommitId) + '.tgz';

  archiveUrl = archiveUrl.replace('{archive_format}', 'tarball');
  archiveUrl = archiveUrl.replace('{/ref}', '');
  return downloadFileFromUrl(archiveUrl, path.join(tmppath, file), function done(err) {
    if (err) { callback(err); return; }
    unpackTarball(path.join(tmppath, file), tmppath, callback);
  });
};
