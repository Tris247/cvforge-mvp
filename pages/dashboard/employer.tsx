import DashboardSidebar from '../../components/DashboardSidebar'
import useSWR from 'swr'
import { useState } from 'react'
import { useToast } from '../../components/ToastProvider'

const fetcher = (u:string) => fetch(u).then(r=>r.json())

export default function EmployerDashboard(){
  const { data } = useSWR('/api/auth/me', fetcher)
  const user = data?.user

  const sampleJobs = [{ id:'j1', title: 'Frontend Dev - 2 week contract', applicants: 3 }]
  const { data: itemsData } = useSWR('/api/marketplace', (u:string)=> fetch(u).then(r=>r.json()))
  const items = itemsData?.items || []
  const owned = items.filter((it:any)=> it.ownerId && it.ownerId === user?.id)
  const [selected, setSelected] = useState<string | null>((owned[0]?.id) || null)

  const { data: appsData, mutate } = useSWR(() => selected ? `/api/marketplace/applicants?itemId=${selected}` : null, (u:string)=> fetch(u).then(r=>r.json()))
  const applications = appsData?.applications || []

  const [feedback, setFeedback] = useState<string | null>(null)
  const toast = useToast()
  const [cvOpen, setCvOpen] = useState(false)
  const [cvContent, setCvContent] = useState<string | null>(null)
  const [cvPathState, setCvPathState] = useState<string | null>(null)

  async function viewCV(cvId?: string){
    if(!cvId){ setCvContent('No CV attached'); setCvOpen(true); return }
    try{
      // best effort: ask the CV list API and find matching CV by id
      // if cvId looks like an upload path, fetch the server-side txt via API
      try{
        if(String(cvId).includes('/data/uploads') || String(cvId).endsWith('.txt')){
          const p = cvId.replace(/^\//,'')
          setCvPathState('/' + p)
          const r2 = await fetch(`/api/cv/preview?path=${encodeURIComponent(p)}`)
          if(r2.ok){ const j2 = await r2.json(); setCvContent(j2.text || ''); setCvOpen(true); return }
        }
      }catch(e){}
      // fallback to CV list lookup
      const r = await fetch('/api/cv/list')
      if(!r.ok){ setCvContent('CV not available'); setCvOpen(true); return }
      const j = await r.json()
      const found = (j.cvs||[]).find((c:any)=> String(c.id)===String(cvId))
      if(!found){ setCvContent('CV not found'); setCvOpen(true); return }
      setCvContent(JSON.stringify(found, null, 2))
      setCvOpen(true)
    }catch(e){ setCvContent('Failed to load CV'); setCvOpen(true) }
  }

  async function decide(id:string, decision:'accept'|'reject'){
    const ok = confirm(`Are you sure you want to ${decision} this applicant?`)
    if(!ok) return
    try{
      const r = await fetch(`/api/marketplace/applicants/${id}/decision`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ decision }) })
      const j = await r.json()
      if(r.ok){
        // optimistic update: refetch
        mutate()
        setFeedback(`${decision}ed application`)
        toast.show(`${decision}ed application`, 'success')
        setTimeout(()=> setFeedback(null), 2500)
      } else {
        toast.show(String(j.error || 'failed'), 'error')
      }
    }catch(e){ console.error(e); alert('failed') }
  }

  return (
    <>
    <main className="container" style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:20}}>
      <DashboardSidebar role="employer" />
      <div>
        <h1>Employer Dashboard</h1>
        <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:20}}>
          <div>
            <div className="card">
              <h3>Overview</h3>
              <div style={{marginTop:8}}>Manage postings, view applications and hire freelancers.</div>
            </div>

            <div className="card" style={{marginTop:12}}>
              <h3>Your Postings</h3>
              <div style={{marginTop:8}}>
                {owned.length===0 ? <div style={{color:'#9aa4b2'}}>You have no postings</div> : (
                  <ul>{owned.map((j:any)=> <li key={j.id} style={{padding:8, borderBottom:'1px solid rgba(255,255,255,0.03)'}}><strong>{j.title}</strong> — <button className="btn sm" onClick={()=> setSelected(j.id)}>View applicants</button></li>)}</ul>
                )}
              </div>
            </div>

            <div className="card" style={{marginTop:12}}>
              <h3>Marketplace applications</h3>
              {applications.length===0 ? <div style={{color:'#9aa4b2'}}>No applications yet</div> : (
                <ul>{applications.map((a:any)=> <li key={a.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:8, borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <div><strong>{a.applicantName || 'Applicant'}</strong> applied to <em>{a.itemId}</em> — {String(a.message).slice(0,140)} <div style={{color:'#9aa4b2', fontSize:12}}>status: {a.status || 'pending'}</div></div>
                  <div style={{display:'flex', gap:6}}>
                    <button className="btn" onClick={()=> viewCV(a.cvId)}>View CV</button>
                    <button className="btn" aria-label={`message-${a.id}`} onClick={async ()=>{
                      const msg = prompt('Write a message to the applicant:')
                      if(!msg) return
                      try{ const r = await fetch(`/api/marketplace/applicants/${a.id}/message`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ message: msg }) }); const j = await r.json(); if(r.ok){ mutate(); toast.show('Message sent', 'success') } else toast.show(String(j.error || 'failed'),'error') }catch(e){ toast.show('failed', 'error') }
                    }}>Message</button>
                    <button className="btn" aria-label={`hire-${a.id}`} onClick={()=> decide(a.id, 'accept')}>Hire</button>
                    <button className="btn outline" aria-label={`archive-${a.id}`} onClick={async ()=>{
                      const ok = confirm('Archive this application?')
                      if(!ok) return
                      try{ const r = await fetch(`/api/marketplace/applicants/${a.id}/archive`, { method:'POST' }); const j = await r.json(); if(r.ok){ mutate(); toast.show('Archived', 'info') } else toast.show(String(j.error || 'failed'), 'error') }catch(e){ toast.show('failed','error') }
                    }}>Archive</button>
                  </div>
                </li>)}</ul>
              )}
            </div>
          </div>

          <aside>
            <div className="card">
              <h4>Quick actions</h4>
              <div style={{display:'flex', gap:8}}>
                <button className="btn">Post a gig</button>
                <button className="btn">View applicants</button>
              </div>
              {feedback ? <div style={{marginTop:8, color:'#4bb543'}}>{feedback}</div> : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
    {cvOpen ? (
      <div role="dialog" aria-modal="true" aria-label="CV preview" style={{position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)'}}>
        <div style={{width:'80%', maxWidth:900, background:'#fff', color:'#000', padding:16, borderRadius:8}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3>CV Preview</h3>
            <button className="btn outline" onClick={()=> { setCvOpen(false); setCvPathState(null); setCvContent(null) }}>Close</button>
          </div>
          <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{cvContent}</pre>
          <div style={{marginTop:12}}>
            <a href={cvPathState || '#'} download className="btn sm">Download CV</a>
          </div>
        </div>
      </div>
    ) : null}
    </>
  )
}
