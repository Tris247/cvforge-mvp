import { useState } from 'react'
export default function Create(){
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('South Africa')
  const [description, setDescription] = useState('')
  async function submit(e: any){ e.preventDefault(); const r = await fetch('/api/jobs', {method:'POST', body: JSON.stringify({title,company,location,description}), headers:{'content-type':'application/json'}}); const j = await r.json(); if(j.id) window.location.href='/jobs'; }
  return (
    <main className="container">
      <h1>Post a job / micro-gig</h1>
      <form className="card" style={{marginTop:12}} onSubmit={submit}>
        <label>Title</label>
        <input value={title} onChange={(e)=>setTitle(e.target.value)} />
        <label style={{marginTop:8}}>Company</label>
        <input value={company} onChange={(e)=>setCompany(e.target.value)} />
        <label style={{marginTop:8}}>Location</label>
        <input value={location} onChange={(e)=>setLocation(e.target.value)} />
        <label style={{marginTop:8}}>Description</label>
        <textarea value={description} onChange={(e)=>setDescription(e.target.value)} />
        <div style={{marginTop:12}}><button className="btn" type="submit">Create job</button></div>
      </form>
    </main>
  )
}
