const backoff = async (fn, attempts=3, base=300) => {
  let t = base
  let err
  for(let i=0;i<attempts;i++){
    try{ return await fn() }catch(e){ err = e; await new Promise(r=>setTimeout(r, t)); t *= 2 }
  }
  throw err
}

async function callOpenAI(prompt, opts={}){
  // If no API key is configured, higher-level code expects `null` so it
  // can perform a local deterministic fallback.
  if(!process.env.OPENAI_API_KEY) return null

  // In CI or local dev it's common to set `OPENAI_API_KEY=test` to indicate
  // the service isn't actually available. Treat that sentinel value as a
  // simulated failure (reject) so callers exercise fallback behavior.
  if(process.env.OPENAI_API_KEY === 'test'){
    throw new Error('Simulated OpenAI failure for test API key')
  }
  try{
    const OpenAI = require('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await backoff(()=> client.chat.completions.create({ model: opts.model || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: opts.max_tokens || 600 }))
    const content = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content
    // attempt to read token usage from response (SDKs vary)
    const usage = r && (r.usage || r.usageTokens || r.usage_data) ? (r.usage?.total_tokens || r.usage?.totalTokens || null) : null
    return { content: content || null, usage: usage != null ? { total_tokens: Number(usage) } : null }
  }catch(e){
    // bubble up error to allow caller to fallback
    throw e
  }
}

module.exports = { callOpenAI }
