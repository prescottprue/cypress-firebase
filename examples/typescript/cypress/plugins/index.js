const fs = require('fs')
const cypressTypeScriptPreprocessor = require('./cy-ts-preprocessor')
const cypressFirebasePlugin = require('cypress-firebase').plugin

module.exports = (on, config) => {
  on('file:preprocessor', (file) => {
    // console.log(`preprocessor invoked with ${JSON.stringify(file)}`); // uncomment for debugging webpack crashes
    return cypressTypeScriptPreprocessor(file).then((results) => {
      // console.log(`preprocessor returned ${JSON.stringify(results)}`); // uncomment for debugging webpack crashes

      if (!fs.existsSync(file.outputPath)) {
        console.error(`Output file does not exist on the filesystem: ${JSON.stringify(file)}`);
        throw new Error(`Output file does not exist on the filesystem: ${JSON.stringify(file)}`);
      }
      return results;
    }).catch((err) => {
      console.error(`Error occurred running preprocessor`, err);
      throw err;
    });
  })

  return cypressFirebasePlugin(config)
}
