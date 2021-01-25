import React, { useState, useEffect } from 'react';
import Project from './Project'
import firebase from 'firebase/app'
import 'firebase/database'
import './App.css';

export default function Projects() {
  const [loading, setLoadingState] = useState(false)
  const [projects, setProjects] = useState()
  const [errorState, setErrorState] = useState()

  function loadProjects() {
    setLoadingState(true)
    return firebase.database()
    .ref('projects')
    .limitToLast(10)
    .on('value', (snap) => {
      console.log('Data snapshot:', snap.val())
      setProjects(snap.val())
      setLoadingState(false)
    }, (err) => {
      console.error('Error:', err)
      setErrorState(err.message)
      setLoadingState(false)
    })
  }

  useEffect(() => {
    const unsetProjectsListener = loadProjects()
    return () => {
      // Unset listener on unmount
      firebase.database().ref('projects').off("value", unsetProjectsListener)
    }
  }, [])

  if (errorState) {
    return <div><h4>Error:</h4><p>{errorState}</p></div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!projects) {
    return <div>Projects not found</div>
  }

  return (
    <div data-test="projects">
      {
        Object.keys(projects).map((projectKey) =>
          <Project
            key={`Project-${projectKey}`}
            project={projects[projectKey]}
            projectId={projectKey}
          />
        )
      }
    </div>
  )
}
