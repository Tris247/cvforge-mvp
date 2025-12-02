import React from 'react'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 p-4">
        <div className="container flex items-center justify-between">
          <Link href="/">CVForge</Link>
          <nav className="space-x-4">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/account">Account</Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">
        <div className="grid grid-cols-4 gap-6">
          <aside className="col-span-1">
            <div className="card">
              <ul className="space-y-2">
                <li><Link href="/dashboard">Overview</Link></li>
                <li><Link href="/dashboard/job-seeker">Job seeker</Link></li>
                <li><Link href="/dashboard/employer">Employer</Link></li>
                <li><Link href="/dashboard/admin">Admin</Link></li>
              </ul>
            </div>
          </aside>
          <section className="col-span-3">
            <div className="card">{children}</div>
          </section>
        </div>
      </main>
    </div>
  )
}
