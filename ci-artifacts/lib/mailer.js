const nodemailer = require('nodemailer')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

let transport = null

async function initTransport(){
  if(transport) return transport
  // If MAILER_ENABLED is not truthy, create a dummy transport which no-ops
  if(!process.env.MAILER_ENABLED || process.env.MAILER_ENABLED === 'false'){
    transport = { sendMail: async ()=>({accepted:[], rejected:[]}) }
    return transport
  }

  // Try to use SMTP_URL if provided (generic), otherwise fall back to ethereal test account
  if(process.env.SMTP_URL){
    transport = nodemailer.createTransport(process.env.SMTP_URL)
    return transport
  }

  // Create ethereal test account for local/dev usage
  const account = await nodemailer.createTestAccount()
  transport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: account.user, pass: account.pass }
  })
  return transport
}

async function sendNotificationEmail(targetUserId, notification){
  try{
    const user = await prisma.user.findUnique({ where: { id: String(targetUserId) } })
    if(!user || !user.email) return null
    const tr = await initTransport()
    const info = await tr.sendMail({
      from: process.env.NOTIFICATION_FROM || 'noreply@example.com',
      to: user.email,
      subject: `New ${notification.type} — ${notification.payload?.title || ''}`,
      text: JSON.stringify(notification.payload || {}, null, 2),
      html: `<pre>${JSON.stringify(notification.payload || {}, null, 2)}</pre>`
    })
    // nodemailer returns preview URL for ethereal
    if(nodemailer.getTestMessageUrl && info){
      return nodemailer.getTestMessageUrl(info)
    }
    return info
  }catch(e){
    // don't let mail failures break main flow
    console.warn('mailer.sendNotificationEmail failed', e && e.message)
    return null
  }
}

module.exports = { sendNotificationEmail }
