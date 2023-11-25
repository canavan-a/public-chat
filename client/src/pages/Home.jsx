import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

const Home = (props) => {

    const navigate = useNavigate()

    const [api, setApi] = useState(import.meta.env.VITE_API_PATH);
    const ws = useRef(null);

    const [changeRoom, setChangeRoom] = useState(true);

    const [rooms, setRooms] = useState([]);

    const [connected, setConnected] = useState("pending");

    const [username, setUsername] = useState("")
    const [room, setRoom] = useState("")

    const [usernameValid, setUsernameValid] = useState(true)
    const [roomValid, setRoomValid] = useState(true)
    const [firstPassUsername, setFirstPassUsername] = useState(true)
    const [firstPassRoom, setFirstPassRoom] = useState(true)

    const [toggle, setToggle] = useState(true);

    useEffect(()=>{
        if (!firstPassUsername){
            if (username.length > 0){
                setUsernameValid(true)
            }
            else{
                setUsernameValid(false)
            }
        }
        else{
            setFirstPassUsername(false)
        }
    },[username, toggle])

    useEffect(()=>{
        if (!firstPassRoom){
            if (room.length > 0){
                setRoomValid(true)
            }
            else{
                setRoomValid(false)
            }
        }
        else{
            setFirstPassRoom(false)
        }
    },[room])

    useEffect(() => {
        ws.current = new WebSocket(`ws${api}/rooms`);
        ws.current.onopen = () => {
            setConnected(true);
            console.log('WebSocket connection opened');
        };
        ws.current.onmessage = (event) => {
            console.log("message received");
            setRooms(JSON.parse(event.data.replaceAll("'", '"')));
        }
        ws.current.onclose = () => {
            setConnected(false);
            console.log("connection closed");
        };
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [changeRoom]);

    const enterRoom = () =>{
        if(username.length > 0 && room.length > 0){
            navigate(`/chat?r=${room}&un=${username}`)
        }
        else{
            
        }
        
    }

    return (
        <>

            <div className="hero min-h-screen bg-base-200">
                <div className="hero-content flex-col lg:flex-row">
                    <img src="https://s3.amazonaws.com/static.projectbly.com/uploads/photos/photo/filename/160/lookbook_photo.jpg" className="max-w-sm rounded-lg shadow-2xl" />
                    <div>
                        <h1 className="text-5xl font-bold">Public Chat</h1>
                        <p className="py-6">No messages are never stored or cached. </p>
                        <div className="grid grid-cols-4 max-w-md gap-4">
                            <div className="grid grid-cols-6 gap-4 col-span-2">
                                <input className={`input input-bordered input-sm col-span-6 ${usernameValid?'':'input-error'}`} value={username} onChange={(e)=>{setUsername(e.target.value)}} placeholder='username'></input>
                                <input className={`input input-bordered input-sm col-span-6 ${roomValid?'':'input-error'}`} value={room} onChange={(e)=>{setRoom(e.target.value)}} placeholder='room'></input>
                                {/* <div className="col-span-2"></div> */}
                                {connected==="pending"?(<button className="btn btn-glass btn-sm col-span-3">loading</button>):(
                                <>{connected ? (
                                    <button className="btn btn-primary btn-sm col-span-3" onClick={enterRoom}>Go</button>
                                ) : (
                                    <button className="btn btn-warning btn-sm col-span-3" onClick={() => { setChangeRoom(!changeRoom) }}>reconnect</button>
                                )}
                                </>)}
                            </div>
                            {rooms.length !== 0?(
                            <div className="simplebar grid grid-cols-6 gap-1 col-span-2 overflow-y-scroll overflow-x-hidden max-h-40 ">
                            
                                    {rooms.map((value,index)=>(
                                        <RoomInstance key={value} setFirstPassUsername={setFirstPassUsername} name={value} room={room} setRoom={setRoom} toggle={toggle} setToggle={setToggle} />
                                    ))}

                            </div>
                            ):(<></>)}

                        </div>


                    </div>
                </div>
            </div>
        </>)
}


const RoomInstance = (props) =>{
    const {name} = props;
    const {room, setRoom} = props;
    const {toggle, setToggle} = props;
    const {setFirstPassUsername} = props

    return(
        <button onClick={()=>{setRoom(name); setFirstPassUsername(false); setToggle(!toggle);}} className={`btn btn-outline btn-sm mr-4 col-span-6 ${ room === name ?"btn-primary":""}`}>{name}</button>
    )
}

export default Home;