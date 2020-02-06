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
    return firebase.firestore()
    .collection('projects')
    .limit(10)
    .onSnapshot((snap) => {
      console.log('snap', snap)
      setProjects(snap.docs.map((docSnap) => ({...docSnap.data(), id: docSnap.id})))
      setLoadingState(false)
    }, (err) => {
      setErrorState(invoke(err, 'toString') || err)
      setLoadingState(false)
    })
  }
  useEffect(() => {
    const unsetProjectsListener = loadProjects()
    return () => {
      unsetProjectsListener()
    }
  }, [])

  if (errorState) {
    return <div>Error</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!projects || !projects.length) {
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
