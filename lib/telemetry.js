function captureException(err, ctx){
  try{
    if(process.env.SENTRY_DSN){
      const Sentry = require('@sentry/node')
      if(!Sentry.getCurrentHub().getClient()) Sentry.init({ dsn: process.env.SENTRY_DSN })
      Sentry.captureException(err)
    }else{
      console.error('Captured exception', err, ctx || '')
    }
  }catch(e){ console.error('failed to report exception', e) }
}

module.exports = { captureException }
