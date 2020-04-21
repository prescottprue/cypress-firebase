import React, { useState } from 'react';
import firebase from 'firebase/app'
import 'firebase/database' // make sure you add this for firestore

export default function NewProject() {
  const [projectName, setProjectName] = useState()
  function addProject() {
    const newProjectData = {
      name: projectName,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }
    if (firebase.auth().currentUser && firebase.auth().currentUser.uid) {
      newProjectData.createdBy = firebase.auth().currentUser.uid
    }
    return firebase.database()
    .ref('projects')
    .push(newProjectData)
  }

  return (
    <div>
      <input
        placeholder="Project Name"
        onChange={(e) => setProjectName(e.target.value)}
        style={{ marginRight: '2rem' }}
      />
      <button onClick={addProject}>Add Project</button>
    </div>
  )
}
