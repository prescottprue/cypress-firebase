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
    apiKey: "AIzaSyCTUERDM-Pchn_UDTsfhVPiwM4TtNIxots",
    authDomain: "redux-firebasev3.firebaseapp.com",
    databaseURL: "https://redux-firebasev3.firebaseio.com",
    projectId: "redux-firebasev3",
    storageBucket: "redux-firebasev3.appspot.com",
    messagingSenderId: "823357791673"
  }
  ```
1. Add `src/initFirebase.js` - a util to import Firebase and initialize it (supports already initialized Firebase instance on window for testing):

  ```js
  import firebase from 'firebase/app'
  import 'firebase/auth'
  import 'firebase/database'
  import 'firebase/firestore' // make sure you add this for firestore
  import { firebase as fbConfig } from './config'

  let firebaseInstance

  export default function initFirebase(initialState, history) {
    if (firebaseInstance) {
      return firebaseInstance
    }
    // Handle initializeing firebase app if not already on window (when running tests)
    if (window.fbInstance) {
      firebaseInstance = window.fbInstance
    }
    // Init Firebase if an instance doesn't already exist
    if (!firebaseInstance) {
      firebase.initializeApp(fbConfig)
      firebaseInstance = firebase
    }
    // Return Firebase instance
    return firebaseInstance
  }
  ```

1. Load Firebase data in the home component:
  
  ```jsx
  import React, { Component } from 'react';
  import { invoke, map } from 'lodash';
  import logo from './logo.svg';
  import initFirebase from './initFirebase'
  import Project from './Project'
  import './App.css';

  const fbInstance = initFirebase()

  class App extends Component {
    constructor() {
      super()
      this.state = { loading: false }
    }
    
    componentDidMount() {
      this.setState({ loading: true })
      fbInstance.database()
        .ref('projects')
        .limitToFirst(10)
        .on('value', (snap) => {
          this.setState({
            projects: snap.val(),
            loading: false
          })
        }, (err) => {
          this.setState({
            loading: false,
            error: invoke(err, 'toString') || err
          })
        })
    }
    
    render() {
      const { loading, projects } = this.state
      return (
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <p>
              Edit <code>src/App.js</code> and save to reload.
            </p>
            {
              loading
                ? <div>Loading...</div>
                : !projects
                  ? <div>Projects not found</div>
                  : map(projects, (project, projectKey) =>
                    <Project
                      key={`Project-${projectKey}`}
                      project={project}
                      projectId={projectKey}
                    />
                  )
            }
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
1. Install Cypress: `yarn add --dev cypress` or `npm i --save-dev cypress`
1. Install deps for testing: `yarn add --dev cypress-firebase firebase-tools-extra cross-env` or `npm i --save-dev cypress-firebase firebase-tools-extra cross-env`
1. Run `cypress open` to scaffold out Cypress project and open Cypress UI
1. Close the Cypress UI and remove the `cypress/examples` folder
1. Add npm scripts:
  ```json
  "build:testConfig": "cypress-firebase createTestEnvFile",
  "test": "npm run build:testConfig && cross-env CYPRESS_baseUrl=http://localhost:3000 cypress run",
  "test:ui": "npm run build:testConfig && cross-env CYPRESS_baseUrl=http://localhost:3000 cypress open",
  ```
1. Add custom commands and Firebase initialization to `cypress/support/commands.js`:
  ```js
  import firebase from 'firebase/app';
  import 'firebase/auth';
  import 'firebase/database';
  import 'firebase/firestore';
  import { attachCustomCommands } from 'cypress-firebase';
  const fbConfig = {
  // your firebase config
  }
  window.fbInstance = firebase.initializeApp(fbConfig);
  // add cy.login, cy.logout, cy.callRtdb, and cy.callFirestore
  attachCustomCommands({ Cypress, cy, firebase })
  ```