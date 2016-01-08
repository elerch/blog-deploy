'use strict';

var childProcess = require('child_process');
var path         = require('path');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function generateSite(location, options, cb) {
  var hugoopts = '';
  if (options.theme) { hugoopts += ' --theme=' + options.theme; }
  if (options.buildDrafts) { hugoopts += ' --buildDrafts'; }

  childProcess.exec(path.join(process.cwd(), 'hugo') + hugoopts, {
    cwd: location
  }, function done(err, stdout, stderr) {
    if (err) {
      console.log('error calling hugo. stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      cb(err);
      return;
    }
    cb(err, path.join(location, 'public'));
  });
}
exports.generateSite = generateSite;
