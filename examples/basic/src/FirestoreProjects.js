import React, { useState, useEffect } from 'react';
import Project from './Project'
import { getFirestore, query, collection, limit, onSnapshot } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import './App.css';

export default function Projects() {
  const [loading, setLoadingState] = useState(false)
  const [projects, setProjects] = useState()
  const [errorState, setErrorState] = useState()

  const firestore = getFirestore()
  const projectsQuery = query(
    collection(firestore, 'public_projects'),
    limit(10)
  )
  
  function loadProjects() {
    setLoadingState(true)
    onSnapshot(projectsQuery, (snap) => {
      console.log('snap', snap)
      setProjects(snap.docs.map((docSnap) => ({...docSnap.data(), id: docSnap.id})))
      setLoadingState(false)
    }, (err) => {
      setErrorState(err?.toString ? err.toString() : err)
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
        projects.map((project, projectKey) =>
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
