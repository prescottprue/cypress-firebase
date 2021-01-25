import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import 'firebase/firestore' // make sure you add this for firestore
import fbConfig from './fbConfig'

let firebaseInstance

export default function getFirebaseInstance(initialState, history) {
  if (firebaseInstance) {
    return firebaseInstance
  }
  // Handle initializeing firebase app if not already on window (when running tests)
  if (window.fbInstance) {
    firebaseInstance = window.fbInstance
  }

  // Initialize firebase instance if it doesn't already exist
  if (!firebaseInstance) {
    const shouldUseEmulator = process.env.REACT_APP_USE_DB_EMULATORS

    if (shouldUseEmulator) { // or window.location.hostname === 'localhost' if you want
      console.log('Using RTDB emulator')
      fbConfig.databaseURL = `http://localhost:9000?ns=${fbConfig.projectId}`
    }
    // Initialize Firebase instance
    firebase.initializeApp(fbConfig)
    if (shouldUseEmulator) { // or window.location.hostname === 'localhost' if you want
      console.log('Using Firestore emulator')
      const firestoreSettings = {
        host: 'localhost:8080',
        ssl: false,
      };
  
      if (window.Cypress) {
        // Needed for Firestore support in Cypress (see https://github.com/cypress-io/cypress/issues/6350)
        firestoreSettings.experimentalForceLongPolling = true;
      }
      firebase.firestore().settings(firestoreSettings)
    }

    firebase.auth().useEmulator('http://localhost:9099/');
    
    firebaseInstance = firebase
  }


  return firebaseInstance
}
