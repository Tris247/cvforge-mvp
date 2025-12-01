import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (u:any) => fetch(u).then(r=>r.json())

export default function AdminReconcile(){
  const [running, setRunning] = useState(false)
  const { data, mutate } = useSWR('/api/stripe/reconcile', fetcher, { revalidateOnFocus: false })

  async function run(){
    setRunning(true)
    const r = await fetch('/api/stripe/reconcile', { method: 'POST' })
    const j = await r.json()
    setRunning(false)
    mutate()
    alert('Reconcile ran: ' + JSON.stringify(j))
  }

  return (
    <main className="container">
      <h1>Admin — Stripe Reconcile</h1>
      <div className="card" style={{marginTop:12}}>
        <div>Run reconcile to sync Stripe subscriptions and invoices into DB.</div>
        <div style={{marginTop:12}}><button className="btn" onClick={run} disabled={running}>{running ? 'Running...' : 'Run reconcile'}</button></div>
        <pre style={{marginTop:12}}>{JSON.stringify(data,null,2)}</pre>
      </div>
    </main>
  )
}
