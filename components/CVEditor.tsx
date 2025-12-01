import { useState } from 'react'

export default function CVEditor(){
  const [content, setContent] = useState('')
  const [uploads, setUploads] = useState<Array<{name:string,type:string,text?:string,parsed:boolean, raw?: File | null}>>([])

  function addUploadedFile(f: File, text: string | null){
    setUploads(prev=> [{ name: f.name, type: f.type || 'unknown', text: text || undefined, parsed: !!text }, ...prev])
  }

  async function handleFiles(files: FileList | null){
    if(!files) return
    for(const f of Array.from(files)){
      // Only attempt to parse plain text & markdown files on client. PDFs and others are recorded but not parsed.
      if(f.type.startsWith('text') || f.name.endsWith('.md')){
        const txt = await f.text()
        addUploadedFile(f, txt)
      }else{
        // not parsed client-side (server-side parsing available for PDFs/DOCX)
        // keep the raw File so user can save binary files to server
        addUploadedFile(f, null)
      }
    }
  }

  async function saveFileToServer(i:number){
    const u = uploads[i]
    if(!u) return
    try{
      let body: any
      // if we already have parsed text, send as text
      if(u.parsed && u.text){ body = { name: u.name, content: u.text, contentType: 'text/plain' } }
      else if(u.raw){
        // read raw File and POST as base64 binary upload
        const ab = await u.raw.arrayBuffer()
        // browser-friendly base64 encoder from ArrayBuffer
        const bytes = new Uint8Array(ab)
        let binary = ''
        for(let k=0;k<bytes.byteLength;k++) binary += String.fromCharCode(bytes[k])
        const base64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(ab).toString('base64')
        body = { name: u.raw.name, content: base64, contentType: u.raw.type || 'application/octet-stream' }
      } else {
        alert('No raw file available to upload — try selecting the file again.')
        return
      }
      const r = await fetch('/api/uploads/upload', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) })
      const j = await r.json()
      if(r.ok){
        alert('Saved to server: ' + j.name)
        // update UI: replace this upload entry with parsed result returned by server
        setUploads(prev=> prev.map((item, idx)=> idx===i ? ({ ...item, parsed: !!j.parsed, name: j.name || item.name, text: j.text || item.text, raw: null }) : item))
      }
      else alert('Upload failed: ' + (j.error || r.status))
    }catch(e){ alert('Server upload failed ' + String(e)) }
  }
  return (
    <div>
      <label>Full name</label>
      <input placeholder="Your name" />

      <label style={{marginTop:8}}>CV content</label>
      <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Bullet points / experience" />

      <div style={{marginTop:8}}>
        <label style={{display:'block', fontWeight:600}}>Upload supporting CVs or files</label>
        <input type="file" multiple onChange={(e)=> handleFiles(e.target.files)} accept=".txt,.md,text/*,.pdf,.doc,.docx" />
        {uploads.length>0 && (
          <div style={{marginTop:8}}>
            <div style={{fontWeight:700}}>Uploaded files</div>
            <ul>
                {uploads.map((u, i)=>(
                  <li key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>{u.name} {u.parsed ? '(parsed)' : '(saved - not parsed)'}</div>
                    {(u.parsed || u.raw) && <button className="btn" onClick={()=> saveFileToServer(i)} style={{marginLeft:8}}>Save to server</button>}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{marginTop:8}}>
        <button className="btn" onClick={async ()=>{ localStorage.setItem('cv:content', content); alert('Saved locally') }}>Save locally</button>
        <button className="btn" style={{marginLeft:8}} onClick={async ()=>{
          // Merge uploaded text files into the content used by the AI rewrite
          const extra = uploads.filter(u=>u.parsed).map(u=> u.text ).join('\n\n')
          const body = { type: 'cv', content, uploadedTexts: extra }
          const r = await fetch('/api/ai/generate', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) })
          if(r.status === 401) return alert('Please log in to use the AI rewrite.')
          const j = await r.json(); if(j.suggestion) setContent(j.suggestion)
        }}>AI Rewrite</button>
        <button className="btn" style={{marginLeft:8}}>Generate PDF (stub)</button>
      </div>
    </div>
  )
}
