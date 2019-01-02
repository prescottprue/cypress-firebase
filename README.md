# cypress-firebase
[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![License][license-image]][license-url]
[![Code Style][code-style-image]][code-style-url]

> Utilities and cli to help testing Firebase projects with Cypress

## What?

* Test environment config generation (including custom auth token) with [`createTestEnvFile`](#createTestEnvFile)
* [Custom cypress commands](https://docs.cypress.io/api/cypress-api/custom-commands.html#Syntax) for auth and database interactions:
  * [cy.login][1]
  * [cy.logout][4]
  * [cy.callRtdb][6]
  * [cy.callFirestore][9]

If you are intereted in what drove the need for this checkout [the why section](#why)

## Usage

### Pre-Setup

**Note**: Skip cypress install if it already exists within your project

1. Log into your app for the first time
1. Go to the Auth tab of Firebase and get your UID. This will be the account which you use to login while running tests (we will call this UID `TEST_UID`)
1. Generate a service account -> save it as `serviceAccount.json`
1. Install Cypress and add it to your package file: `npm i --save-dev cypress`
1. Add cypress folder by calling `cypress open`

### Setup

**Note:** These instructions assume your tests are in the `cypress` folder (cypress' default). See the [folders section below](#folders) for more info about other supported folders.

1. Make sure you have `firebase-tools` installed (globally or within project). It is used to call to database when using `cy.callRtdb` and `cy.callFirestore`.
1. Install using `npm i cypress-firebase --save-dev`
1. Add the following to the `scripts` section of your `package.json`:

    ```json
    "build:testConfig": "cypress-firebase createTestEnvFile",
    "test": "npm run build:testConfig cypress run",
    "test:open": "npm run build:testConfig cypress open",
    "test:stage": "npm run test -- --env envName=stage",
    "test:open:stage": "npm run test:open -- --env envName=stage"
    ```
    Environment variables can be passed through `--env`. `envName` points to the firebase project within the projects section of `.firebaserc`.
1. Add your config info to `cypress/config.json`
  
    ```js
    {
      "TEST_UID": "<- uid of the user you want to test as ->",
      "FIREBASE_PROJECT_ID": "<- projectId of your project ->"
    }
    ```

1. Add the following your custom commands file (`cypress/support/commands.js`):

    ```js
    import firebase from 'firebase/app';
    import 'firebase/auth';
    import 'firebase/database';
    import 'firebase/firestore';
    import { attachCustomCommands } from 'cypress-firebase';

    const fbConfig = {
      // Your config from Firebase Console
    };

    window.fbInstance = firebase.initializeApp(fbConfig);

    attachCustomCommands({ Cypress, cy, firebase })
    ```
1. Setup plugin adding following your plugins file (`cypress/plugins/index.js`):

    ```js
    const cypressFirebasePlugin = require('cypress-firebase').plugin

    module.exports = (on, config) => {
      // `on` is used to hook into various events Cypress emits
      // `config` is the resolved Cypress config

      // Return extended config (with settings from .firebaserc)
      return cypressFirebasePlugin(config)
    }
    ```

    The plugin sets `baseUrl` and loads config from `.firebaserc`

### Running

1. Start your local dev server (usually `npm start`) - for faster alternative checkout the [test built version section](#test-built-version)
1. Open cypress test running by running `npm run test:open` in another terminal window

#### Test Built Version

Tests will run faster locally if you tests against the build version of your app instead of your dev version (with hot module reloading and other dev tools). You can do that by:

1. Adding the following npm script:

    ```json
    "start:dist": "npm run build && firebase serve --only hosting -p 3000",
    ```
1. Run `npm run start:dist` to build your app and serve it with firebase
1. In another terminal window, run a test command such as `npm run test:open`

### CI

1. Run `firebase login:ci` to generate a CI token for `firebase-tools` (this will give your `cy.callRtdb` and `cy.callFirestore` commands admin access to the DB)
1. Set `FIREBASE_TOKEN` within CI environment variables

### Folders

`cypress` is the default folder where config is loaded from, but you can use another folder by specifiying a different setting for the `integrationFolder` parameter in `cypress.json`:

```json
{
  "projectId": "<- your project id ->",
  "fixturesFolder": "test/e2e/fixtures",
  "integrationFolder": "test/e2e/integration",
  "pluginsFile": "test/e2e/plugins/index.js",
  "screenshotsFolder": "test/e2e/screenshots",
  "videosFolder": "test/e2e/videos",
  "supportFile": "test/e2e/support/index.js"
}
```

## Docs

### CLI Commands

#### createTestEnvFile {#createTestEnvFile}

Create test environment file (`cypress.env.json`) which contains custom auth token generated using `firebase-admin` SDK and `serviceAccount.json`.

##### Examples

```bash
cypress-firebase createTestEnvFile
```

### Custom Cypress Commands

#### Table of Contents

-   [cy.login][1]
    -   [Examples][2]
-   [cy.logout][4]
    -   [Examples][5]
-   [cy.callRtdb][6]
    -   [Parameters][7]
    -   [Examples][8]
-   [cy.callFirestore][9]
    -   [Parameters][10]
    -   [Examples][11]

#### cy.login

Login to Firebase auth using `FIREBASE_AUTH_JWT` environment variable
which is generated using `firebase-admin` authenticated with serviceAccount
during `build:testConfig` phase.

##### Examples

```javascript
cy.login()
```

#### cy.logout

Log out of Firebase instance

##### Examples

```javascript
cy.logout()
```

#### cy.callRtdb

Call Real Time Database path with some specified action. Authentication is through `FIREBASE_TOKEN` since firebase-tools is used (instead of firebaseExtra).

##### Parameters

-   `action` **[String][11]** The action type to call with (set, push, update, remove)
-   `actionPath` **[String][11]** Path within RTDB that action should be applied
-   `opts` **[Object][12]** Options
    -   `opts.args` **[Array][13]** Command line args to be passed

##### Examples

*Set data*

```javascript
const fakeProject = { some: 'data' }
cy.callRtdb('set', 'projects/ABC123', fakeProject)
```

*Set Data With Meta*

```javascript
const fakeProject = { some: 'data' }
// Adds createdAt and createdBy (current user's uid) on data
cy.callRtdb('set', 'projects/ABC123', fakeProject, { withMeta: true })
```

*Get/Verify Data*

```javascript
cy.callRtdb('get', 'projects/ABC123')
  .then((project) => {
    // Confirm new data has users uid
    cy.wrap(project)
      .its('createdBy')
      .should('equal', Cypress.env('TEST_UID'))
  })
```

*Other Args*

```javascript
const opts = { args: ['-d'] }
const fakeProject = { some: 'data' }
cy.callRtdb('update', 'project/test-project', fakeProject, opts)
```

#### cy.callFirestore

Call Firestore instance with some specified action. Authentication is through serviceAccount.json since it is at the base
level. If using delete, auth is through FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).

##### Parameters

-   `action` **[String][11]** The action type to call with (set, push, update, remove)
-   `actionPath` **[String][11]** Path within RTDB that action should be applied
-   `opts` **[Object][12]** Options
    -   `opts.args` **[Array][13]** Command line args to be passed

##### Examples

*Basic*

```javascript
cy.callFirestore('add', 'project/test-project', 'fakeProject.json')
```

*Recursive Delete*

```javascript
const opts = { recursive: true }
cy.callFirestore('delete', 'project/test-project', opts)
```

*Other Args*

```javascript
const opts = { args: ['-r'] }
cy.callFirestore('delete', 'project/test-project', opts)
```

## Why?

It isn't currenlty possible to use Firebase's `firebase-admin` SDK directly within Cypress due to dependencies not being able to be loaded into the Browser environment. Since `firebase-admin` is nessesary to generate custom token needed to login to Firebase, the usage of it happens outside of Cypress (through `cypress-firebase createTestEnvFile`) before booting up.

Instead of a cli tool, the plugin that is include could maybe use `firebase-admin` (since cypress plugins is a node environment) - when investigating this, I found it frustrating to get the values back into the test. That said, always open to better ways of solving this, so please reach out with your ideas!

## Projects Using It

[fireadmin.io][fireadmin-url] - A Firebase project management tool ([here is the source][fireadmin-source])

## Roadmap

* Fix issue where auth token goes bad after test suite has been open a long time

[1]: #cylogin

[2]: #examples

[3]: #currentuser

[4]: #cylogout

[5]: #examples-1

[6]: #cycallrtdb

[7]: #parameters

[8]: #examples-2

[9]: #cycallfirestore

[10]: #parameters-1

[11]: #examples-3

[12]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[13]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[14]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array


[fireadmin-url]: https://fireadmin.io
[fireadmin-source]: https://github.com/prescottprue/fireadmin
[npm-image]: https://img.shields.io/npm/v/cypress-firebase.svg?style=flat-square
[npm-url]: https://npmjs.org/package/cypress-firebase
[travis-image]: https://img.shields.io/travis/prescottprue/cypress-firebase/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/prescottprue/cypress-firebase
[daviddm-image]: https://img.shields.io/david/prescottprue/cypress-firebase.svg?style=flat-square
[daviddm-url]: https://david-dm.org/prescottprue/cypress-firebase
[climate-image]: https://img.shields.io/codeclimate/github/prescottprue/cypress-firebase.svg?style=flat-square
[climate-url]: https://codeclimate.com/github/prescottprue/cypress-firebase
[license-image]: https://img.shields.io/npm/l/cypress-firebase.svg?style=flat-square
[license-url]: https://github.com/prescottprue/cypress-firebase/blob/master/LICENSE
[code-style-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[code-style-url]: http://standardjs.com/