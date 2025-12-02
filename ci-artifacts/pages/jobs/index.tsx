import React, { useEffect, useState } from 'react'

type Job = { id: string; title: string; companyName?: string; location?: string; description?: string }

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(data => setJobs(data.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function onApply(jobId: string) {
    const resp = await fetch('/api/autoapply/enqueue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) })
    if (resp.ok) alert('Enqueued for auto-apply')
    else alert('Failed to enqueue')
  }

  return (
    <main className="container">
      <h1 className="text-2xl font-semibold">Jobs</h1>
      {loading ? <p>Loading…</p> : (
        <ul className="space-y-4 mt-4">
          {jobs.map(j => (
            <li key={j.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{j.title}</h3>
                  <div className="text-sm text-slate-400">{j.companyName} — {j.location}</div>
                </div>
                <div>
                  <button className="btn" onClick={() => onApply(j.id)}>Apply</button>
                </div>
              </div>
              {j.description && <p className="mt-2 text-sm text-slate-300">{j.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
import useSWR from 'swr'
import { useState } from 'react'
const fetcher = (url: string) => fetch(url).then(r=>r.json())
export default function Jobs(){
  const { data } = useSWR('/api/jobs', fetcher)
  const [q, setQ] = useState('')
  const jobs = data?.jobs || []
  const filtered = q ? jobs.filter((j: any)=> (j.title + ' ' + (j.description||'')).toLowerCase().includes(q.toLowerCase())) : jobs
  return (
    <main className="container"><h1>Jobs & Micro-gigs</h1>
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', gap:8}}>
          <input placeholder="Search jobs" value={q} onChange={(e)=>setQ(e.target.value)} />
          <a className="btn" href="/jobs/create">Post job</a>
        </div>
        <div style={{marginTop:12}}>
          {filtered.length===0 ? <p style={{color:'#9aa4b2'}}>No jobs yet</p> : (
            <ul>{filtered.map((j:any)=> (<li key={j.id} style={{padding:10,borderBottom:'1px solid rgba(255,255,255,0.03)'}}><div style={{display:'flex',justifyContent:'space-between'}}><div><strong>{j.title}</strong><div style={{color:'#9aa4b2'}}>{j.company} • {j.location}</div></div><div><button className="btn">Apply (proto)</button></div></div><div style={{marginTop:8}}>{j.description}</div></li>))}</ul>
          )}
        </div>
      </div>
    </main>
  )
}
