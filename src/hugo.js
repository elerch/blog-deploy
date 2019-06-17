'use strict';

let childProcess = require('child_process');
let path         = require('path');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function generateSite(location, options, cb) {
  let hugoopts = '';
  let hugo = 'hugo';
  if (options.theme) { hugoopts += ' --theme=' + options.theme; }
  if (options.buildDrafts) { hugoopts += ' --buildDrafts'; }
  // If this option is set we'll use hugo on the path
  // otherwise we'll call our local hugo, which is only valid for
  // amd64 linux
  if (!options.useGlobalHugo) { hugo = path.join(process.cwd(), 'hugo'); }
  childProcess.exec(hugo + hugoopts, {
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
