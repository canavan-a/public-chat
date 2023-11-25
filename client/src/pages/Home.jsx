import { useState, useRef, useEffect } from 'react'

const Home = (props) =>{

    const [api, setApi] = useState(import.meta.env.VITE_API_PATH);
    const ws = useRef(null);

    const [changeRoom, setChangeRoom] = useState(true);

    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        ws.current = new WebSocket(`ws${api}/rooms`);
        ws.current.onopen = () => {
          console.log('WebSocket connection opened');
        };
        ws.current.onmessage = (event) => {
            console.log("message received");
            setRooms(JSON.parse(event.data.replaceAll("'",'"')));
        }
        ws.current.onclose = () => {
          console.log("connection closed");
        };
        return () => {
          if (ws.current) {
            ws.current.close();
          }
        };
      }, [changeRoom]);

    return (
    <>
    
    <div className="hero min-h-screen bg-base-200">
  <div className="hero-content flex-col lg:flex-row">
    <img src="https://s3.amazonaws.com/static.projectbly.com/uploads/photos/photo/filename/160/lookbook_photo.jpg" className="max-w-sm rounded-lg shadow-2xl" />
    <div>
      <h1 className="text-5xl font-bold">Public Chat</h1>
      <p className="py-6">No messages are never stored or cached. </p>
      <div className="grid grid-cols-6 gap-4">
      <input className="input input-bordered input-sm col-span-4" placeholder='username'></input>
      <input className="input input-bordered input-sm col-span-4" placeholder='room'></input>
      {/* <div className="col-span-2"></div> */}
      <button className="btn btn-primary btn-sm col-span-2" onClick={()=>{setChangeRoom(!changeRoom)}}>Go</button>
      </div>
      
    </div>
  </div>
</div>
    </>)
}

export default Home;