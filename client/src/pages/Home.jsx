import { useState, useRef, useEffect } from 'react'

const Home = (props) =>{

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
      <button className="btn btn-primary btn-sm col-span-2">Go</button>
      </div>
      
    </div>
  </div>
</div>
    </>)
}

export default Home;