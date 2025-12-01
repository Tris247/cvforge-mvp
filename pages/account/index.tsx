import React from 'react'
import { useSession, signOut } from 'next-auth/react'

export default function AccountPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div>Loading…</div>
  if (!session) return <div>Not signed in</div>

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <h1>Account</h1>
      <p>Signed in as: <strong>{session.user?.email}</strong></p>
      <p>Role: <strong>{(session.user as any)?.role || 'n/a'}</strong></p>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
      </div>
    </main>
  )
}
