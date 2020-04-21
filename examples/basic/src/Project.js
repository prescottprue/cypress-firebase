import React from 'react'

export const Project = ({ project }) => (
  <div style={{ backgroundColor: 'grey' }}><pre>{JSON.stringify(project, null, 2).replace(/{/g, '').replace(/}/g, '')}</pre></div>
)

export default Project