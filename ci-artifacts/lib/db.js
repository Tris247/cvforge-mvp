const fs = require('fs');
const path = require('path');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CVS_FILE = path.join(DATA_DIR, 'cvs.json');
function ensure(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR); if(!fs.existsSync(CVS_FILE)) fs.writeFileSync(CVS_FILE, '[]'); }
exports.listCVs = function(){ ensure(); return JSON.parse(fs.readFileSync(CVS_FILE,'utf8')||'[]') }
exports.saveCV = function(cv){ ensure(); const items = exports.listCVs(); const withId = { id: `${Date.now()}`, createdAt: new Date().toISOString(), ...cv }; items.push(withId); fs.writeFileSync(CVS_FILE, JSON.stringify(items, null, 2)); return withId }
