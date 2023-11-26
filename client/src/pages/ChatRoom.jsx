import { useState, useRef, useEffect } from 'react'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ChatRoom = (props) => {
  const navigate = useNavigate();

  const [wsApi, setWsApi] = useState(import.meta.env.VITE_WS_PATH);
  const ws = useRef(null);
  const scrollableContent = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const room = queryParams.get("r")

  const username = queryParams.get("un")

  const [msg, setMsg] = useState("")
  const [changeRoom, setChangeRoom] = useState(true)

  const [chat, setChat] = useState([]);

  useEffect(() => {
    console.log(username)
    console.log(room)
    console.log(window.location.hostname)
    ws.current = new WebSocket(`wss://${window.location.hostname}/upgrade?username=${username}&room=${room}`);
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


  const handleEnterKeyPress = (event) => {
    if (event.key === 'Enter') {
      // If Enter key is pressed, trigger the button click
      sendMessage()
    }
  };

  const sendMessage = async () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && msg != "") {
      ws.current.send(msg);
      setMsg("");
    }
  };

  const scrollToBottom = () => {
    if (scrollableContent.current) {
      scrollableContent.current.scrollTop = scrollableContent.current.scrollHeight;
    }
  };
  
  useEffect(()=>{
    scrollToBottom()
  },[chat])

  return (
    <>
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content flex-col lg:flex-col w-[100%] mx-auto ">
        <h1 className="text-5xl font-bold text-center">{room}</h1>
          <div className="card w-[50%] bg-base-100 shadow-xl">
          
            <div className="card-body">
              <div 
              ref={scrollableContent}
              className="h-96 overflow-y-scroll overflow-x-hidden">
                <div className="grid grid-cols-1">
                {chat.map((value, index) => (
                  <div className="col">
                    
                    <div key={index} className={value.username === username ? "chat chat-end" : "chat chat-start flex flex-col"}>

                      {value.username === username ?(<></>):(<div className="badge badge-sm mb-1">{value.username}</div>)}
                      <div className={`chat-bubble max-w-30 break-words ${value.username === username ? "chat-bubble-primary":"chat-bubble-secondary" }`}>{value.msg}</div>
                    </div>
                  </div>
                ))}
                </div>

              </div>
              <div className="grid grid-cols-12 gap-x-2">
                <input className="input input-bordered input-success input-md col-span-10" 
                        placeholder={"type something here"} 
                        value={msg}
                        onKeyDown={handleEnterKeyPress}
                        onChange={(e) => { setMsg(e.target.value) }}></input>
                <button className='btn btn-primary col-span-2' onClick={sendMessage}>Send</button>
              </div>
            </div>
            
            
          </div>
        </div>
      </div>


      
    </>
  )
}

export default ChatRoom 