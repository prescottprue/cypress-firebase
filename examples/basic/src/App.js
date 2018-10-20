import React, { Component } from 'react';
import { invoke, map } from 'lodash';
import logo from './logo.svg';
import initFirebase from './initFirebase'
import Project from './Project'
import './App.css';

const fbInstance = initFirebase()

class App extends Component {
  constructor() {
    super()
    this.state = { loading: false }
  }
  
  componentDidMount() {
    this.setState({ loading: true })
    fbInstance.database()
      .ref('projects')
      .limitToFirst(10)
      .on('value', (snap) => {
        this.setState({
          projects: snap.val(),
          loading: false
        })
      }, (err) => {
        this.setState({
          loading: false,
          error: invoke(err, 'toString') || err
        })
      })
  }
  
  render() {
    const { loading, projects } = this.state
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          {
            loading
              ? <div>Loading...</div>
              : !projects
                ? <div>Projects not found</div>
                : map(projects, (project, projectKey) =>
                  <Project
                    key={`Project-${projectKey}`}
                    project={project}
                    projectId={projectKey}
                  />
                )
          }
        </header>
      </div>
    );
  }
}

export default App;
