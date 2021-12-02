import React from 'react'
import { serverTimestamp } from 'firebase/database'

export interface ProjectData {
  name?: string
  createdBy?: string
  id?: string
  createdAt?: ReturnType<typeof serverTimestamp>
}

interface ProjectProps {
  project: ProjectData
}

export function Project({ project }: ProjectProps) {
  return (
    <div style={{ backgroundColor: 'grey' }}>
      <pre>{JSON.stringify(project, null, 2).replace(/{/g, '').replace(/}/g, '')}</pre>
    </div>
  )
}

export default Project