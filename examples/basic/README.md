# Cypress Firebase Basic Example

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## How Was It Made?

### Project Creation

1. `create-react-app basic && cd basic`
1. Add some useful tools: `yarn add lodash` or `npm i --save lodash`

### Add Firebase

1. Install Firebase library: `yarn add firebase` or `npm i --save firebase`
1. Add Firebase config to `src/config.js`:

```js
export const firebase = {
  apiKey: 'AIzaSyCTUERDM-Pchn_UDTsfhVPiwM4TtNIxots',
  authDomain: 'redux-firebasev3.firebaseapp.com',
  databaseURL: 'https://redux-firebasev3.firebaseio.com',
  projectId: 'redux-firebasev3',
  storageBucket: 'redux-firebasev3.appspot.com',
  messagingSenderId: '823357791673',
};
```

1. Add `src/initFirebase.js` - a util to import Firebase and initialize it (supports already initialized Firebase instance on window for testing):

```js
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/firestore'; // make sure you add this for firestore
import { firebase as fbConfig } from './config';

let firebaseInstance;

export default function initFirebase(initialState, history) {
  if (firebaseInstance) {
    return firebaseInstance;
  }
  // Handle initializeing firebase app if not already on window (when running tests)
  if (window.fbInstance) {
    firebaseInstance = window.fbInstance;
  }
  // Init Firebase if an instance doesn't already exist
  if (!firebaseInstance) {
    firebase.initializeApp(fbConfig);
    firebaseInstance = firebase;
  }
  // Return Firebase instance
  return firebaseInstance;
}
```

1. Load Firebase data in the home component:

```jsx
import React, { Component } from 'react';
import { invoke, map } from 'lodash';
import logo from './logo.svg';
import initFirebase from './initFirebase';
import Project from './Project';
import './App.css';

const fbInstance = initFirebase();

class App extends Component {
  constructor() {
    super();
    this.state = { loading: false };
  }

  componentDidMount() {
    this.setState({ loading: true });
    fbInstance
      .database()
      .ref('projects')
      .limitToFirst(10)
      .on(
        'value',
        (snap) => {
          this.setState({
            projects: snap.val(),
            loading: false,
          });
        },
        (err) => {
          this.setState({
            loading: false,
            error: invoke(err, 'toString') || err,
          });
        },
      );
  }

  render() {
    const { loading, projects } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          {loading ? (
            <div>Loading...</div>
          ) : !projects ? (
            <div>Projects not found</div>
          ) : (
            map(projects, (project, projectKey) => (
              <Project
                key={`Project-${projectKey}`}
                project={project}
                projectId={projectKey}
              />
            ))
          )}
        </header>
      </div>
    );
  }
}

export default App;
```

### Add Cypress Testing

1. Add `.env` that looks like so (to skip warnings due to Cypress deps being out of date):

```
SKIP_PREFLIGHT_CHECK=true
```

1. Install `cypress-firebase` and [`firebase-admin`](https://www.npmjs.org/package/firebase-admin) both: `npm i --save-dev cypress-firebase firebase-admin` or `yarn add -D cypress-firebase firebase-admin`
1. Go to project setting on firebase console and generate new private key. See how to do so [in the Google Docs](https://sites.google.com/site/scriptsexamples/new-connectors-to-google-services/firebase/tutorials/authenticate-with-a-service-account).
1. Add `serviceAccount.json` to your `.gitignore` (THIS IS VERY IMPORTANT TO KEEPING YOUR INFORMATION SECURE!)
1. Save the downloaded file as `serviceAccount.json` in the root of your project (make sure that it is .gitignored) - needed for `firebase-admin` to have read/write access to your DB from within your tests
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

   firebase.initializeApp(fbConfig);

   attachCustomCommands({ Cypress, cy, firebase });
   ```

1. Make sure that you load the custom commands file in an `cypress/support/index.js` like so:

   ```js
   import './commands';
   ```

   **NOTE**: This is a pattern which is setup by default by Cypress, so this file may already exist

1. Setup plugin adding following your plugins file (`cypress/plugins/index.js`):

   ```js
   const admin = require('firebase-admin');
   const cypressFirebasePlugin = require('cypress-firebase').plugin;

   module.exports = (on, config) => {
     const extendedConfig = cypressFirebasePlugin(on, config, admin);

     // Add other plugins/tasks such as code coverage here

     return extendedConfig;
   };
   ```
