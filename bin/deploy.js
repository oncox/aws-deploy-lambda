#! /usr/bin/env node

const {exec} = require('child_process');
const tmp = require('tmp')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const AWS = require('aws-sdk')

process.env.AWS_SDK_LOAD_CONFIG=1

// State to maintain any global variables we need throughout the promise chain

class State {
  constructor() {
    this.config;
    this.zipFile = tmp.tmpNameSync({prefix:'aws_lambda_upload_', postfix:'.zip'});
    this.packageDir;
    this.lambda;
  }

  get methods() {
    return (this.config.main)? Object.keys(require(path.join(this.packageDir, this.config.main))) : []
  }

  get handler() {
    let method = this.methods.filter((method) => {
      return method == 'handler'
    })

    return (method.length)? [method]:this.methods[0]
  }
}

let state = new State()

// Get the package information

var pkgInfo = function() {
  return new Promise((resolve, reject) => {

    state.packageDir = path.dirname(path.dirname(path.dirname(__filename)))

    fs.readFile(path.join(state.packageDir, 'package.json'), 'utf8', (err, data) => {
      if (err) {
        reject(err.toString())
        return
      }

      try {
        state.config = JSON.parse(data)
        resolve()
      } catch(err) {
        reject(err)
      }

      resolve()
    })
  })
}

// Create the lambda if it doesn't exist

var hasFunction = function() {
  return new Promise((resolve, reject) => {

    new AWS.Lambda().getFunction({FunctionName:state.config.name}, (err, func) => {
      if (err) {
        if (err.code == 'ResourceNotFoundException') {
          resolve(true)
        } else {
          reject(err.toString())
        }
        return
      }

      state.lambda = func.Configuration
      resolve(false)
    })
  })
}



// Zip up the directory

var zipDirectory = function() {
  return new Promise((resolve, reject) => {
    var zStream = fs.createWriteStream(state.zipFile);
    var archive = archiver('zip');

    zStream.on('close', function() {
        console.log("Created file "+state.zipFile+" of "+(archive.pointer()*1e-6).toFixed(2) + ' Mb');
        resolve()
    });

    archive.on('error', function(err) {
        reject(err);
    });

    archive.pipe(zStream);
    archive.directory(state.packageDir, false);
    archive.finalize();
  })
}

// Update function

var updateFunction = function(createFlag) {
  return new Promise((resolve, reject) => {

    let params = {
      Bucket: 'big-ol-bucket',
      Key: path.basename(state.zipFile),
      Body: fs.createReadStream(state.zipFile)
    }

    new AWS.S3().putObject(params, (err, data) => {

      if (err) {
        reject(err.toString())
        return
      }

      let params = {
        FunctionName: state.config.name,
        Publish: true
      }

      if (createFlag) {
        params.Handler = `${path.basename(state.config.main, '.js')}.${state.handler}`
        params.Description = ''
        params.Runtime = 'nodejs6.10'
        params.Role = process.env.AWS_LAMBDA_ARN
        params.Code = {
          S3Bucket: 'big-ol-bucket',
          S3Key: path.basename(state.zipFile),
          S3ObjectVersion: data.VersionId
        }
      } else {
        params.S3Bucket = 'big-ol-bucket',
        params.S3Key = path.basename(state.zipFile),
        params.S3ObjectVersion = data.VersionId
      }

      new AWS.Lambda()[createFlag?  'createFunction' : 'updateFunctionCode'](params, (err, data) => {
        if (err) {
          reject(err.toString())
          return
        }

        resolve()
      })
    })
  })
}

// Promise chain to execute

pkgInfo()
.then(zipDirectory)
.then(hasFunction)
.then(updateFunction)
.catch((err) => {
  console.error(err)
})
.then(() => {

  return new Promise((resolve, reject) => {
    fs.unlink(state.zipFile, (err) => {
      if (err) {
        reject(err.toString())
      }

      resolve()
    });
  })
})
.catch((err) => {
  console.error(err)
})
