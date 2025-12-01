import { useState } from 'react'
import { useRouter } from 'next/router'

export default function CreateGig(){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(50)
  const [company, setCompany] = useState('')
  const router = useRouter()

  async function submit(e:any){
    e.preventDefault()
    const res = await fetch('/api/marketplace', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ title, description, price, company }) })
    const j = await res.json()
    if(j.item) router.push('/marketplace')
  }

  return (
    <main className="container">
      <h1>Post a gig</h1>
      <form className="card" style={{marginTop:12}} onSubmit={submit}>
        <label>Title</label>
        <input value={title} onChange={(e)=>setTitle(e.target.value)} />

        <label style={{marginTop:8}}>Company / Owner</label>
        <input value={company} onChange={(e)=>setCompany(e.target.value)} />

        <label style={{marginTop:8}}>Description</label>
        <textarea value={description} onChange={(e)=>setDescription(e.target.value)} />

        <label style={{marginTop:8}}>Price (USD)</label>
        <input type="number" value={price} onChange={(e)=>setPrice(Number(e.target.value))} />

        <div style={{marginTop:12}}><button className="btn" type="submit">Post gig</button></div>
      </form>
    </main>
  )
}
