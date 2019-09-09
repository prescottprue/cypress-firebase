const fs = require('fs')
const cypressTypeScriptPreprocessor = require('./cy-ts-preprocessor')

module.exports = on => {
  on('file:preprocessor', (file) => {
    console.log(`preprocessor invoked with ${JSON.stringify(file)}`);
    return cypressTypeScriptPreprocessor(file).then((results) => {
      console.log(`preprocessor returned ${JSON.stringify(results)}`);

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
}
