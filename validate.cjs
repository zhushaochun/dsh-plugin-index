// Validate the generated index with the host's own format-1 parser.
const path = require('node:path')
const fs = require('node:fs')
const lib = require('D:\\APP\\DSH-Web\\runtime-npm\\node_modules\\@deepseek-ai\\dsh-plugin-market-index\\lib\\index.js')

const file = process.argv[2]
const doc = JSON.parse(fs.readFileSync(file, 'utf8'))
const indexUrl = 'https://example.invalid/index.json'

try {
  const parsed = lib.parseMarketIndex(doc, indexUrl)
  console.log('PARSE OK  plugins =', parsed.plugins.length)
  const search = lib.searchMarketIndex ? lib.searchMarketIndex(parsed, 'test') : null
  if (search) console.log('SEARCH OK', JSON.stringify(search).slice(0, 200))
  const targets = parsed.plugins.slice(0, 3).map((p) => lib.marketInstallTarget(p.name, p.versions[0]))
  console.log('INSTALL TARGETS', targets)
  const meta = parsed.plugins.filter((p) => p.metadata && p.metadata.category).length
  console.log('with icon =', parsed.plugins.filter((p) => p.icon).length, 'with category =', meta,
    'with description =', parsed.plugins.filter((p) => p.description).length,
    'with title =', parsed.plugins.filter((p) => p.title).length,
    'with homepage =', parsed.plugins.filter((p) => p.homepage).length)
} catch (err) {
  console.log('PARSE FAILED:', err && err.message ? err.message : err)
  process.exitCode = 1
}
