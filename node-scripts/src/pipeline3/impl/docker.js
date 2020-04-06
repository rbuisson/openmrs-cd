"use strict";

const _ = require("lodash");

const cst = require("../../const");
const heredoc_2 = cst.HEREDOC_2;

/*
 * Implementation of script utils to specifically manipulate Docker containers.
 *
 */
module.exports = {
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
    script += 'if [ "\\$container" == "' + containerName + '" ]\n';
    script += "then ";
    script += !_.isEmpty(ifExistsCommand) ? ifExistsCommand : "echo\n";
    script += "else ";
    script += !_.isEmpty(elseCommand) ? elseCommand : "echo\n";
    script += "fi\n";

    return script;
  },
  /*
     * Generates a script that pulls a Docker image
     *
     * @param {String} image - The name of the image to pull
     * @param {String} tag - The tag of the image to pull
     *
     * @return {String} The script as a string.
     */
  pull: function(image, tag) {
    var script = "";
    script = "docker pull " + image + ":" + tag + "\n";
    return script;
  },

  /*
     * Generates a script that restarts the passed container.
     *
     * @param {String} containerName - The name of the container to restart.
     *
     * @return {String} The script as a string.
     */
  restart: function(containerName) {
    var script = "";
    script += "set -e\n";
    script += "docker restart " + containerName + "\n";
    return module.exports.ifExists(containerName, script);
  },

  /*
     * Generates a script to remove the passed container.
     *
     * @param {String} containerName - The name of the container to remove.
     *
     * @return {String} The script as a string.
     */
  remove: function(containerName) {
    var script = "";
    script += "set -e\n";
    script += "docker stop " + containerName + "\n";
    script += "docker rm -v " + containerName + "\n";
    return module.exports.ifExists(containerName, script);
  },

  /*
     * Run a new container with the appropriate options.
     *
     * @param {String} containerName - The name of the container to run.
     * @param {Object} instanceDef - The instance definition of the instance to start.
     *
     * @return {String} The script as a string.
     */
  run: function(containerName, instanceDef, mounts) {
    const docker = instanceDef.deployment.value;

    var script = "";
    script += "set -e\n";

    var scriptArgs = [];
    scriptArgs.push("docker run -dit");

    if (docker.privileged == "true") {
      scriptArgs.push("--privileged");
      scriptArgs.push("-v /sys/fs/cgroup:/sys/fs/cgroup:ro");
    }

    scriptArgs.push("--restart unless-stopped");

    Object.keys(docker.ports).forEach(function(key) {
      scriptArgs.push("--publish " + docker.ports[key] + ":" + key);
    });

    var labels = {
      type: instanceDef.type,
      group: instanceDef.group
    };
    Object.keys(labels).forEach(function(key) {
      scriptArgs.push("--label " + key + "=" + labels[key]);
    });

    scriptArgs.push("--name " + containerName);
    scriptArgs.push("--hostname bahmni");

    docker.networks.forEach(function(network) {
      scriptArgs.push("--network " + network);
    });

    Object.keys(mounts).forEach(function(key) {
      scriptArgs.push(
        "--mount type=bind,source=" + mounts[key] + ",target=" + key
      );
    });

    scriptArgs.push(docker.image + ":" + docker.tag);

    scriptArgs.forEach(function(arg, index) {
      script += arg;
      script += !scriptArgs[index + 1] ? "" : " ";
    });

    return script + "\n";
  },

  /*
     * Executes the passed shell command into the container.
     *
     * @param {String} containerName - The name of the container on which to execute the command.
     * @param {String} command - The command to execute.
     *
     * @return {String} The script as a string.
     */
  exec: function(containerName, command) {
    var script = "";
    script += "set -e\n";
    script +=
      "docker exec -i " + containerName + " /bin/bash -s <<" + heredoc_2 + "\n";
    script += "set -e\n";
    script += command + "\n";
    script += heredoc_2;

    return script + "\n";
  },

  /*
     * Copy 'source' located on the host to the container's 'destination'.
     *
     * @param {String} containerName - The name of the container onto which to copy the data.
     * @param {String} source - The source file to be copied on the container.
     * @param {String} destination - The destination location for this file.
     * @param {String} sudo - Apply the command as sudo
     *
     * @return {String} The script as a string.
     */
  copy: function(containerName, source, destination, sudo) {
    var script = "";

    if (sudo) {
      script += "sudo ";
    }
    script += "docker cp " + source + " " + containerName + ":" + destination;

    return script + "\n";
  }
};
