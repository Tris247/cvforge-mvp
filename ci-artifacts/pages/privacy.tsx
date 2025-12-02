export default function Privacy(){
  async function deleteDemo(){ if(!confirm('Delete demo data?')) return; await fetch('/api/data/delete',{method:'POST',headers:{'content-type':'application/json'},body: JSON.stringify({ mode:'user', userId:'demo-user', applicant: 'Prototype User' })}); alert('Done'); }
  return (
    <main className="container"><h1>Privacy</h1><div className="card" style={{marginTop:12}}><p style={{color:'#9aa4b2'}}>Prototype demo deletion</p><button className="btn" onClick={deleteDemo}>Delete demo data</button></div></main>
  )
}
