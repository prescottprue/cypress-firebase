import React from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import {
  firebaseConnect,
  isLoaded,
  isEmpty
} from 'react-redux-firebase'
import Project from './Project'
import './App.css'


const Home = ({ projects }) => (
  <div className="App">
    <header className="App-header">
      <p>
        Edit <code>src/Home.js</code> and save to reload.
          </p>
      <div>
        {
          !isLoaded(projects)
            ? <div>Loading...</div>
            : isEmpty(projects)
              ? <div>Projects not found</div>
              : projects.map((project, ind) =>
                <Project
                  key={`Project-${project.key}-${ind}`}
                  project={project.value}
                  projectId={project.key}
                />
              )
        }
      </div>
    </header>
  </div>
)


const enhance = compose(
  firebaseConnect([
    // Load todos from Firestore which are not done into redux
    { path: 'projects', queryParams: ['limitToFirst=10'] }
  ]),
  connect(
    ({ firebase }) => ({
      projects: firebase.ordered.projects,
    })
  )
)

export default enhance(Home)