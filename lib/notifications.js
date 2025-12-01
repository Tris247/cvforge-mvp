const fs = require('fs')
const path = require('path')

const FILE = process.env.NOTIFICATIONS_FILE ? path.resolve(process.cwd(), process.env.NOTIFICATIONS_FILE) : path.resolve(process.cwd(), 'data', 'notifications.json')

function ensure(){ const dir = path.dirname(FILE); if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]') }

function read(){ ensure(); return JSON.parse(fs.readFileSync(FILE,'utf8')||'[]') }
function write(obj){ fs.writeFileSync(FILE, JSON.stringify(obj, null, 2)) }

const mailer = require('./mailer')

function addNotification(target, type, payload){ ensure(); const arr = read(); const n = { id: String(Date.now()), target: String(target), type, payload, createdAt: new Date().toISOString(), read: false }; arr.unshift(n); write(arr);
	// try to deliver an email notification when mailer is enabled — don't block the main flow
	if(process.env.MAILER_ENABLED && process.env.MAILER_ENABLED !== 'false'){
		;(async()=>{
			try{
				const preview = await mailer.sendNotificationEmail(target, n)
				if(preview){
					// In dev using Ethereal, nodemailer provides a preview URL — surface it in logs when present
					console.info('notification email preview:', preview)
				}
			}catch(e){ console.warn('notification email failed', e && e.message) }
		})()
	}
	return n }

function listNotifications(target){ const arr = read(); return arr.filter(a=> String(a.target) === String(target)) }

module.exports = { addNotification, listNotifications }
