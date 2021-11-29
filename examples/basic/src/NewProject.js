import React, { useState } from 'react';
import { getDatabase, ref, push, serverTimestamp } from 'firebase/database'
import { getAuth } from 'firebase/auth'

export default function NewProject() {
  const [projectName, setProjectName] = useState()
  function addProject() {
    const newProjectData = {
      name: projectName,
      createdAt: serverTimestamp()
    }
    const auth = getAuth()
    if (auth.currentUser?.uid) {
      newProjectData.createdBy = auth.currentUser.uid
    }
    return push(ref(getDatabase(), 'projects'), newProjectData)
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
