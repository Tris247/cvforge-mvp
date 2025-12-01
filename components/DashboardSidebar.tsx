import Link from 'next/link'

export default function DashboardSidebar({ role = 'user' }:{ role?: 'user'|'employer' }){
  return (
    <aside style={{width:240}}>
      <div style={{padding:12, background:'#0b0b0b', borderRadius:8}}>
        <nav style={{display:'flex', flexDirection:'column', gap:8}}>
          <Link href="/dashboard">Overview</Link>
          <Link href="/cv/list">CVs</Link>
          <Link href="/dashboard?view=ai">AI Tools</Link>
          <Link href="/applications">Applications</Link>
          {role === 'employer' && (
            <>
              <Link href="/dashboard/employer">Postings</Link>
              <Link href="/dashboard/employer?view=profile">Profile</Link>
            </>
          )}
        </nav>
      </div>
    </aside>
  )
}
