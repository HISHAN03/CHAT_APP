import axios from "axios";
import {UserContextProvider} from "./UserContext.jsx";
import Routes from "./Router.jsx";
import React from "react";

function App() {
  const isProduction = process.env.NODE_ENV === "production";
  axios.defaults.baseURL = isProduction
    ? "https://chat-server-m0w2.onrender.com"
    : "http://localhost:3000";
  axios.defaults.withCredentials = true;
  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  )
}

export default App