import { useState, useRef, useEffect } from 'react'
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';

function App() {


    // Function to send a message to the WebSocket server


  return (
    <>

    <Router>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/chat" element={<ChatRoom/>}/>
      
      </Routes>
    </Router>
      
    </>
  )
}

export default App
