import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/firestore';
import { attachCustomCommands } from 'cypress-firebase';

const fbConfig = {
  apiKey: "AIzaSyCTUERDM-Pchn_UDTsfhVPiwM4TtNIxots",
  authDomain: "redux-firebasev3.firebaseapp.com",
  // databaseURL: "https://redux-firebasev3.firebaseio.com",
  datbaseURL: `http://localhost:9000?ns=redux-firebasev3`,
  projectId: "redux-firebasev3",
  storageBucket: "redux-firebasev3.appspot.com",
  messagingSenderId: "823357791673"
}

window.fbInstance = firebase.initializeApp(fbConfig);

firebase.firestore().settings({
  host: 'localhost:8080',
  ssl: false
})

attachCustomCommands({ Cypress, cy, firebase })