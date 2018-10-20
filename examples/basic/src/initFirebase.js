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
  if (!firebaseInstance) {
    // Initialize Firebase instance
    firebase.initializeApp(fbConfig)
    firebaseInstance = firebase
  }
  return firebaseInstance
}
