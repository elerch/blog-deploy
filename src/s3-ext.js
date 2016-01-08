'use strict';

var async   = require('async');
var recurse = require('recursive-readdir');
var aws     = require('aws-sdk');

var path    = require('path');
var fs      = require('fs');
// exports and module exports are not the same in node, and this is confusing
exports = module.exports;

function clone (o) {
  var ret = {};
  Object.keys(o).forEach(function cp(val) {
    ret[val] = o[val];
  });
  return ret;
}

function copyAllRecursive(src, destKeyPrefix, region, params, cb) {
  var absoluteSrc = path.resolve(src);
  var len = absoluteSrc.length;
  var s3 = new aws.S3({s3ForcePathStyle : true, region: region});

  recurse(absoluteSrc, function filesEnumerated(err, files){
    if (err) { cb(err); return; }
    async.each(
      files.map(function strip(item){return item.substr(len);}),
      function copyObject(item, asyncCb) {
        var itemParams = clone(params || {});
        fs.readFile(path.join(absoluteSrc, item), function hazTheFile(fileErr, fileBuffer) {
          if (fileErr) { asyncCb(fileErr); return; }
          itemParams.Key = (destKeyPrefix + item).replace('//', '/');
          if (itemParams.Key[0] === '/') {
            itemParams.Key = itemParams.Key.substr(1);
          }
          itemParams.Body = fileBuffer;
          // copy item (put, since we're adding from local)
          s3.putObject(itemParams, asyncCb);
        });
      },
      function done(s3Err) {
        if (s3Err) { cb(s3Err); return; }
        cb();
      });
  });
}
exports.copyAllRecursive = copyAllRecursive;
