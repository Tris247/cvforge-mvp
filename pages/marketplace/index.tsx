import useSWR from 'swr'
import MarketplaceCard from '../../components/MarketplaceCard'

const fetcher = (u:string) => fetch(u).then(r=>r.json())

const sample = [
  { id: 'g1', title: 'Fix website accessibility issues', description: 'Short audit + fixes on landing page', price: 75, company: 'Freelance' },
  { id: 'g2', title: 'Write cover letter tailored to job', description: 'A polished 1-page cover for your role', price: 40, company: 'CVForge Pro' }
]

export default function Marketplace(){
  const { data } = useSWR('/api/marketplace', fetcher)
  const items = data?.items || sample

  return (
    <main className="container">
      <h1>Marketplace — short gigs & micro-tasks</h1>
      <p style={{color:'#9aa4b2'}}>Find or post small paid jobs and gigs that fit your schedule.</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12, marginTop:12}}>
        {items.map((it:any)=> <MarketplaceCard key={it.id} item={it} />)}
      </div>
    </main>
  )
}
