import { useState, useRef, useEffect } from 'react'
import axios from 'axios';

function App() {
  const [api, setApi] = useState(import.meta.env.VITE_API_PATH);
  const ws = useRef(null);
  const [username, setusername] = useState("aidan")
  const [room, setRoom] = useState("myroom")
  const [msg, setMsg] = useState("")
  const [changeRoom, setChangeRoom] = useState(true)

  useEffect(() => {
    // Replace 'ws://example.com/socket' with your WebSocket server endpoint
    ws.current = new WebSocket(`${api.replace("http","ws")}/upgrade?username=${username}&room=${room}`);

    // WebSocket event listeners
    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      console.log('Received message:', event.data);
      // Handle incoming messages from the server
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Cleanup function to close the WebSocket connection when the component is unmounted
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [changeRoom]);

  // Function to send a message to the WebSocket server
  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(msg);
    }
  };

  const testBackend = () =>{
    axios.get(`${api}/`).then((response)=>{
      console.log(response.data)
    }).catch((error)=>{
      console.log(error.response.data)
    })
  }

  return (
    <>
      <div className="chat chat-start">
        <div className="chat-bubble">It's over Anakin, <br/>I have the high ground.</div>
      </div>
      <div className="chat chat-end">
        <div className="chat-bubble">You underestimate my power!</div>
      </div>
      <input className="input input-bordered" value={room} onChange={(e)=>{setRoom(e.target.value)}}></input>
      <input className="input input-bordered" value={msg} onChange={(e)=>{setMsg(e.target.value)}}></input>
      <button className="btn btn-primary" onClick={sendMessage}>send ws</button>
      <button className="btn btn-primary" onClick={testBackend}>test backend</button>
      <button className="btn btn-primary" onClick={()=>{setChangeRoom(!changeRoom)}}>change room</button>
    </>
  )
}

export default App
