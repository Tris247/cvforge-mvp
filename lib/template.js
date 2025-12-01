function escapeHtml(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch] || ch) }
exports.renderSimpleTemplate = function(content, name){
  const lines = String(content || '').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const bullets = lines.map(l=> `<li>${escapeHtml(l)}</li>`).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(name)} - CV</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0b1220}h1{margin:0;font-size:22px}ul{margin-top:12px;padding-left:20px}</style></head><body><h1>${escapeHtml(name)}</h1><ul>${bullets}</ul></body></html>`
}
