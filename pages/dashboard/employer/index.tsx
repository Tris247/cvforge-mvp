import React, { useState } from 'react'
import DashboardLayout from '../../../components/layouts/DashboardLayout'

export default function EmployerDashboard() {
  const [title, setTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    const resp = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, companyName, location, description }) })
    if (resp.ok) {
      alert('Job created')
      setTitle('')
      setCompanyName('')
      setLocation('')
      setDescription('')
    } else {
      const body = await resp.json()
      alert('Failed: ' + (body?.error || 'unknown'))
    }
  }

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-semibold">Employer Dashboard</h2>
      <form className="mt-4 space-y-3" onSubmit={createJob}>
        <div>
          <label className="block text-sm">Job title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Company</label>
          <input value={companyName} onChange={e=>setCompanyName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Location</label>
          <input value={location} onChange={e=>setLocation(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <div>
          <button className="btn" type="submit">Create job</button>
        </div>
      </form>
    </DashboardLayout>
  )
}
