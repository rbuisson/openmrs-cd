"use strict";

const path = require("path");
const _ = require("lodash");
const uuid = require("uuid/v4");

const cst = require("../../const");
const heredoc = cst.HEREDOC;
const heredoc_2 = cst.HEREDOC_2;
const heredoc_3 = cst.HEREDOC_3;
const utils = require("../../utils/utils");
const model = require("../../utils/model");
const config = require("../../utils/config");

/*
 * Implementation of script utils to specifically manipulate Docker Compose containers.
 *
 */
module.exports = {
  prepareHost: {
    deployment: function(instanceDef) {
      return script;
    },
    data: function(instanceDef) {
      return script;
    },
    artifacts: function(instanceDef) {
      return script;
    }
  },
  startInstance: {
    deployment: function(instanceDef) {
      // Remove
      // setTLS
      // Run
      // Links
      // Timezone
      return script;
    },
    data: function(instanceDef) {
      // Load from existing instance
      return script;
    },
    artifacts: function(instanceDef) {
      return script;
    },
    properties: function(instanceDef) {
      return script;
    }
  },
  monitorStartup: {
    deployment: function(instanceDef) {
      return script;
    },
    data: function(instanceDef) {
      return script;
    },
    artifacts: function(instanceDef) {
      return script;
    }
  },
  /*
   * Util function that wraps the passed commands so each is applied either accordingly.
   *
   * @param {String} containerName - The name of the container.
   * @param {String} ifExistsCommand - The command that should run if the container exists.
   * @param {String} elseCommand - The command that will run if the container does *not* exist.
   *
   * @return {String} The script as a string.
   */
  ifExists: function(containerName, ifExistsCommand, elseCommand) {
    var script = "";
    script += "set -e\n";
    script +=
      "container=\\$(docker ps -a --filter name=" +
      containerName +
      " --format {{.Names}})\n";
    script += 'if [[ "\\$container" =~ "' + containerName + '" ]]\n';
    script += "then ";
    script += !_.isEmpty(ifExistsCommand) ? ifExistsCommand : "echo\n";
    script += "else ";
    script += !_.isEmpty(elseCommand) ? elseCommand : "echo\n";
    script += "fi\n";

    return script;
  },

  /*
   * Generates a script that prepare stack for Docker Compose
   *
   * @param {Object} deployment - .
   *
   * @return {String} The script as a string.
   */
  prepareDeployment: function(deployment, instanceName) {
    var destDir = deployment.hostDir + instanceName;
    var user = deployment.host.value.user;
    var deploymentValue = deployment.value;
    var script = "";

    script += module.exports.initFolder(destDir, user, null, true) + "\n";
    script += "git clone " + deploymentValue.gitUrl + " " + destDir + "\n";
    script += "cd " + destDir + "\n";
    script += "git checkout " + deploymentValue.gitCommit + "\n";
    script +=
      "echo -e 'OPENMRS_CONFIG_PATH=" +
      deploymentValue.openmrsConfigPath +
      "\nBAHMNI_CONFIG_PATH=" +
      deploymentValue.bahmniConfigPath +
      "\nOPENMRS_MODULES_PATH=" +
      deploymentValue.openmrsModulesPath +
      "\nBAHMNI_HOME=" +
      deploymentValue.bahmniHome +
      "\nTIMEZONE=" +
      deploymentValue.timezone +
      "\nBAHMNI_MART_CRON_TIME=" +
      deploymentValue.bahmniCron +
      "\n' > .env";
    return script;
  },

  /*
   * Generates a script that restarts the passed container.
   *
   * @param {String} containerName - The name of the container to restart.
   *
   * @return {String} The script as a string.
   */
  restart: function(instanceName, hostDir) {
    var script = "";
    script += "set -e\n";
    script += "cd " + hostDir + instanceName + "\n";
    script += "docker-compose restart\n";
    return module.exports.dockerCompose.ifExists(instanceName, script);
  },

  run: function(instanceName, hostDir) {
    var script = "";
    script += "set -e\n";
    script += "cd " + hostDir + instanceName + "\n";
    script += "docker-compose up\n";
    return script;
  },

  /*
   * Generates a script to down all containers started with Docker Compose.
   *
   * @param {String} instanceName - The name of the servers to remove.
   *
   * @return {String} The script as a string.
   */
  remove: function(instanceName, hostDir) {
    var script = "";
    script += "set -e\n";
    script += "cd " + hostDir + instanceName + "\n";
    script += "docker-compose down\n";
    return module.exports.dockerCompose.ifExists(instanceName, script);
  }
};
