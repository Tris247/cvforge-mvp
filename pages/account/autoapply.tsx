import useSWR from 'swr'
import { useState, useEffect } from 'react'
const fetcher = (u: string) => fetch(u).then(r=>r.json())
export default function AutoApply(){
  const { data: cvs } = useSWR('/api/cv/list', fetcher)
  const { data: jobs } = useSWR('/api/jobs', fetcher)
  const { data: me } = useSWR('/api/auth/me', fetcher)
  const [selectedCv, setSelectedCv] = useState('')
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])

  useEffect(()=>{
    if(me !== undefined && !me?.user) window.location.href = '/login'
  },[me])

  async function enqueue(){
    if(!selectedCv || selectedJobs.length===0) return alert('pick CV and jobs')
    // server will derive user from cookie - do not supply userId from client
    for(const id of selectedJobs){ await fetch('/api/autoapply/enqueue',{method:'POST',headers:{'content-type':'application/json'},body: JSON.stringify({jobId:id, cvId:selectedCv})}) }
    alert('enqueued')
  }

  function handleJobToggle(id: string, checked: boolean){
    setSelectedJobs(s => checked ? [...s, id] : s.filter(x => x !== id))
  }

  return (
    <main className="container">
      <h1>Auto-apply (prototype)</h1>
      <div className="card" style={{marginTop:12}}>
        <div>
          <label>Choose CV</label>
          <select onChange={(e)=>setSelectedCv(e.target.value)} style={{display:'block'}}>
            <option value="">-- choose --</option>
            {cvs?.cvs?.map((c: any)=> <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div style={{marginTop:12}}>
          <label>Select jobs</label>
          <div style={{maxHeight:220, overflow:'auto', border:'1px solid rgba(255,255,255,0.03)', padding:8}}>
            {jobs?.jobs?.map((j: any)=> (
              <div key={j.id} style={{padding:6}}>
                <input type="checkbox" value={j.id} onChange={(e: any)=>{ handleJobToggle(j.id, e.target.checked) }} />
                <strong style={{marginLeft:8}}>{j.title}</strong>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:12}}>
          <button className="btn" onClick={enqueue}>Enqueue auto-apply</button>
          <button className="btn" onClick={()=>fetch('/api/autoapply/process')}>Process (worker)</button>
        </div>
      </div>
    </main>
  )
}
