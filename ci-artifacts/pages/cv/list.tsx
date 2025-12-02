import useSWR from 'swr'
export default function CVList(){
  const fetcher = (u: string) => fetch(u).then(r=>r.json())
  const { data } = useSWR('/api/cv/list', fetcher)
  if(!data) return <div className="container"><p>Loading...</p></div>
  return (
    <main className="container">
      <h1>Saved CVs</h1>
      <div className="card" style={{marginTop:12}}>
        {data.cvs.length === 0 ? <p style={{color:'#9aa4b2'}}>No CVs yet</p> : (
          <ul>{data.cvs.map((c:any)=> (<li key={c.id} style={{padding:8,borderBottom:'1px solid rgba(255,255,255,0.03)'}}><strong>{c.title}</strong> <div style={{color:'#9aa4b2'}}>Saved: {new Date(c.createdAt).toLocaleString()}</div><pre style={{whiteSpace:'pre-wrap'}}>{String(c.content).slice(0,300)}</pre></li>))}</ul>
        )}
      </div>
    </main>
  )
}
