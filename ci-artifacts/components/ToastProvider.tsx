import React, { createContext, useContext, useState, useCallback } from 'react'

type Toast = { id: string, message: string, type?: 'info'|'success'|'error' }

const ToastContext = createContext<any>(null)

export function useToast(){ return useContext(ToastContext) }

export default function ToastProvider({ children }:{ children: React.ReactNode }){
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message:string, type:'info'|'success'|'error'='info')=>{
    const id = String(Date.now())
    setToasts(t => [...t, { id, message, type }])
    setTimeout(()=> setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" style={{position:'fixed', right:16, bottom:16, display:'flex', flexDirection:'column', gap:8, zIndex:1000}}>
        {toasts.map(t => (
          <div key={t.id} style={{background: t.type==='error' ? '#ffdddd' : t.type==='success' ? '#e6ffed' : '#eef2ff', color:'#000', padding:'10px 14px', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
