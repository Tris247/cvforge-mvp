import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/router'

const fetcher = (u:any)=> fetch(u).then(r=>r.json())

function Avatar({ name }:{name?:string}){
  const initials = (name||'').split(' ').map(s=>s[0]||'').slice(0,2).join('').toUpperCase() || 'U'
  return <div style={{width:36,height:36, borderRadius:18, background:'#123', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>{initials}</div>
}

export default function Header(){
  const { data } = useSWR('/api/auth/me', fetcher)
  const user = data?.user
  const [open, setOpen] = useState(false)
  const { data: notifsData } = useSWR(user ? '/api/notifications' : null, fetcher)
  const notifications = notifsData?.notifications || []
  const router = useRouter()

  async function handleLogout(){
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <div style={{width:40, height:40, background:'#0b5', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#002', fontWeight:800}}>CV</div>
        <div>
          <div style={{fontWeight:800}}>CVForge</div>
          <div style={{fontSize:12, color:'#9aa4b2'}}>CV builder & jobs</div>
        </div>
      </div>

      <nav style={{display:'flex', gap:16, alignItems:'center'}}>
        <Link href="/">Home</Link>
        <Link href="/jobs">Jobs</Link>
        <Link href="/cv/editor">Editor</Link>
        <Link href="/marketplace">Marketplace</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/account">Account</Link>
      </nav>

      <div style={{position:'relative'}}>
        {!user ? (
          <Link href="/login" className="btn">Sign in</Link>
        ) : (
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700}}>{user.name || user.email}</div>
              <div style={{fontSize:12, color:'#9aa4b2'}}>{user.email}</div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <div style={{position:'relative'}}>
                <button aria-label="notifications" onClick={async ()=>{ setOpen(!open); }} className="btn sm">🔔{notifications.length? ` ${notifications.length}` : ''}</button>
              </div>
            </div>
            <div onClick={()=> setOpen(!open)} style={{cursor:'pointer'}}>
              <Avatar name={user.name || user.email} />
            </div>

            {open && (
              <div style={{position:'absolute', right:0, top:48, background:'#0a0a0a', padding:8, border:'1px solid rgba(255,255,255,0.03)', borderRadius:6, width:280}}>
                <div style={{padding:8, borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <strong>Notifications</strong>
                  {notifications.length===0 ? <div style={{color:'#9aa4b2', marginTop:6}}>No new notifications</div> : (
                    <ul style={{marginTop:6}}>{notifications.slice(0,6).map((n:any)=> <li key={n.id} style={{padding:6, fontSize:13, borderBottom:'1px dashed rgba(255,255,255,0.03)'}}><strong style={{display:'block'}}>{n.type}</strong><span style={{color:'#9aa4b2'}}>{String((n.payload && n.payload.text) || JSON.stringify(n.payload)).slice(0,80)}</span></li>)}</ul>
                  )}
                </div>
                <div style={{padding:8}}><Link href="/account">Profile</Link></div>
                <div style={{padding:8}}><Link href="/account/subscription">Subscription</Link></div>
                <div style={{padding:8}}><Link href="/account/autoapply">Auto-apply</Link></div>
                <div style={{padding:8}}><Link href="/dashboard">Your dashboard</Link></div>
                <div style={{padding:8}}><Link href="/dashboard/employer">Employer dashboard</Link></div>
                <div style={{padding:8, borderTop:'1px solid rgba(255,255,255,0.03)'}}><button className="btn" onClick={handleLogout}>Sign out</button></div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
