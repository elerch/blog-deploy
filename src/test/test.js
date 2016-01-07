/*eslint-env node, mocha */
/*eslint no-unused-expressions: 0, func-names: 0, no-invalid-this: 0 */
'use strict';

// Node built-ins
var fs   = require('fs');
var os   = require('os');
var path = require('path');

// NPM Modules
var expect          = require('chai').expect;

// Our stuff
var awsfilter       = require('../awsfilter');
var githubPull      = require('../github-pull');

describe('extractSnsMessage', function() {
  var sampleSNSMessage;
  before(function readSample(done) {
    fs.readFile('test/sample-event.json', 'utf8', function (err, data) {
      if (err) { done(err); return; }
      sampleSNSMessage = JSON.parse(data);
      done();
    });
  });
  it('should extract and parse the Github message from Sns', function() {
    var githubMessage = awsfilter.extractSnsMessage(sampleSNSMessage);
    expect(githubMessage).to.exist;
    expect(githubMessage.ref).to.exist;
    expect(githubMessage.ref).to.equal('refs/heads/deploy-test');
    expect(githubMessage.repository).to.exist;
    expect(githubMessage.repository.archive_url).to.equal('https://api.github.com/repos/elerch/blog/{archive_format}{/ref}');
    expect(githubMessage.head_commit).to.exist;
    expect(githubMessage.head_commit.id).equal('cb2ebf086da8c8f16a22f8a7b8656019ba3dfbaa');
    // github shorthash: cb2ebf0
    // archive_format: tarball
  });
});

describe('unpackTarball', function() {
  it('should extract the tarball', function(done) {
    var tmpDir = os.tmpdir();
    githubPull.unpackTarball('test/elerch-blog-cb2ebf0.tar.gz', tmpDir, function(err, location) {
      expect(err).not.to.exist;
      expect(location).to.equal(tmpDir); // Note: *not* the subdir inside the github tarball
      fs.stat(path.join(tmpDir, 'elerch-blog-cb2ebf0'), function(err2, stats) {
        expect(err2).not.to.exist;
        expect(stats).to.exist;
        expect(stats.isDirectory()).to.be.true;
        done();
      });
    });
  });
});

// Integration
describe('downloadTarball', function() {
  it('should download from Github', function(done) {
    var repo = {
      name: 'blog',
      owner: { name: 'elerch' },
      archive_url: 'https://api.github.com/repos/elerch/blog/{archive_format}{/ref}' // eslint-disable-line camelcase
    }; // archive_url is the property name coming from github, so it's out of our control
    var tmpDir = os.tmpdir();
    githubPull.downloadTarball(repo, 'cb2ebf0', function(err, location) {
      expect(err).not.to.exist;
      expect(location).to.equal(tmpDir);
      done();
    });
  });
});
