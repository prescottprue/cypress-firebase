import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import 'firebase/firestore'
firebase.initializeApp({
  apiKey: 'AIzaSyCTUERDM-Pchn_UDTsfhVPiwM4TtNIxots',
  authDomain: 'redux-firebasev3.firebaseapp.com',
  databaseURL: 'https://redux-firebasev3.firebaseio.com',
  messagingSenderId: '823357791673',
  projectId: 'redux-firebasev3',
  storageBucket: 'redux-firebasev3.appspot.com',
})

describe('cy.login', () => {
  it('is attached to cypress custom commands', () => {
    expect(cy.login).to.be.a('function')
  })

  it('logs user in', () => {
    cy.login()
    expect(firebase.auth().currentUser).to.be.an('object')
  })
})
