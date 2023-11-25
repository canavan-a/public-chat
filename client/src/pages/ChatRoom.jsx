import { useState, useRef, useEffect } from 'react'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ChatRoom = (props) =>{
    const navigate = useNavigate();

  const [api, setApi] = useState(import.meta.env.VITE_API_PATH);
  const ws = useRef(null);
  
  const queryParams = new URLSearchParams(location.search);
  const room = queryParams.get("r")

  const username = queryParams.get("un")

  const [msg, setMsg] = useState("")
  const [changeRoom, setChangeRoom] = useState(true)

  const [chat, setChat] = useState([]);

  useEffect(() => {
    console.log(username)
    console.log(room)
    ws.current = new WebSocket(`ws${api}/upgrade?username=${username}&room=${room}`);
    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };
    ws.current.onmessage = (event) => {
        console.log(event.data)
        const newMsg = JSON.parse(event.data)
        
        setChat(prev => [...prev, newMsg]);
    }
    ws.current.onclose = () => {
      navigate("/")
    };
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [changeRoom, username, room]);

  

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(msg);
    }
  };


    return(
        <>
        {chat.map((value, index)=>(
            <div key={index} className={value.username === username? "chat chat-end":"chat chat-start"}>
                <div className="chat-bubble">{value.msg}</div>
            </div>
        ))}

      <input className="input input-bordered input-success input-lg" value={msg} onChange={(e)=>{setMsg(e.target.value)}}></input>
    <button className='btn btn-primary' onClick={sendMessage}>Send</button>
        </>
    )
}

export default ChatRoom 