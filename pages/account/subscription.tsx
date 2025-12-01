import useSWR from 'swr'
import { useEffect } from 'react'
import { useState } from 'react'
const fetcher = (u: string) => fetch(u).then(r=>r.json())
export default function Subscription(){
  const { data: me } = useSWR('/api/auth/me', fetcher)
  const user = me?.user
  const [busyTier, setBusyTier] = useState<string|null>(null)
  useEffect(()=>{
    if(me !== undefined && !user) window.location.href = '/login'
  },[me, user])
  const { data, mutate } = useSWR(user ? `/api/subscriptions/status` : null, fetcher)
  const { data: stripeConfig } = useSWR('/api/stripe/config', fetcher)
  const tiers = [ {id:'free', name:'Free'}, {id:'starter', name:'Starter'}, {id:'pro', name:'Pro'} ]
    async function buy(tierId: string){
      setBusyTier(tierId)
      const currentTier = data?.subscription?.tier
      let r: Response
      if(currentTier && currentTier !== tierId){
        r = await fetch('/api/subscriptions/upgrade', { method: 'POST', body: JSON.stringify({ tier: tierId }), headers: {'content-type':'application/json'} })
      }else{
        // Try Stripe first
        r = await fetch('/api/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify({ tier: tierId }), headers: {'content-type':'application/json'} })
      }

      let j: any = {}
      try{ j = await r.json() }catch(e){ j = {} }
      if(j?.url){
        // If Stripe returned a real URL we navigate there
        if(!j?.demo) { setBusyTier(null); location.href = j.url; return }
      }

      // Fallback to local file-backed subscription
      const res2 = await fetch('/api/subscriptions/checkout', { method: 'POST', body: JSON.stringify({ tier: tierId }), headers: {'content-type':'application/json'} })
      setBusyTier(null)
      let s: any = {}
      try{ s = await res2.json() }catch(e){ s = {} }
      mutate()
      if(j?.demo || s?.demo) alert('Subscribed: ' + tierId + ' (demo checkout)')
      else alert('Subscribed: ' + tierId)
    }
  return (
    <main className="container">
      <h1>Subscription (prototype)</h1>
      <div className="card" style={{marginTop:12}}>
        {!user ? (
          <div style={{color:'#f88'}}>You must <a href="/login">login</a> to manage subscriptions.</div>
        ) : (
          <div>User: {me?.user?.email}</div>
        )}
        <div style={{marginTop:8}}>Current: {data?.subscription?.tier ?? 'None'}</div>
        {stripeConfig && !stripeConfig.stripeConfigured && (
          <div style={{marginTop:8, padding:8, background:'#222', borderRadius:4}}>⚠️ Stripe not configured — running in demo mode (local checkout + DB persistence)</div>
        )}
        {data?.subscription && (
          <div style={{marginTop:8}}>
            <div>Active: {data.subscription.active ? 'Yes' : 'No'}</div>
            <div>Status: {data.subscription.status ?? 'N/A'}</div>
            {data.subscription.stripeSubscriptionId && <div>Stripe Sub: {data.subscription.stripeSubscriptionId}</div>}
            {data.subscription.stripePriceId && <div>Price: {data.subscription.stripePriceId}</div>}
            {data.subscription.trialEnd && <div>Trial ends: {new Date(data.subscription.trialEnd).toLocaleString()}</div>}
            {data.subscription.currentPeriodStart && <div>Period start: {new Date(data.subscription.currentPeriodStart).toLocaleString()}</div>}
            {data.subscription.currentPeriodEnd && <div>Period end: {new Date(data.subscription.currentPeriodEnd).toLocaleString()}</div>}
            {data.subscription.stripeSessionId && <div>Stripe Session: {data.subscription.stripeSessionId}</div>}
            <div style={{marginTop:8}}>
              <button className="btn" onClick={async ()=>{
                // open Stripe billing portal (server will create session and return url)
                if(!stripeConfig?.stripeConfigured) return alert('Stripe not configured — no billing portal available in demo mode')
                const r = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
                if(!r.ok){ const j = await r.json(); return alert('Portal failed: ' + (j?.error || r.status)) }
                const j = await r.json(); if(j.url) window.location.href = j.url
              }}>Manage billing</button>
            </div>
            {data.subscription.active && (
              <div style={{marginTop:8}}>
                <button className="btn" onClick={async ()=>{
                  if(!confirm('Cancel subscription?')) return
                  const r = await fetch('/api/subscriptions/cancel', { method: 'POST' })
                  if(!r.ok) return alert('Failed to cancel')
                  mutate()
                  alert('Subscription cancelled')
                }}>Cancel subscription</button>
              </div>
            )}
            {!data.subscription.active && (
              <div style={{marginTop:8}}>
                <button className="btn" onClick={async ()=>{
                  if(!confirm('Reactivate subscription?')) return
                  const r = await fetch('/api/subscriptions/reactivate', { method: 'POST' })
                  if(!r.ok) return alert('Failed to reactivate')
                  mutate()
                  alert('Subscription reactivated')
                }}>Reactivate subscription</button>
              </div>
            )}
          </div>
        )}
        <div style={{display:'flex', gap:8, marginTop:12}}>{tiers.map(t=> <div key={t.id} style={{padding:8,border:'1px solid rgba(255,255,255,0.03)'}}><div style={{fontWeight:700}}>{t.name}</div><div style={{marginTop:8}}><button className="btn" onClick={()=>buy(t.id)} disabled={!user}>Choose</button></div></div>)}</div>
      </div>
    </main>
  )
}
