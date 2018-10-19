# cypress-firebase

> Utilities to help testing firebase projects with cypress

## Installation

```sh
$ npm i --save-dev cypress-firebase
```

## Usage

### Pre-Setup

Note: Skip to #3 if you already have Cypress tests in your project

1. Install Cypress and add it to your package file: `npm i --save-dev cypress`
1. Add cypress folder by calling `cypress open`

### Setup
1. Install deps `npm i cypress-firebase firebase-tools-extra cross-env --save-dev`
1. Add the following to the `scripts` section of your `package.json`:

  ```js
  "build:testConfig": "cypress-firebase createTestEnvFile",
  "test": "npm run build:testConfig && cross-env CYPRESS_baseUrl=http://localhost:3000 cypress run",
  "test:ui": "npm run build:testConfig && cross-env CYPRESS_baseUrl=http://localhost:3000 cypress open",
  ```
1. Add the following to the custom commands file (`cypress/support/commands.js`):

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

### Create Config
1. Log into your app for the first time
1. Go to the Auth tab of Firebase and get your UID
1. Generate a service account -> save it as `serviceAccount.json`
1. Add your config info to `cypress/config.json`
  
  ```js
  {
    "TEST_UID": "<- uid of the user you want to test as ->",
    "FIREBASE_PROJECT_ID": "<- projectId of your project ->"
  }
  ```


## Usage

*docs here*

## Development

Install dependencies:

```
$ npm install
```

Run the example app at [http://localhost:8080](http://localhost:8080):

```
$ npm start
```

Run tests and watch for code changes using [jest](https://github.com/facebook/jest):

```
$ npm test
```

Lint `src` and `test` files:

```
$ npm run lint
```

Generate UMD output in the `lib` folder (runs implicitly on `npm version`):

```
$ npm run build
```

## License

MIT
