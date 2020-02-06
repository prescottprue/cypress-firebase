import React, { useState, useEffect } from 'react';
import { invoke, map } from 'lodash';
import Project from './Project'
import firebase from 'firebase/app'
import 'firebase/firestore' // make sure you add this for firestore
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
      console.log('snap', snap, snap.val())
      setProjects(snap.val())
      setLoadingState(false)
    }, (err) => {
      setErrorState(invoke(err, 'toString') || err)
      setLoadingState(false)
    })
  }
  useEffect(() => {
    const unsetProjectsListener = loadProjects()
    return () => {
      firebase.database().ref('projects').off(unsetProjectsListener)
    }
  }, [])

  if (errorState) {
    return <div>Error</div>
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
        map(projects, (project, projectKey) =>
          <Project
            key={`Project-${projectKey}`}
            project={project}
            projectId={projectKey}
          />
        )
      }
    </div>
  )
}
