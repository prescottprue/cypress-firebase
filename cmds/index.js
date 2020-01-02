/* eslint-disable no-param-reassign */
module.exports = function setupCommands(client) {
  process.env.FORCE_COLOR = true;

  /**
   * Load command from file by name
   * @param name - Name of command
   * @returns {object} Command object
   */
  function loadCommand(name) {
    return require('./' + name)(client) // eslint-disable-line
  }

  client.createTestEnvFile = loadCommand('createTestEnvFile');
  client.run = loadCommand('run');
  client.open = loadCommand('open');

  return client;
};
