const fs = require('fs')
const cypressFirebasePlugin = require('cypress-firebase').plugin

module.exports = (on, config) => {
  return cypressFirebasePlugin(config)
}
