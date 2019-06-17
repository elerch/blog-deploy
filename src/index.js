'use strict';

let awsfilter       = require('./awsfilter');
let githubPull      = require('./github-pull');
let gitlabPull      = require('./gitlab-pull');
let hugo            = require('./hugo.js'); // distinguish from the binary
let s3ext           = require('./s3-ext');

var fs           = require('fs');
var path         = require('path');
var childProcess = require('child_process');

process.env.PATH = process.env.PATH + ':' + process.cwd();

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function setupThemeSymLink(src, dest, cb) {
  let themeSrc = path.join(src, 'themes');
  let themeDst = path.join(dest, 'themes');
  fs.symlink(themeSrc, themeDst, function linkCallback(err){
    if (!err || err.code === 'EEXIST') { cb(); return; }
    // it's really an error, it doesn't just exist
    childProcess.exec('ls /tmp', function lsDone(lserr, stdout){
      console.log('dest path: ' + themeDst);
      console.log('error linking. ls of /tmp directory: ');
      console.log(stdout);
      console.log(fs.existsSync(themeSrc));
      cb(err);
    });
  });
}

function copySite(src, bucket, destPrefix, siteVersion, cb) {
  let copyOptions = {Bucket: bucket, ACL: 'public-read'};
  console.log('copying from ' + src + ' to ' + bucket + ':' + (destPrefix || '(root)'));
  if (siteVersion === 'development') {
    copyOptions.CacheControl = 'max-age=0';
  }
  s3ext.copyAllRecursive(
    src, destPrefix, 'us-west-2',
    copyOptions,
    function complete(err) {
      if (err) {console.log('error during copy'); console.log(err); cb(err); return; }
      console.log('file copy complete');
      cb();
    });
}

function generateAndCopySite(unpackedLocation, options, s3Destination, cb) {
  let siteVersion = options.buildDrafts ? 'development' : 'production';
  let bucketKeyPrefix = options.buildDrafts ? '/drafts' : '';
  console.log('generating site for ' + siteVersion);
  hugo.generateSite(
    unpackedLocation,
    options,
    function generated(err, location) {
      if (err) { cb(err); return; }
      console.log('generated ' + siteVersion);
      copySite(location, s3Destination, bucketKeyPrefix, siteVersion, function copyComplete(copyErr) {
        if (copyErr) { cb(err); return; }
        if (siteVersion === 'development') { cb(); return; }
        options.buildDrafts = true;
        generateAndCopySite(unpackedLocation, options, s3Destination, cb);
      });
    }
  );

}
exports.handler = function updateSite(event, context) {
  var snsMessage, repo, commitHash, shorthash, unpackDirectory;
  console.log('Received event:', JSON.stringify(event, null, 2));
  snsMessage = awsfilter.extractSnsMessage(event);
  repo = snsMessage.repository;
  commitHash = snsMessage.head_commit.id;
  shorthash = githubPull.shortCommitId(commitHash);
  unpackDirectory = githubPull.unpackDirectory(repo, shorthash);

  console.log('downloading repository tarball: ' + unpackDirectory);
  githubPull.downloadTarball(repo, shorthash, function downloaded(err, location) {
    if (err) { console.log(err); context.fail(new Error('error downlading tarball')); return; }
    console.log('tarball received/unpacked to: ' + location);
    setupThemeSymLink(process.cwd(), location, function linked(symErr) {
      var options;
      if (symErr) { console.log(symErr); context.fail(new Error('error setting themes sym link')); return; }
      options = {
        theme: 'gindoro'
      };
      generateAndCopySite(location, options, 'emil.lerch.org', function copied(generationError) {
        if (generationError) {
          console.log(generationError);
          context.fail(new Error('failed to generate/copy'));
          return;
        }
        console.log('generated site successfully');
        context.succeed('generated site successfully');
        return;
      });
    });
  });

};
