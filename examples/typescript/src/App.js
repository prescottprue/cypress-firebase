import React from 'react'
import { Provider } from 'react-redux'
import Home from './Home'
import configureStore from './store'
import './App.css'

const initialState = window.__INITIAL_STATE__ || { firebase: { authError: null } }
const store = configureStore(initialState)

function App () {
  return (
    <Provider store={store}>
      <Home />
    </Provider>
  )
}

export default App
