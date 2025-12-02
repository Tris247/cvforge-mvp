import Link from 'next/link'
import MarketplaceCard from '../components/MarketplaceCard'
import useSWR from 'swr'
const fetcher = (u: any) => fetch(u).then(r=>r.json())

function Avatar({ name }:{name?:string}){
  const initials = (name||'').split(' ').map(s=>s[0]||'').slice(0,2).join('').toUpperCase() || 'U'
  return <div style={{width:36,height:36, borderRadius:18, background:'#123', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>{initials}</div>
}

export default function Home(){
  const { data } = useSWR('/api/auth/me', fetcher)
  const user = data?.user

  return (
    <main className="container" style={{paddingTop:28}}>
        <section style={{display:'grid', gridTemplateColumns: '1fr 360px', gap:24, alignItems:'start'}}>
          <div>
            <h1 style={{margin:0}}>Build a CV that gets noticed</h1>
            <p style={{color:'#9aa4b2', marginTop:8}}>CVForge combines an intuitive editor with smart AI insights and job automation tools to help you apply faster and smarter. Upload your previous CVs or files into the editor and use our AI to create a polished, interview-ready CV.</p>

            <div style={{display:'flex', gap:12, marginTop:18}}>
              <Link href="/cv/editor" className="btn">Start building your CV</Link>
              <Link href="/jobs" className="btn" style={{background:'transparent', border:'1px solid rgba(255,255,255,0.06)'}}>Browse jobs</Link>
              <Link href="/marketplace" className="btn" style={{background:'#0b5', color:'#002'}}>Find a gig</Link>
            </div>

            <div className="card" style={{marginTop:18}}>
              <h3 style={{margin:0}}>Key features</h3>
              <ul style={{marginTop:8}}>
                <li>Fast edit + AI-powered rewrite (OpenAI) with local fallback</li>
                <li>Upload older CVs/files and merge them into AI suggestions</li>
                <li>Auto-apply workflow with worker & queue (file or Redis + BullMQ)
                </li>
                <li>Marketplace for short gigs — find or post small paid tasks</li>
              </ul>
            </div>
          </div>

          <aside>
            <div className="card" style={{padding:16}}>
              <strong>Get started</strong>
              <div style={{marginTop:8}}>New here? Use the CV editor to upload your past CV or paste content, then click <em>AI Rewrite</em> to get a polished result.</div>
              <div style={{marginTop:12}}>
                <Link href="/cv/editor" className="btn">Open CV Editor</Link>
              </div>
            </div>
            <div className="card" style={{marginTop:12, padding:12}}>
              <strong>Trending gigs</strong>
              <div style={{display:'grid', gridTemplateColumns: '1fr', gap:8, marginTop:8}}>
                <MarketplaceCard item={{ id: 'g1', title: 'Fix landing page accessibility', description: 'Small fixes to improve WCAG compliance', price: 75 }} />
                <MarketplaceCard item={{ id: 'g2', title: 'Optimize resume bullets', description: 'Improve 8 bullets for higher recruiter impact', price: 45 }} />
              </div>
            </div>
            <div className="card" style={{marginTop:12, padding:12}}>
              <div style={{fontWeight:700}}>Profile & Reports</div>
              <div style={{marginTop:6, fontSize:13, color:'#9aa4b2'}}>Sign in to save your CVs, manage your subscription and review application analytics.</div>
            </div>
          </aside>
        </section>
      </main>
  )
}
