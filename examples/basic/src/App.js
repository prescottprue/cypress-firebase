import React from 'react';
import initFirebase from './initFirebase'
import RTDBProjects from './RTDBProjects'
import FirestoreProjects from './FirestoreProjects'
import './App.css';

initFirebase()

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h2>Data From RTDB</h2>
        <RTDBProjects />
        <h2>Data From Firestore</h2>
        <FirestoreProjects />        
      </header>
    </div>
  )
}

export default App;
