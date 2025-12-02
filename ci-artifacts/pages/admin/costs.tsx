import React, { useEffect, useState } from 'react'

export default function AdminCosts(){
  const [data, setData] = useState<any>(null)
  useEffect(()=>{ fetch('/api/admin/costs').then(r=>r.json()).then(setData).catch(()=>{}) }, [])
  if(!data) return <div>Loading costs...</div>
  return (
    <div style={{ padding: 24 }}>
      <h1>Cost & Revenue Summary (last {data.days} days)</h1>
      <p><strong>OpenAI tokens:</strong> {data.tokens}</p>
      <p><strong>Estimated OpenAI cost:</strong> ${data.estimatedOpenAICost.toFixed(4)}</p>
      <p><strong>Revenue (paid invoices):</strong> ${data.revenue}</p>
      <p><strong>Net (revenue - estimated AI cost):</strong> ${ (data.revenue - data.estimatedOpenAICost).toFixed(4) }</p>
    </div>
  )
}
