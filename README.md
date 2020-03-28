# cypress-firebase

[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![Build Status][build-status-image]][build-status-url]
[![Coverage][coverage-image]][coverage-url]
[![License][license-image]][license-url]
[![Code Style][code-style-image]][code-style-url]

> Utilities and cli to help testing Firebase projects with Cypress

## What?

- Test environment config generation (including custom auth token) with [`createTestEnvFile`](#createTestEnvFile)
- [Custom cypress commands](https://docs.cypress.io/api/cypress-api/custom-commands.html#Syntax) for auth and database interactions:
  - [cy.login][1]
  - [cy.logout][4]
  - [cy.callRtdb][6]
  - [cy.callFirestore][9]

If you are interested in what drove the need for this checkout [the why section](#why)

## Usage

### Pre-Setup

**Note**: Skip cypress install if it already exists within your project

1. Install Cypress and add it to your package file: `npm i --save-dev cypress`
1. Make sure you have a `cypress` folder containing cypress tests (or create one by calling `cypress open`)

### Setup

**Note:** These instructions assume your tests are in the `cypress` folder (cypress' default). See the [folders section below](#folders) for more info about other supported folders.

1. Install cypress-firebase and firebase-admin both: `npm i cypress-firebase firebase-admin --save-dev`
1. Add the following your custom commands file (`cypress/support/commands.js`):

   ```js
   import firebase from "firebase/app";
   import "firebase/auth";
   import "firebase/database";
   import "firebase/firestore";
   import { attachCustomCommands } from "cypress-firebase";

   const fbConfig = {
     // Your config from Firebase Console
   };

   firebase.initializeApp(fbConfig);

   attachCustomCommands({ Cypress, cy, firebase });
   ```

1. Setup plugin adding following your plugins file (`cypress/plugins/index.js`):

   ```js
   const admin = require("firebase-admin");
   const cypressFirebasePlugin = require("cypress-firebase").plugin;

   module.exports = (on, config) => {
     // Pass on function, config, and admin instance. Returns extended config
     return cypressFirebasePlugin(on, config, admin);
   };
   ```

#### Auth

1. Log into your Firebase console for the first time.
1. Go to Auth tab of Firebase and create a user for testing purpose
1. Get the UID of created account. This will be the account which you use to login while running tests (we will call this UID `TEST_UID`)
1. Add the following to your `.gitignore`:

   ```
   serviceAccount.json
   cypress.env.json
   ```

1. Go to project setting on firebase console and generate new private key. See how to do [here](https://sites.google.com/site/scriptsexamples/new-connectors-to-google-services/firebase/tutorials/authenticate-with-a-service-account)
1. Save the downloaded file as `serviceAccount.json` in the root of your project (make sure that it is .gitignored)
1. Set the UID of the user you created earlier to the cypress environment. You can do this using a number of methods:

- Adding `CYPRESS_TEST_UID` to a `.env` file which is gitignored
- Adding `TEST_UID` to `cypress.env.json`
- Adding as part of your npm script to run tests with a tool such as `cross-env`:

```json
"test": "cross-env CYPRESS_TEST_UID=your-uid cypress open"
```

1. Make sure to set `CYPRESS_TEST_UID` environment variable in your CI settings if you are running tests in CI
1. Call `cy.login()` with the `before` or `beforeEach` sections of your tests

**NOTE**: If you are running tests within your CI provider you will want to set the following environment variables:

- `CYPRESS_TEST_UID` - UID of your test user
- `SERVICE_ACCOUNT` - service account object and the

### Running

1. Start your local dev server (usually `npm start`) - for faster alternative checkout the [test built version section](#test-built-version)
1. Open cypress test running by running `npm run test:open` in another terminal window

## Docs

### Custom Cypress Commands

#### Table of Contents

- [cy.login][1]
  - [Examples][2]
- [cy.logout][4]
  - [Examples][5]
- [cy.callRtdb][6]
  - [Parameters][7]
  - [Examples][8]
- [cy.callFirestore][9]
  - [Parameters][10]
  - [Examples][11]

#### cy.login

Login to Firebase using custom auth token

##### Examples

Loading `TEST_UID` automatically from Cypress env:

```javascript
cy.login();
```

Passing a UID

```javascript
const uid = "123SomeUid";
cy.login(uid);
```

#### cy.logout

Log out of Firebase instance

##### Examples

```javascript
cy.logout();
```

#### cy.callRtdb

Call Real Time Database path with some specified action. Authentication is through `FIREBASE_TOKEN` since firebase-tools is used (instead of firebaseExtra).

##### Parameters

- `action` **[String][11]** The action type to call with (set, push, update, remove)
- `actionPath` **[String][11]** Path within RTDB that action should be applied
- `options` **[object][12]** Options
  - `options.limitToFirst` **[number|boolean][13]** Limit to the first `<num>` results. If true is passed than query is limited to last 1 item.
  - `options.limitToLast` **[number|boolean][13]** Limit to the last `<num>` results. If true is passed than query is limited to last 1 item.
  - `options.orderByKey` **[boolean][13]** Order by key name
  - `options.orderByValue` **[boolean][13]** Order by primitive value
  - `options.orderByChild` **[string][11]** Select a child key by which to order results
  - `options.equalTo` **[string][11]** Restrict results to `<val>` (based on specified ordering)
  - `options.startAt` **[string][11]** Start results at `<val>` (based on specified ordering)
  - `options.endAt` **[string][11]** End results at `<val>` (based on specified ordering)

##### Examples

_Set data_

```javascript
const fakeProject = { some: "data" };
cy.callRtdb("set", "projects/ABC123", fakeProject);
```

_Set Data With Meta_

```javascript
const fakeProject = { some: "data" };
// Adds createdAt and createdBy (current user's uid) on data
cy.callRtdb("set", "projects/ABC123", fakeProject, { withMeta: true });
```

_Get/Verify Data_

```javascript
cy.callRtdb("get", "projects/ABC123").then((project) => {
  // Confirm new data has users uid
  cy.wrap(project).its("createdBy").should("equal", Cypress.env("TEST_UID"));
});
```

_Other Args_

```javascript
const opts = { args: ["-d"] };
const fakeProject = { some: "data" };
cy.callRtdb("update", "project/test-project", fakeProject, opts);
```

#### cy.callFirestore

Call Firestore instance with some specified action. Authentication is through serviceAccount.json since it is at the base
level. If using delete, auth is through FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).

##### Parameters

- `action` **[String][11]** The action type to call with (set, push, update, remove)
- `actionPath` **[String][11]** Path within RTDB that action should be applied
- `dataOrOptions` **[String][11]** Data for write actions or options for get action
- `options` **[Object][12]** Options
  - `options.args` **[Array][13]** Command line args to be passed

##### Examples

_Basic_

```javascript
cy.callFirestore("set", "project/test-project", "fakeProject.json");
```

_Recursive Delete_

```javascript
const opts = { recursive: true };
cy.callFirestore("delete", "project/test-project", opts);
```

_Other Args_

```javascript
const opts = { args: ["-r"] };
cy.callFirestore("delete", "project/test-project", opts);
```

_Full_

```javascript
describe("Test firestore", () => {
  const TEST_UID = Cypress.env("TEST_UID");
  const mockAge = 8;

  beforeEach(() => {
    cy.visit("/");
  });

  it("read/write test", () => {
    cy.log("Starting test");

    cy.callFirestore("set", `testCollection/${TEST_UID}`, {
      name: "axa",
      age: 8,
    });
    cy.callFirestore("get", `testCollection/${TEST_UID}`).then((r) => {
      cy.wrap(r[0]).its("id").should("equal", TEST_UID);
      cy.wrap(r[0]).its("data.age").should("equal", mockAge);
    });
    cy.log("Ended test");
  });
});
```

## Recipes

### Using Database Emulators

1. Install cross-env for cross system environment variable support: `npm i --save-dev cross-env`
1. Add the following to the `scripts` section of your `package.json`:

   ```json
   "emulators": "firebase emulators:start --only database,firestore",
   "test": "cypress run",
   "test:open": "cypress open",
   "test:emulate": "cross-env FIREBASE_DATABASE_EMULATOR_HOST=\"localhost:$(cat firebase.json | jq .emulators.database.port)\" FIRESTORE_EMULATOR_HOST=\"localhost:$(cat firebase.json | jq .emulators.firestore.port)\" yarn test:open"
   ```

1. Add emulator ports to `firebase.json`:

```json
"emulators": {
  "database": {
    "port": 9000
  },
  "firestore": {
    "port": 8080
  }
}
```

1. Add support in your application for connecting to the emulators:

   ```js
   const shouldUseEmulator = window.location.hostname === "localhost"; // or other logic to determine when to use
   // Emulate RTDB
   if (shouldUseEmulator) {
     fbConfig.databaseURL = `http://localhost:9000?ns=${fbConfig.projectId}`;
     console.debug(`Using RTDB emulator: ${fbConfig.databaseURL}`);
   }

   // Initialize Firebase instance
   firebase.initializeApp(fbConfig);

   const firestoreSettings = {};
   // Pass long polling setting to Firestore when running in Cypress
   if (window.Cypress) {
     // Needed for Firestore support in Cypress (see https://github.com/cypress-io/cypress/issues/6350)
     firestoreSettings.experimentalForceLongPolling = true;
   }

   // Emulate Firestore
   if (shouldUseEmulator) {
     firestoreSettings.host = "localhost:8080";
     firestoreSettings.ssl = false;
     console.debug(`Using Firestore emulator: ${firestoreSettings.host}`);

     firebase.firestore().settings(firestoreSettings);
   }
   ```

1. Make sure you also have init logic in `cypress/support/commands.js` or `cypress/support/index.js`:

   ```js
   import firebase from "firebase/app";
   import "firebase/auth";
   import "firebase/database";
   import "firebase/firestore";
   import { attachCustomCommands } from "cypress-firebase";

   const fbConfig = {
     // Your Firebase Config
   };

   // Emulate RTDB if Env variable is passed
   const rtdbEmulatorHost = Cypress.env("FIREBASE_DATABASE_EMULATOR_HOST");
   if (rtdbEmulatorHost) {
     fbConfig.databaseURL = `http://${rtdbEmulatorHost}?ns=${fbConfig.projectId}`;
   }

   firebase.initializeApp(fbConfig);

   // Emulate Firestore if Env variable is passed
   const firestoreEmulatorHost = Cypress.env("FIRESTORE_EMULATOR_HOST");
   if (firestoreEmulatorHost) {
     firebase.firestore().settings({
       host: firestoreEmulatorHost,
       ssl: false,
     });
   }

   attachCustomCommands({ Cypress, cy, firebase });
   ```

1. Start emulators: `npm run emulators`
1. In another terminal window, start the application: `npm start`
1. In another terminal window, open test runner with emulator settings: `npm run test:emulate`

**NOTE**: If you are using `react-scripts` (from [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html)) or other environment management, you can use environment variables to pass settings into your app:

```js
const {
  REACT_APP_FIREBASE_DATABASE_EMULATOR_HOST,
  REACT_APP_FIRESTORE_EMULATOR_HOST,
} = process.env;

// Emulate RTDB if REACT_APP_FIREBASE_DATABASE_EMULATOR_HOST exists in environment
if (REACT_APP_FIREBASE_DATABASE_EMULATOR_HOST) {
  console.debug(`Using RTDB emulator: ${fbConfig.databaseURL}`);
  fbConfig.databaseURL = `http://${REACT_APP_FIREBASE_DATABASE_EMULATOR_HOST}?ns=${fbConfig.projectId}`;
}

// Initialize Firebase instance
firebase.initializeApp(fbConfig);

const firestoreSettings = {};

if (window.Cypress) {
  // Needed for Firestore support in Cypress (see https://github.com/cypress-io/cypress/issues/6350)
  firestoreSettings.experimentalForceLongPolling = true;
}

// Emulate RTDB if REACT_APP_FIRESTORE_EMULATOR_HOST exists in environment
if (REACT_APP_FIRESTORE_EMULATOR_HOST) {
  firestoreSettings.host = REACT_APP_FIRESTORE_EMULATOR_HOST;
  firestoreSettings.ssl = false;

  console.debug(`Using Firestore emulator: ${firestoreSettings.host}`);

  firebase.firestore().settings(firestoreSettings);
}
```

### Test Built Version

It is often required to run tests against the built version of your app instead of your dev version (with hot module reloading and other dev tools). You can do that by running a build script before spinning up the:

1. Adding the following npm script:

```json
"start:dist": "npm run build && firebase emulators:start --only hosting",
```

1. Add the emulator port to `firebase.json`:

```json
"emulators": {
  "hosting": {
    "port": 3000
  }
}
```

1. Run `npm run start:dist` to build your app and serve it with firebase
1. In another terminal window, run a test command such as `npm run test:open`

NOTE: You can also use `firebase serve`:

```json
"start:dist": "npm run build && firebase serve --only hosting -p 3000",
```

### CI

1. Run `firebase login:ci` to generate a CI token for `firebase-tools` (this will give your `cy.callRtdb` and `cy.callFirestore` commands admin access to the DB)
1. Set `FIREBASE_TOKEN` within CI environment variables

## Examples

### Github Actions

**Separate Install**

```yml
name: Test Build

on: [pull_request]

jobs:
  ui-tests:
    name: UI Tests
    runs-on: ubuntu-16.04
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v2

      # Cypress action manages installing/caching npm dependencies and Cypress binary.
      - name: Cypress Run
        uses: cypress-io/github-action@v1
        with:
          group: "E2E Tests"
        env:
          # pass the Dashboard record key as an environment variable
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_KEY }}
          # UID of User to login as during tests
          CYPRESS_TEST_UID: ${{ secrets.TEST_UID }}
          # Service Account (used for creating custom auth tokens)
          SERVICE_ACCOUNT: ${{ secrets.SERVICE_ACCOUNT }}
          # Branch settings
          GITHUB_HEAD_REF: ${{ github.head_ref }}
          GITHUB_REF: ${{ github.ref }}
```

**Using Start For Local**

```yml
name: Test

on: [pull_request]

jobs:
  ui-tests:
    name: UI Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v2

      # Cypress action manages installing/caching npm dependencies and Cypress binary
      - name: Cypress Run
        uses: cypress-io/github-action@v1
        runs-on: ubuntu-16.04
        with:
          group: "E2E Tests"
          start: npm start
          wait-on: http://localhost:3000
        env:
          # pass the Dashboard record key as an environment variable
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_KEY }}
          # UID of User to login as during tests
          CYPRESS_TEST_UID: ${{ secrets.TEST_UID }}
          # Service Account (used for creating custom auth tokens)
          SERVICE_ACCOUNT: ${{ secrets.SERVICE_ACCOUNT }}
          # Branch settings
          GITHUB_HEAD_REF: ${{ github.head_ref }}
          GITHUB_REF: ${{ github.ref }}
```

## Why?

When testing, tests should have admin read/write access to the database for seeding/verifying data. It isn't currently possible to use Firebase's `firebase-admin` SDK directly within Cypress tests due to dependencies not being able to be loaded into the Browser environment. Since the admin SDK is nessesary to generate custom tokens and interact with Real Time Database and Firestore with admin privileges, this library provides convience methods (`cy.callRtdb`, `cy.callFirestore`, `cy.login`, etc...) which call custom tasks which have access to the node environment.

## Projects Using It

[fireadmin.io][fireadmin-url] - A Firebase project management tool ([here is the source][fireadmin-source])

## Roadmap

- Fix issue where auth token goes bad after test suite has been open a long time

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
[npm-downloads-image]: https://img.shields.io/npm/dm/cypress-firebase.svg?style=flat-square
[build-status-image]: https://img.shields.io/github/workflow/status/prescottprue/cypress-firebase/NPM%20Package%20Publish?style=flat-square&logo=github
[build-status-url]: https://github.com/prescottprue/cypress-firebase/actions
[coverage-image]: https://img.shields.io/codecov/c/gh/prescottprue/cypress-firebase?style=flat-square&logo=codecov
[coverage-url]: https://codecov.io/gh/prescottprue/cypress-firebase
[license-image]: https://img.shields.io/npm/l/cypress-firebase.svg?style=flat-square
[license-url]: https://github.com/prescottprue/cypress-firebase/blob/master/LICENSE
[code-style-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[code-style-url]: http://standardjs.com/
