'use strict';

let fs           = require('fs');
let https        = require('follow-redirects').https;
let path         = require('path');
let url          = require('url');
let childProcess = require('child_process');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

exports.shortCommitId = commitid => commitid.substr(0,7);
exports.downloadFileFromUrl = (address, dest, cb) => {
  let file = fs.createWriteStream(dest);
  let opt = url.parse(address);
  opt.headers = {
    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
  };
  https.get(opt, function handleResponse(response) {
    // console.log('STATUS:' + response.statusCode);
    // console.log('HEADERS:' + JSON.stringify(response.headers));

    response.pipe(file);
    file.on('finish', function closeFile() {
      file.close(cb); // close() is async, call cb after close completes.
    });
  }).on('error', function removeFile(err) { // Handle errors
    console.log(err.message);
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) { cb(err.message); return; }
  });
};

exports.unpackTarball = (file, location, cb) => {
  let absoluteFile = path.join(process.cwd(), file);
  if (file[0] === '/') {
    absoluteFile = file;
  }
  // Does not work on Windows
  // We use tar from the current directory since in node10.x environment,
  // tar is not available system wide, so we package it.
  childProcess.exec('/var/task/tar -xzvf ' + absoluteFile, {
    cwd: location
  }, function done(err, stdout, stderr) {
    let subdir;
    if (err) { cb(err); return; }
    subdir = stdout.split(/\r?\n/)[0].replace('x ', ''); // linux
    subdir = subdir || stderr.split(/\r?\n/)[0].replace('x ', ''); // mac
    cb(err, path.join(location, subdir));
  });
};
