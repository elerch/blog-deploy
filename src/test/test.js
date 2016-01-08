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
var hugo            = require('../hugo.js'); // distinguish from the binary

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
      expect(location).to.equal(path.join(tmpDir, 'elerch-blog-cb2ebf0/'));
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
describe('integration tests', function() {
  var repo = {
    name: 'blog',
    owner: { name: 'elerch' },
    archive_url: 'https://api.github.com/repos/elerch/blog/{archive_format}{/ref}' // eslint-disable-line camelcase
  }; // archive_url is the property name coming from github, so it's out of our control
  var shorthash = 'cb2ebf0';
  var tmpDir = os.tmpdir();
  describe('downloadTarball', function() {
    it('should download from Github', function(done) {
      githubPull.downloadTarball(repo, shorthash, function(err, location) {
        expect(err).not.to.exist;
        expect(location).to.equal(path.join(tmpDir, 'elerch-blog-cb2ebf0/'));
        done();
      });
    });
  });
  describe('generateSite', function() {
    it('should generate the site from the tarball', function(done) {
      githubPull.unpackTarball('test/elerch-blog-cb2ebf0.tar.gz', tmpDir, function(err, location) {
        var options = {
          theme: 'gindoro'
        };
        // testing only - don't do this!
        if (!fs.existsSync(path.join(location, 'themes'))) {
          fs.linkSync(path.join(process.cwd(), 'themes'), path.join(location, 'themes'));
        }
        expect(err).not.to.exist;
        hugo.generateSite(
          location,
          options,
          function(err2, generatedLocation) {
            if (err2) { console.log(err2.message); }
            expect(err2).not.to.exist;
            expect(generatedLocation).to.equal(path.join(location, 'public'));
            done();
          }
        );
      });
    });
  });
});
