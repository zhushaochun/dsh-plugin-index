const fs = require('node:fs')
const path = require('node:path')

const file = process.argv[2] || process.env.INDEX || path.join(__dirname, 'index.json')
const doc = JSON.parse(fs.readFileSync(file, 'utf8'))
doc.plugins.sort((a, b) => a.name.localeCompare(b.name))
fs.writeFileSync(file, JSON.stringify(doc))
console.log('sorted', doc.plugins.length, 'plugins by name')
