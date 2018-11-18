# cypress-firebase
[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![License][license-image]][license-url]
[![Code Style][code-style-image]][code-style-url]

> Utilities and cli to help testing Firebase projects with Cypress

## What?

* Custom commands for auth and database interactions:
  * `cy.login`
  * `cy.logout`
  * `cy.callRtdb` 
  * `cy.callFirestore`
* simple test environment config generation (including custom auth token) - `cypress-firebase createTestEnvFile`

## Usage

### Pre-Setup

Note: Skip to #3 if you already have Cypress tests in your project

1. Install Cypress and add it to your package file: `npm i --save-dev cypress`
1. Add cypress folder by calling `cypress open`

### Setup

1. Install deps `npm i cypress-firebase firebase-tools-extra cross-env --save-dev`
1. Add the following to the `scripts` section of your `package.json`:

    ```json
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

#### Test Built Version

Tests will run faster locally if you tests against the build version of your app instead of your dev version (with hot module reloading and other dev tools). You can do that by:

1. Adding the following npm script:

    ```json
    "start:dist": "npm run build && firebase serve --only hosting -p 3000",
    ```
1. Call `npm run start:dist` to build your app and serve it with firebase
1. In another terminal window, run a test command such as `npm run test:ui`

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

## Why?

It isn't currenlty possible to use Firebase's `firebase-admin` SDK directly within Cypress due to dependencies not being able to be loaded into the Browser environment. Since `firebase-admin` is nessesary to generate custom token needed to login to Firebase, the usage of it happens outside of Cypress (through `cypress-firebase createTestEnvFile`) before booting up.

## Projects Using It

[fireadmin.io][fireadmin-url] - A Firebase project management tool ([here is the source][fireadmin-source])

## Roadmap

* Fix issue where auth token goes bad after test suite has been open a long time

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