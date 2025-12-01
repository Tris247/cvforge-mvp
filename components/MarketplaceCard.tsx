export default function MarketplaceCard({ item }:{ item: any }){
  return (
    <div className="card" style={{padding:12, minWidth:220}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontWeight:700}}>{item.title}</div>
          <div style={{fontSize:12, color:'#9aa4b2'}}>{item.company || 'Freelancer'}</div>
        </div>
        <div style={{fontWeight:800, color:'#0b5'}}>${item.price || '50'}</div>
      </div>
      <div style={{marginTop:8, fontSize:13}}>{String(item.description).slice(0,140)}</div>
      <div style={{marginTop:10, display:'flex', justifyContent:'space-between'}}>
        <a href={`/marketplace/${item.id}`} className="btn">View</a>
        <a href={`/marketplace/${item.id}`} className="btn" style={{background:'#0b5', color:'#002'}}>Apply</a>
      </div>
    </div>
  )
}
