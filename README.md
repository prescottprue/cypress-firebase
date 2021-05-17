# cypress-firebase

[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![Build Status][build-status-image]][build-status-url]
[![Coverage][coverage-image]][coverage-url]
[![License][license-image]][license-url]
[![Code Style][code-style-image]][code-style-url]

> Cypress plugin and custom commands for testing Firebase projects

## What?

0 dependency plugin which adds [custom cypress commands](https://docs.cypress.io/api/cypress-api/custom-commands.html#Syntax) for interactions with Firebase:

- [cy.login][1]
- [cy.logout][4]
- [cy.callRtdb][6]
- [cy.callFirestore][9]

If you are interested in what drove the need for this checkout [the why section](#why)

## Usage

### Pre-Setup

1. If you do not already have it installed, install Cypress and add it to your package file: `npm i --save-dev cypress` or `yarn add -D cypress`
1. Make sure you have a `cypress` folder containing Cypress tests (or create one by calling `cypress open`)

### Setup

**Note:** These instructions assume your tests are in the `cypress` folder (cypress' default). See the [folders section below](#folders) for more info about other supported folders.

1. Install `cypress-firebase` and [`firebase-admin`](https://www.npmjs.org/package/firebase-admin) both: `yarn add -D cypress-firebase firebase-admin` or `npm i --save-dev cypress-firebase firebase-admin`
1. Go to project setting on firebase console and generate new private key. See how to do so [in the Google Docs](https://sites.google.com/site/scriptsexamples/new-connectors-to-google-services/firebase/tutorials/authenticate-with-a-service-account).
1. Add `serviceAccount.json` to your `.gitignore` (THIS IS VERY IMPORTANT TO KEEPING YOUR INFORMATION SECURE!)
1. Save the downloaded file as `serviceAccount.json` in the root of your project (make sure that it is .gitignored) - needed for `firebase-admin` to have read/write access to your DB from within your tests
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

1. Make sure that you load the custom commands file in an `cypress/support/index.js` like so:

   ```js
   import "./commands";
   ```

   **NOTE**: This is a pattern which is setup by default by Cypress, so this file may already exist

1. Setup plugin adding following your plugins file (`cypress/plugins/index.js`):

   ```js
   const admin = require("firebase-admin");
   const cypressFirebasePlugin = require("cypress-firebase").plugin;

   module.exports = (on, config) => {
     const extendedConfig = cypressFirebasePlugin(on, config, admin);

     // Add other plugins/tasks such as code coverage here

     return extendedConfig;
   };
   ```

1. To confirm things are working, create a new test file (`cypress/integration/examples/test_hello_world.js`) adding a test that uses the cypress-firebase custom command (`cy.callFirestore`):

   ```js
   describe("Some Test", () => {
     it("Adds document to test_hello_world collection of Firestore", () => {
       cy.callFirestore("add", "test_hello_world", { some: "value" });
     });
   });
   ```

1. From the root of your project, start Cypress with the command `$(npm bin)/cypress open`. In the Cypress window, click your new test (`test_hello_world.js`) to run it.
1. Look in your Firestore instance and see the `test_hello_world` collection to confirm that a document was added.
1. Pat yourself on the back, you are all setup to access Firebase/Firestore from within your tests!

#### Auth

1. Go to Authentication page of the Firebase Console and select an existing user to use as the testing account or create a new user. This will be the account which you use to login while running tests.
1. Get the UID of the account you have selected, we will call this UID `TEST_UID`
1. Set the UID of the user you created earlier to the Cypress environment. You can do this using a number of methods:

   - Adding `CYPRESS_TEST_UID` to a `.env` file which is gitignored
   - Adding `TEST_UID` to `cypress.env.json` (make sure you place this within your `.gitignore`)
   - Adding as part of your npm script to run tests with a tool such as `cross-env` [here](https://github.com/kentcdodds/cross-env):

     ```json
     "test": "cross-env CYPRESS_TEST_UID=your-uid cypress open"
     ```

1. Call `cy.login()` with the `before` or `beforeEach` sections of your tests

### Running

1. Start your local dev server (usually `npm start`) - for faster alternative checkout the [test built version section](#test-built-version)
1. Open cypress test running by running `npm run test:open` in another terminal window

### Considerations For CI

1. Add the following environment variables in your CI:

   - `CYPRESS_TEST_UID` - UID of your test user
   - `SERVICE_ACCOUNT` - service account object

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

Call Real Time Database path with some specified action such as `set`, `update` and `remove`

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

_Set Data With Timestamps_

```javascript
import firebase from "firebase/app";
import "firebase/database";

const fakeProject = {
  some: "data",
  createdAt: firebase.database.ServerValue.TIMESTAMP,
};
cy.callRtdb("set", "projects/ABC123", fakeProject);
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
level.

##### Parameters

- `action` **[String][11]** The action type to call with (set, push, update, delete)
- `actionPath` **[String][11]** Path within Firestore that action should be applied
- `dataOrOptions` **[String|Object][11]** Data for write actions or options for get action
- `options` **[Object][12]** Options
  - `options.withMeta` **[boolean][13]** Whether or not to include `createdAt` and `createdBy`
  - `options.merge` **[boolean][13]** Merge data during set
  - `options.batchSize` **[number][13]** Size of batch to use while deleting
  - `options.where` **[Array][13]** Filter documents by the specified field and the value should satisfy
  * the relation constraint provided
  - `options.orderBy` **[string|Array][13]** Order documents
  - `options.limit` **[number][13]** Limit to n number of documents
  - `options.limitToLast` **[number][13]** Limit to last n number of documents
  - `options.statics` **[admin.firestore][13]** Firestore statics (i.e. `admin.firestore`). This should only be needed during testing due to @firebase/testing not containing statics

##### Examples

_Basic_

```javascript
cy.callFirestore("set", "project/test-project", "fakeProject.json");
```

_Set Data With Server Timestamps_

```javascript
import firebase from "firebase/app";
import "firebase/firestore";

const fakeProject = {
  some: "data",
  // Use new firebase.firestore.Timestamp.now in place of serverTimestamp()
  createdAt: firebase.firestore.Timestamp.now(),
  // Or use fromDate if you would like to specify a date
  // createdAt: firebase.firestore.Timestamp.fromDate(new Date())
};
cy.callFirestore("set", "projects/ABC123", fakeProject);
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
      cy.log("get returned: ", r);
      cy.wrap(r).its("data.age").should("equal", mockAge);
    });
    cy.log("Ended test");
  });
});
```

## Recipes

### Using Emulators

1. Install cross-env for cross system environment variable support: `npm i --save-dev cross-env`
1. Add the following to the `scripts` section of your `package.json`:

   ```json
   "emulators": "firebase emulators:start --only database,firestore",
   "test": "cypress run",
   "test:open": "cypress open",
   "test:emulate": "cross-env FIREBASE_AUTH_EMULATOR_HOST=\"localhost:$(cat firebase.json | jq .emulators.auth.port)\" FIREBASE_DATABASE_EMULATOR_HOST=\"localhost:$(cat firebase.json | jq .emulators.database.port)\" FIRESTORE_EMULATOR_HOST=\"localhost:$(cat firebase.json | jq .emulators.firestore.port)\" yarn test:open"
   ```

1. If not already set by `firebase init`, add emulator ports to `firebase.json`:

   ```json
   "emulators": {
     "database": {
       "port": 9000
     },
     "firestore": {
       "port": 8080
     },
     "auth": {
      "port": 9099
     }
   }
   ```

1. Modify your application code to connect to the emulators (where your code calls `firebase.initializeApp(...)`), updating the localhost ports as appropriate from the `emulators` values in the previous step:

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

   // Emulate Auth
   if (shouldUseEmulator) {
     firebase.auth().useEmulator(`http://localhost:9099/`);
     console.debug(`Using Auth emulator: http://localhost:9099/`);
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

   const authEmulatorHost = Cypress.env("FIREBASE_AUTH_EMULATOR_HOST");
   if (authEmulatorHost) {
     firebase.auth().useEmulator(`http://${authEmulatorHost}/`);
     console.debug(`Using Auth emulator: http://${authEmulatorHost}/`);
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

### Use Different RTDB Instance

Firebase instance config can be overriden by passing another argument to the cypress-firebase plugin. We can use this to override the `databaseURL`:

1. Setup the config within plugin (`cypress/plugins/index.js`):

   ```js
   const admin = require("firebase-admin");
   const cypressFirebasePlugin = require("cypress-firebase").plugin;

   module.exports = (on, config) => {
     const overrideFirebaseConfig = {
       databaseURL: "http://localhost:9000?ns=my-other-namespace",
     };
     const extendedConfig = cypressFirebasePlugin(on, config, admin);

     // Add other plugins/tasks such as code coverage here

     return extendedConfig;
   };
   ```

1. Make sure you use the same `databaseURL` when initializing the firebase instance within cypress (`cypress/support/index.js`)
1. Make sure you use the same `databaseURL` when initializing the firebase instance within your app code

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

### Changing Custom Command Names

Pass `commandNames` in the `options` object to `attachCustomCommands`:

```js
const options = {
  // Key is current command name, value is new command name
  commandNames: {
    login: "newNameForLogin",
    logout: "newNameForLogout",
    callRtdb: "newNameForCallRtdb",
    callFirestore: "newNameForCallFirestore",
    getAuthUser: "newNameForGetAuthUser",
  },
};
attachCustomCommands({ Cypress, cy, firebase }, options);
```

For more information about this feature, please see the [original feature request](https://github.com/prescottprue/cypress-firebase/issues/15).

### Webpack File Preprocessing

If you are using a file preprocessor which is building for the browser environment, such as Webpack, you will need to make sure usage of `fs` is handled since it is used within the cypress-firebase plugin. To do this with webpack, add the following to your config:

```js
node: {
  fs: "empty";
}
```

See [#120](https://github.com/prescottprue/cypress-firebase/issues/120) for more info

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

When testing, tests should have admin read/write access to the database for seeding/verifying data. It isn't currently possible to use Firebase's `firebase-admin` SDK directly within Cypress tests due to dependencies not being able to be loaded into the Browser environment. Since the admin SDK is necessary to generate custom tokens and interact with Real Time Database and Firestore with admin privileges, this library provides convenience methods (`cy.callRtdb`, `cy.callFirestore`, `cy.login`, etc...) which call custom tasks which have access to the node environment.

## Projects Using It

- [fireadmin.io][fireadmin-url] - A Firebase project management tool ([here is the source][fireadmin-source])
- [cv19assist.com](https://cv19assist.com) - App for connecting volunteers with at-health-risk population during the coronavirus pandemic. ([here is the source](https://github.com/CV19Assist/app))

## Troubleshooting

1. An error is coming from cypress mentioning "Error converting circular structure to JSON"

The issue is most likely due to a circular object, such as a timestamp, being included in data you are attempting to write to Firestore. Instead of using `firebase.firestore.FieldValue.serverTimestamp()` you should instead use `firebase.firestore.Timestamp.now()` or you would like to specify a certain date `firebase.firestore.Timestamp.fromDate(new Date('01/01/18'))`.

This comes from the fact that cypress stringifies values as it is passing them from the browser environment to the node environment through `cy.task`.

## Future Plans

- Drop support for service account file in favor of application default credentails env variable (path to file set in `GOOGLE_APPLICATION_CREDENTIALS`)
- Support for Auth emulators (this will become the suggested method instead of needing a service account)

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
