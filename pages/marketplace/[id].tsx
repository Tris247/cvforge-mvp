import { useRouter } from 'next/router'
import useSWR from 'swr'
import { useState } from 'react'
import { useToast } from '../../components/ToastProvider'

const fetcher = (u:string)=> fetch(u).then(r=>r.json())

export default function GigDetails(){
  const router = useRouter()
  const { id } = router.query as { id?: string }
  const { data } = useSWR('/api/marketplace', fetcher)
  const items = data?.items || []
  const item = items.find((x:any)=> String(x.id) === String(id))

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const toast = useToast()

  async function apply(e:any){
    e.preventDefault();
    if(!item) return;
    const payload:any = { itemId: item.id, applicantName: name, message }
    if(cvFile){
      const buf = await cvFile.arrayBuffer()
      const binary = String.fromCharCode(...new Uint8Array(buf as any))
      const b = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(buf).toString('base64')
      payload.cvContent = b
      payload.cvName = cvFile.name
      payload.cvContentType = cvFile.type || 'application/octet-stream'
    }
    const r = await fetch('/api/marketplace/apply', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) })
    const j = await r.json()
    if(j.application) toast.show('Applied — good luck!', 'success')
    else toast.show(String(j.error || 'failed'), 'error')
  }

  if(!item) return <main className="container"><h1>Listing</h1><p style={{color:'#9aa4b2'}}>Loading…</p></main>

  return (
    <main className="container" style={{display:'grid', gridTemplateColumns:'2fr 320px', gap:20}}>
      <div>
        <h1>{item.title}</h1>
        <div style={{color:'#9aa4b2'}}>Offered by: {item.company || 'Freelancer'} — ${item.price || '—'}</div>
        <div style={{marginTop:12}}>{item.description}</div>
        <div className="card" style={{marginTop:12}}>
          <h3>Apply for this gig</h3>
          <form onSubmit={apply}>
            <label>Your name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} />
            <label style={{marginTop:8}}>Message</label>
            <textarea value={message} onChange={(e)=>setMessage(e.target.value)} />
            <label style={{marginTop:8}}>Attach CV (optional)</label>
            <input type="file" onChange={(e:any)=> setCvFile(e.target.files?.[0] || null)} />
            <div style={{marginTop:8}}><button className="btn" type="submit">Submit application</button></div>
          </form>
        </div>
      </div>

      <aside>
        <div className="card">
          <h4>Gig details</h4>
          <div style={{marginTop:8}}>Posted: {new Date(item.createdAt || Date.now()).toLocaleString()}</div>
        </div>
      </aside>
    </main>
  )
}
