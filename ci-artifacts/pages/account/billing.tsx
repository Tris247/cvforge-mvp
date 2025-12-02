import useSWR from 'swr'

const fetcher = (u:any) => fetch(u).then(r=>r.json())

export default function Billing(){
  const { data } = useSWR('/api/stripe/invoices', fetcher)
  const invoices = data?.invoices || []

  return (
    <main className="container">
      <h1>Billing / Invoices</h1>
      <div className="card" style={{marginTop:12}}>
        {invoices.length === 0 ? (
          <div style={{color:'#9aa4b2'}}>No invoices available.</div>
        ) : (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Link</th></tr></thead>
            <tbody>
              {invoices.map((inv:any)=>(
                <tr key={inv.id || inv.invoice_pdf || inv.number} style={{borderTop:'1px solid rgba(255,255,255,0.03)'}}>
                  <td>{inv.created ? new Date(inv.created*1000).toLocaleString() : (inv.createdAt ? new Date(inv.createdAt).toLocaleString(): '')}</td>
                  <td>{(inv.amount_due || inv.amount_paid || inv.total || 0)/100} {inv.currency || ''}</td>
                  <td>{inv.status || 'unknown'}</td>
                  <td>{inv.hosted_invoice_url ? <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">View</a> : (inv.invoicePdf ? <a href={inv.invoicePdf} target="_blank" rel="noreferrer">PDF</a> : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
