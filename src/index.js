'use strict';

var awsfilter       = require('./awsfilter');
var githubPull      = require('./github-pull');
var hugo            = require('./hugo.js'); // distinguish from the binary

var fs           = require('fs');
var path         = require('path');
var childProcess = require('child_process');

// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function setupThemeSymLink(src, dest, cb) {
  var themeSrc = path.join(src, 'themes');
  var themeDst = path.join(dest, 'themes');
  fs.link(themeSrc, themeDst, function linkCallback(err){
    if (!err || err.code === 'EEXIST') { cb(); return; }
    // it's really an error, it doesn't just exist
    cb(err);
  });
}

function copySite(src, dest, cb) {
  // to keep the package small for deployment to Lambda
  // we assume that the sdk is installed and so we can just execute
  // in a child process rather than using npm install aws-sdk
  // Lambda has the SDK installed and available
  var cmdLine = 'aws s3 cp ' + src + ' ' + dest + ' --recursive --acl public-read';
  console.log('copying files. Command line: ' + cmdLine);
  childProcess.exec(cmdLine, cb);
}

function generateAndCopySite(unpackedLocation, options, s3Destination, cb) {
  var siteVersion = options.buildDrafts ? 'development' : 'production';
  var bucketKeyPrefix = options.buildDrafts ? '/drafts' : '';
  console.log('generating site for ' + siteVersion);
  hugo.generateSite(
    unpackedLocation,
    options,
    function generated(err, location) {
      if (err) { cb(err); return; }
      copySite(location, 's3://' + s3Destination + bucketKeyPrefix, function copyComplete(copyErr) {
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
    var unpackedLocation;
    if (err) { console.log(err); context.fail(new Error('error downlading tarball')); return; }
    unpackedLocation = path.join(location, unpackDirectory);
    console.log('tarball received/unpacked to: ' + unpackedLocation);
    setupThemeSymLink(process.cwd(), unpackedLocation, function linked(symErr) {
      var options;
      if (symErr) { console.log(symErr); context.fail(new Error('error setting themes sym link', symErr)); return; }
      options = {
        theme: 'gindoro'
      };
      generateAndCopySite(unpackedLocation, options, 'emil.lerch.org', function copied(generationError) {
        if (generationError) {
          console.log(generationError);
          context.fail(new Error('failed to generate/copy'));
          return;
        }
        context.success('generated site successfully');
        return;
      });
    });
  });

};
