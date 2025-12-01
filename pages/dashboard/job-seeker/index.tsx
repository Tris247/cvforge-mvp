import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/layouts/DashboardLayout'

export default function JobSeekerDashboard() {
  const [cvs, setCvs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/cv/list')
      .then(r => r.json())
      .then(d => setCvs(d.cvs || []))
      .catch(console.error)
  }, [])

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-semibold">Job Seeker Dashboard</h2>
      <p className="mt-4">Your CVs</p>
      <ul className="mt-3 space-y-2">
        {cvs.map(cv => (
          <li key={cv.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{cv.title}</div>
                <div className="text-sm text-slate-400">{new Date(cv.createdAt || cv.createdAt || Date.now()).toLocaleString()}</div>
              </div>
              <div>
                <a className="btn" href={`/api/cv/download?id=${cv.id}`}>Download</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <a className="btn" href="/register">Create CV (quick)"</a>
      </div>
    </DashboardLayout>
  )
}
