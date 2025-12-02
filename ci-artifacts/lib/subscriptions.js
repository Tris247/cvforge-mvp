const fs = require('fs'), path = require('path'); const FILE = path.resolve(process.cwd(),'data','subscriptions.json');
function ensure(){ const d = path.dirname(FILE); if(!fs.existsSync(d)) fs.mkdirSync(d); if(!fs.existsSync(FILE)) fs.writeFileSync(FILE,'[]') }
exports.listSubscriptions = function(){ ensure(); return JSON.parse(fs.readFileSync(FILE,'utf8')||'[]') }
exports.saveSubscription = function(s){ ensure(); const list = exports.listSubscriptions(); const row = { id:`${Date.now()}`, createdAt: new Date().toISOString(), ...s }; list.push(row); fs.writeFileSync(FILE, JSON.stringify(list,null,2)); return row }
