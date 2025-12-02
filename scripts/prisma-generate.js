const { execSync } = require('child_process')

function isPostgres(url){
  return typeof url === 'string' && url.toLowerCase().startsWith('postgres')
}

try{
  const url = process.env.DATABASE_URL
  if(isPostgres(url)){
    execSync('npx prisma generate --schema=prisma/schema.postgres.prisma', { stdio: 'inherit' })
  } else {
    execSync('npx prisma generate', { stdio: 'inherit' })
  }
}catch(e){
  console.error('prisma generate failed:', e && e.message || e)
  process.exitCode = 1
}
