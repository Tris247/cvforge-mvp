import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { redirect: false, email, password })
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    // successful
    router.push('/account')
  }

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '1rem' }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div style={{ marginTop: 12 }}>
        <a href="/register">Create an account</a>
      </div>
    </main>
  )
}
import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Login(){
  const [email, setEmail] = useState('demo@cvforge.local')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: any){
    e.preventDefault(); setLoading(true)
    const res = await fetch('/api/auth/login', { method:'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ email }) })
    const j = await res.json(); setLoading(false)
    if(j.ok) router.push('/account')
    else alert('Login failed')
  }

  return (
    <main className="container">
      <h1>Login</h1>
      <div className="card" style={{marginTop:12}}>
        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} />

          <div style={{marginTop:12}}>
            <button className="btn" type="submit" disabled={loading}>{loading? 'Signing in...' : 'Sign in'}</button>
          </div>
        </form>
      </div>
    </main>
  )
}
