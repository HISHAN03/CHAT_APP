import axios from "axios";
import {UserContextProvider} from "./UserContext.jsx";
import Routes from "./Router.jsx";
import React from "react";

function App() {
  axios.defaults.baseURL = 'http://localhost:3000';
  axios.defaults.withCredentials = true;
  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  )
}

export default App