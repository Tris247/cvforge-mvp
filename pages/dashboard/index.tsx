import React from 'react'
import DashboardLayout from '../../components/layouts/DashboardLayout'

export default function DashboardHome() {
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
      <p className="mt-4">Welcome to your dashboard. Use the sidebar to navigate.</p>
    </DashboardLayout>
  )
}
import useSWR from 'swr'
import DashboardSidebar from '../../components/DashboardSidebar'
import CVPreview from '../../components/CVPreview'

const fetcher = (u:string)=> fetch(u).then(r=>r.json())

export default function Dashboard(){
  const { data } = useSWR('/api/auth/me', fetcher)
  const user = data?.user

  // sample static data for quick view
  const sampleCvs = [ { id: 'cv1', title: 'Senior Engineer CV', content: '• built X\n• shipped Y' } ]

  return (
    <main className="container" style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:20}}>
      <DashboardSidebar />
      <div>
        <h1>Dashboard</h1>
        <div style={{display:'grid', gridTemplateColumns: '1fr 320px', gap:20}}>
          <div>
            <div className="card">
              <h3>Welcome back{user?.name ? (', ' + user.name) : ''}</h3>
              <div style={{marginTop:8}}>Quick actions: <button className="btn">AI Rewrite</button> <button className="btn">Upload CV</button></div>
            </div>

            <div className="card" style={{marginTop:12}}>
              <h3>Your CVs</h3>
              <ul style={{marginTop:8}}>
                {sampleCvs.map((c:any)=> <li key={c.id} style={{padding:8, borderBottom:'1px solid rgba(255,255,255,0.03)'}}>{c.title}</li>)}
              </ul>
            </div>

            <div className="card" style={{marginTop:12}}>
              <h3>Recent applications</h3>
              <p style={{color:'#9aa4b2'}}>No recent applications yet — try auto-apply or apply to gigs from the marketplace</p>
            </div>
          </div>

          <aside>
            <div className="card">
              <h4>Preview CV</h4>
              <CVPreview content={sampleCvs[0].content} name={user?.name || 'Candidate'} />
            </div>

            <div className="card" style={{marginTop:12}}>
              <h4>Account</h4>
              <div style={{fontSize:13}}>Email: {user?.email}</div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
