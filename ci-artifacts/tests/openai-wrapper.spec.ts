import { describe, it, expect, vi, afterEach } from 'vitest'

describe('lib/openai wrapper', ()=>{
  afterEach(()=> vi.resetAllMocks())

  it('returns null when no API key present', async ()=>{
    delete process.env.OPENAI_API_KEY
    const { callOpenAI } = await import('../lib/openai')
    const out = await callOpenAI('hello').catch(e=>null)
    expect(out).toBeNull()
  })

  it('attempts to call OpenAI and bubbles errors if present', async ()=>{
    process.env.OPENAI_API_KEY = 'test'
    // simulate openai client throwing on create
    vi.mock('openai', ()=> ({ default: function(){ return { chat: { completions: { create: async ()=> { throw new Error('boom') } } } } } }))
    const { callOpenAI } = await import('../lib/openai')
    await expect(async ()=> await callOpenAI('hi')).rejects.toThrow()
  })
})
