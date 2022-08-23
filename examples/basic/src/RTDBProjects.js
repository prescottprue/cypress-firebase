import React, { useState, useEffect, useCallback } from 'react';
import Project from './Project'
import { getDatabase, ref, limitToLast, query, off, onValue } from 'firebase/database'

export default function Projects() {
  const [loading, setLoadingState] = useState(false)
  const [projects, setProjects] = useState()
  const [errorState, setErrorState] = useState()

  const loadProjects = useCallback(() => {
    setLoadingState(true)
    const projectsQuery = query(ref(getDatabase(), 'projects'), limitToLast(10))
    return onValue(projectsQuery, (snap) => {
      console.log('Data snapshot:', snap.val())
      setProjects(snap.val())
      setLoadingState(false)
    }, (err) => {
      console.error('Error:', err)
      setErrorState(err.message)
      setLoadingState(false)
    })
  }, [setProjects, setLoadingState, setErrorState])

  useEffect(() => {
    const projectsQuery = loadProjects()
    return () => {
      // Unset listener on unmount
      off(projectsQuery, 'value')
    }
  }, [loadProjects])

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
