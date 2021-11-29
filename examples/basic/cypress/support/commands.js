import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/firestore';
import { attachCustomCommands } from 'cypress-firebase';


const fbConfig = {
  apiKey: "AIzaSyCTUERDM-Pchn_UDTsfhVPiwM4TtNIxots",
  authDomain: "redux-firebasev3.firebaseapp.com",
  databaseURL: "https://redux-firebasev3.firebaseio.com",
  projectId: "redux-firebasev3",
  storageBucket: "redux-firebasev3.appspot.com",
  messagingSenderId: "823357791673"
}

// Emulate RTDB if Env variable is passed
const rtdbEmulatorHost = Cypress.env('FIREBASE_DATABASE_EMULATOR_HOST')
if (rtdbEmulatorHost) {
  fbConfig.databaseURL = `http://${rtdbEmulatorHost}?ns=redux-firebasev3`
}

firebase.initializeApp(fbConfig);

// Emulate Firestore if Env variable is passed
const firestoreEmulatorHost = Cypress.env('FIRESTORE_EMULATOR_HOST')
if (firestoreEmulatorHost) {
  firebase.firestore().settings({
    host: firestoreEmulatorHost,
    ssl: false
  })
}

const authEmulatorHost = Cypress.env('FIREBASE_AUTH_EMULATOR_HOST')
if (authEmulatorHost) {
  firebase.auth().useEmulator(`http://${authEmulatorHost}/`);
  console.debug(`Using Auth emulator: http://${authEmulatorHost}/`);
}

attachCustomCommands({ Cypress, cy, firebase })
