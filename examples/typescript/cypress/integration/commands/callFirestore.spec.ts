import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import 'firebase/firestore'
const fbInstance = firebase.initializeApp({
  apiKey: 'AIzaSyCTUERDM-Pchn_UDTsfhVPiwM4TtNIxots',
  authDomain: 'redux-firebasev3.firebaseapp.com',
  databaseURL: 'https://redux-firebasev3.firebaseio.com',
  messagingSenderId: '823357791673',
  projectId: 'redux-firebasev3',
  storageBucket: 'redux-firebasev3.appspot.com',
})

describe('cy.callFirestore', () => {
  it('is attached to cypress custom commands', () => {
    expect(cy.callFirestore).to.be.a('function')
  })

  describe('get action', () => {
    it('gets data from Firestore', () => {
      cy.callFirestore('get', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('set action', () => {
    it('writes data to Firestore', () => {
      cy.callFirestore('set', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })

    it('supports merging', () => {
      cy.callFirestore('set', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('update action', () => {
    it('writes data to Firestore', () => {
      cy.callFirestore('update', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('delete action', () => {
    it('writes data to Firestore', () => {
      cy.callFirestore('update', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })
})

