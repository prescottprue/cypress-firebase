const { exec } = require('child-process-promise');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFilePromise = promisify(fs.writeFile);
const readFilePromise = promisify(fs.readFile);

const repoPath = path.resolve(`${__dirname}/../..`);

// Command-line options.
const { source: sourceFile } = yargs
  .option('source', {
    default: `${repoPath}/index.d.ts`,
    describe: 'Typescript source file(s)',
    type: 'string'
  })
  .version(false)
  .help().argv;

const docPath = path.resolve(`${__dirname}/html/js`);
const tempNodeSourcePath = path.resolve(`${__dirname}/index.node.d.ts`);

/**
 * Runs Typedoc command.
 *
 * Additional config options come from ./typedoc.js
 * @returns {Promise<any>} Resolves with results of command
 */
function runTypedoc() {
  const command = `${repoPath}/node_modules/.bin/typedoc ${sourceFile} \
  --tsconfig ${repoPath}/scripts/docgen/tsconfig.json \
  --out ${docPath} \
  --options ${__dirname}/typedoc.js`;

  console.log('Running command:\n', command);
  return exec(command);
}

/**
 * Moves files from subdir to root.
 * @param {string} subdir Subdir to move files out of.
 * @returns {Promise} Resolves after moving files
 */
async function moveFilesToRoot(subdir) {
  const srcDir = `${docPath}/${subdir}`;
  if (fs.existsSync(srcDir)) {
    return exec(`mv ${srcDir}/* ${docPath}`).then(() => {
      exec(`rmdir ${srcDir}`);
    });
  }
}

/**
 * Reformat links to match flat structure.
 * @param {string} file File to fix links in.
 * @returns {Promise} Resolves after fixing links
 */
function fixLinks(file) {
  const fileContentsBuffer = fs.readFileSync(file, 'utf8');
  const data = fileContentsBuffer.toString();
  const flattenedLinks = data
    .replace(/\.\.\//g, '')
    .replace(/(modules|interfaces|classes|enums)\//g, '');
  let caseFixedLinks = flattenedLinks;
  for (const lower in lowerToUpperLookup) {
    const re = new RegExp(lower, 'g');
    caseFixedLinks = caseFixedLinks.replace(re, lowerToUpperLookup[lower]);
  }
  return writeFilePromise(file, caseFixedLinks);
}

/**
 * Mapping between lowercase file name and correctly cased name.
 * Used to update links when filenames are capitalized.
 */
const lowerToUpperLookup = {};

/**
 * Fix all links in generated files to other generated files to point to top
 * level of generated docs dir.
 *
 * @param {Array} htmlFiles List of html files found in generated dir.
 */
function fixAllLinks(htmlFiles) {
  const writePromises = [];
  htmlFiles.filter(Boolean).forEach(file => {
    // Update links in each html file to match flattened file structure.
    writePromises.push(fixLinks(`${docPath}/${file}.html`));
  });
  return Promise.all(writePromises);
}

// Run main Typedoc process (uses index.d.ts and generated temp file above).
runTypedoc()
  .then(output => {
    // Typedoc output.
    console.log(output.stdout); // eslint-disable-line no-console
    // Clean up temp node index.d.ts file if it exists.
    if (fs.existsSync(tempNodeSourcePath)) {
      fs.unlinkSync(tempNodeSourcePath);
    }
  })
  // Flatten file structure. These categories don't matter to us and it makes
  // it easier to manage the docs directory.
  // .then(() => {
  //   return Promise.all([
  //     moveFilesToRoot('classes'),
  //     moveFilesToRoot('modules'),
  //     moveFilesToRoot('interfaces'),
  //     moveFilesToRoot('enums')
  //   ]);
  // })
  // Correct the links in all the generated html files now that files have
  // all been moved to top level.
  // .then(fixAllLinks)
  // Add local variable include line to index.html (to access current SDK
  // version number).
  .then(() => {
    readFilePromise(`${docPath}/index.html`, 'utf8').then(data => {
      // String to include devsite local variables.
      const localVariablesIncludeString = `{% include "docs/web/_local_variables.html" %}\n`;
      return writeFilePromise(
        `${docPath}/index.html`,
        localVariablesIncludeString + data
      );
    });
  })
  .catch(e => {
    if (e.stdout) {
      console.error(e.stdout); // eslint-disable-line no-console
    } else {
      console.error(e); // eslint-disable-line no-console
    }
  });
