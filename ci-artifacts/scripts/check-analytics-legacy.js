#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const legacyPath = path.resolve(process.cwd(), 'data', 'analytics.json')

if (fs.existsSync(legacyPath)) {
  console.warn('WARNING: legacy analytics file detected at', legacyPath)
  console.warn('This repository no longer auto-converts legacy analytics at runtime.')
  console.warn('Run `node scripts/convert-legacy-analytics.js` to migrate legacy JSON -> JSONL safely.')
  process.exitCode = 2
} else {
  console.log('No legacy analytics file detected.')
}
