import React, { useState, useEffect, useCallback } from 'react';
import Project, { ProjectData } from './Project'
import { getDatabase, ref, limitToLast, query, off, onValue } from 'firebase/database'

interface ProjectsMap {
  [k: string]: ProjectData
}

export default function Projects() {
  const [loading, setLoadingState] = useState(false)
  const [projects, setProjects] = useState<ProjectsMap>()
  const [errorState, setErrorState] = useState('')
  
  const loadProjects = useCallback(() => {
    setLoadingState(true)
    const projectsQuery = query(ref(getDatabase(), 'projects'), limitToLast(10))
    onValue(projectsQuery, (snap) => {
      console.log('Data snapshot:', snap.val())
      setProjects(snap.val())
      setLoadingState(false)
    }, (err) => {
      console.error('Error:', err)
      setErrorState(err.message)
      setLoadingState(false)
    })
    return projectsQuery
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
        Object.entries(projects).map(([projectKey, project]) =>
          <Project
            key={`Project-${projectKey}`}
            project={project}
          />
        )
      }
    </div>
  )
}
