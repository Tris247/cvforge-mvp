import type { NextApiRequest, NextApiResponse } from 'next'
const fs = require('fs');
const path = require('path');
const JOBS_FILE = path.resolve(process.cwd(),'data','jobs.json');
function ensure(){ const dir = path.dirname(JOBS_FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir); if(!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE,'[]') }
exports.listJobs = function(){ ensure(); return JSON.parse(fs.readFileSync(JOBS_FILE,'utf8')||'[]') }
exports.saveJob = function(job){ ensure(); const items = exports.listJobs(); const item = { id:`${Date.now()}`, createdAt: new Date().toISOString(), ...job }; items.push(item); fs.writeFileSync(JOBS_FILE, JSON.stringify(items, null,2)); return item }
