import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const UP_DIR = path.resolve(process.cwd(), 'data', 'uploads')
function ensureDir(){ if(!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true }) }

async function tryParsePdf(buffer: Buffer){
  try{
    // test injection hook: tests can set globalThis.__TEST_PDF_PARSE to a function that
    // accepts a Buffer and returns { text } — this avoids delicate module mocking across
    // commonjs/esm boundaries in the test environment.
    if((globalThis as any).__TEST_PDF_PARSE){
      const r = await (globalThis as any).__TEST_PDF_PARSE(buffer)
      return r ? (r.text || '') : ''
    }
    // prefer dynamic import so test mocks from ESM test runners are respected
    let pdfParse: any
    try{ pdfParse = require('pdf-parse') }catch(e){}
    if(!pdfParse){ const mod = await import('pdf-parse'); pdfParse = mod && (mod.default || mod) }
    // debug: log what we found so tests show whether the mock was loaded
    // (kept minimal text to avoid leaking large buffers)
    const r = await pdfParse(buffer)
    return r ? (r.text || '') : ''
  }catch(e){ return null }
}

async function tryParseDocx(buffer: Buffer){
  try{
    // test injection hook: tests can set globalThis.__TEST_MAMMOTH to an object with
    // extractRawText({ buffer }) -> { value }
    if((globalThis as any).__TEST_MAMMOTH){
      const hook = (globalThis as any).__TEST_MAMMOTH
      const r = typeof hook === 'function' ? await hook({ buffer }) : await hook.extractRawText({ buffer })
      return r ? (r.value || '') : ''
    }
    // mammoth is a fairly small, server-friendly docx -> text extractor
    let mammoth: any
    try{ mammoth = require('mammoth') }catch(e){}
    if(!mammoth){ const mod = await import('mammoth'); mammoth = mod && (mod.default || mod) }
    // mammoth.extractRawText expects a buffer or array buffer
    const r = await mammoth.extractRawText({ buffer })
    return r ? (r.value || '') : ''
  }catch(e){ return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const { name, content, contentType } = req.body || {}
  if(!name || !content) return res.status(400).json({ error: 'name and content required' })

  ensureDir()
  const safe = `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
  const dest = path.join(UP_DIR, safe)

  try{
    // If contentType suggests text, save as utf-8; if not, treat content as base64 and save binary
    if(String(contentType||'').startsWith('text') || name.endsWith('.md') || name.endsWith('.txt')){
      fs.writeFileSync(dest, content, 'utf8')
      return res.status(200).json({ path: `/data/uploads/${safe}`, parsed: true, name: safe })
    }

    // try to decode base64 and save
    const buf = Buffer.from(String(content||''), 'base64')
    fs.writeFileSync(dest, buf)

    // try to parse pdf or docx and if we extract text save a .txt copy that AI can read server-side
    const ext = String(name || '').toLowerCase()
    let parsedText: string | null = null
    if(ext.endsWith('.pdf') || String(contentType||'').includes('pdf')) parsedText = await tryParsePdf(buf)
    if(!parsedText && (ext.endsWith('.docx') || String(contentType||'').includes('wordprocessingml')) ) parsedText = await tryParseDocx(buf)

    if(parsedText){
      const txtPath = dest + '.txt'
      fs.writeFileSync(txtPath, parsedText, 'utf8')
      // return the parsed text filepath so callers (AI) can read it easily
      return res.status(200).json({ path: `/data/uploads/${safe}.txt`, parsed: true, name: safe, text: parsedText })
    }

    return res.status(200).json({ path: `/data/uploads/${safe}`, parsed: !!parsedText, name: safe, text: parsedText || null })
  }catch(err){
    console.error('upload failed', err)
    return res.status(500).json({ error: 'failed to save' })
  }
}
