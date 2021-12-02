import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import fbConfig from './fbConfig'

export default function initFirebase() {
  // Initialize firebase instance if it doesn't already exist
  const shouldUseEmulator = !!process.env.REACT_APP_USE_DB_EMULATORS

  if (shouldUseEmulator) { // or window.location.hostname === 'localhost' if you want
    console.log('Using RTDB emulator', `http://localhost:9000?ns=${fbConfig.projectId}`)
    fbConfig.databaseURL = `http://localhost:9000?ns=${fbConfig.projectId}`
  }
  // Initialize Firebase instance
  const app = initializeApp(fbConfig)
  if (shouldUseEmulator) { // or window.location.hostname === 'localhost' if you want
    console.log('Using Firestore emulator')
    const firestoreSettings: any = {
      host: 'localhost:8080',
      ssl: false,
    };

    if ((window as any).Cypress) {
      // Needed for Firestore support in Cypress (see https://github.com/cypress-io/cypress/issues/6350)
      firestoreSettings.experimentalForceLongPolling = true;
    }
    initializeFirestore(app, firestoreSettings)
  }
  const auth = getAuth()
  connectAuthEmulator(auth, "http://localhost:9099");
}
