"use strict";

/**
 * Main script of the 'host preparation' stage.
 *
 */

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const log = require("npmlog");

const utils = require("../utils/utils");
const model = require("../utils/model");
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);

const scripts = require("./scripts");

//
//  Fetching the instance definition based on the provided UUID
//
var instanceDef = db.getInstanceDefinition(
  process.env[config.varInstanceUuid()]
);
if (_.isEmpty(instanceDef)) {
  throw new Error("Illegal argument: empty or unexisting instance definition.");
}

//
//  Host metadata
//
var ssh = instanceDef.deployment.host.value; // TODO this should be extracted based on the host type
var hostDir = instanceDef.deployment.hostDir;

//
//  Building the script
//
var script = new model.Script();
script.type = "#!/bin/bash";
script.headComment = "# Autogenerated script for the CD host preparation...";
script.body = "set -xe\n";

script.body += scripts.remote(ssh, scripts.initFolder(hostDir, ssh.user));

// 'artifacts'

if (process.env[config.varArtifactsChanges()] === "true") {
  var hostArtifactsDir = hostDir + "/artifacts";
  script.body += scripts.remote(
    ssh,
    scripts.initFolder(hostArtifactsDir, ssh.user),
    true
  );
  Object.assign(ssh, { remoteDst: true });
  script.body += scripts.rsync(
    ssh,
    config.getCDArtifactsDirPath(instanceDef.uuid),
    hostArtifactsDir,
    true
  );
}

// 'deployment'

if (process.env[config.varDeploymentChanges()] === "true") {
  if (instanceDef.deployment.type === "docker") {
    var docker = instanceDef.deployment.value;
    // TODO: most likely a `docker login` here
    script.body += scripts.remote(
      ssh,
      "docker pull " + docker.image + ":" + docker.tag + "\n"
    );
  }
}

// 'data'

if (process.env[config.varDataChanges()] === "true") {
  instanceDef.data.forEach(function(data) {
    var instanceDataDir = hostDir + "/data";
    var sourceDataDir;
    if (data.type === "instance") {
      if (!_.isEmpty(data.value.uuid)) {
        // Retrieve the source instance
        var sourceInstance = db.getInstanceDefinition(data.value.uuid);
        if (_.isEmpty(sourceInstance)) {
          log.error(
            "",
            "Source instance definition could not be found. Instance can not use data of non-existing instance."
          );
          throw new Error(
            "Illegal argument: empty or unexisting instance definition."
          );
        }
        sourceDataDir = sourceInstance.deployment.hostDir + "/data/";
      }
      if (!_.isEmpty(data.value.dataDir)) {
        sourceDataDir = data.value.dataDir;
      }
      script.body += scripts.remote(
        ssh,
        scripts.rsync(
          "",
          sourceDataDir,
          instanceDataDir,
          null,
          null,
          null,
          true
        )
      );
    }
  });
}

//
//  Saving the script in the current build dir.
//
fs.writeFileSync(
  path.resolve(config.getBuildDirPath(), config.getHostPrepareScriptName()),
  utils.getScriptAsString(script)
);
fs.chmodSync(
  path.resolve(config.getBuildDirPath(), config.getHostPrepareScriptName()),
  "0755"
);
