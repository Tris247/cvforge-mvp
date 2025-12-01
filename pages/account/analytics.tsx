import useSWR from 'swr'
import { useEffect } from 'react'

export default function Analytics(){ const { data } = useSWR('/api/analytics/summary', u=> fetch(u).then(r=>r.json())); const { data: me } = useSWR('/api/auth/me', u=> fetch(u).then(r=>r.json()));
  useEffect(()=>{ if(me !== undefined && !me?.user) window.location.href = '/login' },[me])
  if(!data) return <div className="container"><p>Loading...</p></div>
  return (<main className="container"><h1>Analytics</h1><div className="card" style={{marginTop:12}}><div>Total applications: {data.totalApplications}</div><div style={{marginTop:6}}>CVs: {data.perCv?.length ?? 0}</div></div></main> ) }
