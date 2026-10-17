// 1) Enumerate the field names actually present in the catalog entries.
// 2) Probe the npm per-version manifest to see whether it carries a publish time.
const fs = require('node:fs')
const path = require('node:path')

const CATALOG = process.argv[2] || path.join(__dirname, 'catalog', 'plugins.json')
const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const entries = Array.isArray(raw.plugins) ? raw.plugins : []

const counts = new Map()
for (const e of entries) {
  if (!e || typeof e !== 'object') continue
  for (const k of Object.keys(e)) counts.set(k, (counts.get(k) || 0) + 1)
}
console.log('catalog entries:', entries.length)
console.log('field counts:')
for (const [k, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(' ', k, n)

const withNpm = entries.filter((e) => e && typeof e.npm === 'string' && e.npm.trim())
console.log('\nentries with npm field:', withNpm.length)
console.log('sample entry:', JSON.stringify(withNpm[0], null, 2).slice(0, 1200))

// date-ish fields?
const dateLike = withNpm.filter((e) => /date|time|publish|updated|created/i.test(Object.keys(e).join(',')))
console.log('\nentries with a date-ish field:', dateLike.length)
if (dateLike.length) {
  console.log('date-ish keys of one:', Object.keys(dateLike[0]).filter((k) => /date|time|publish|updated|created/i.test(k)))
  console.log('values:', Object.fromEntries(Object.entries(dateLike[0]).filter(([k]) => /date|time|publish|updated|created/i.test(k))))
}

async function main() {
  for (const url of [
    'https://registry.npmjs.org/dsh-meme/0.1.52',
    'https://registry.npmjs.org/dsh-meme/0.1.52?write=false',
  ]) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
      const text = await res.text()
      let json = null
      try { json = JSON.parse(text) } catch { /* not json */ }
      console.log(`\n${url}\n  status=${res.status} bytes=${text.length} keys=${json ? Object.keys(json).slice(0, 15) : null}`)
      if (json && json.time) console.log('  time=', JSON.stringify(json.time))
    } catch (err) {
      console.log(`\n${url}\n  ERROR ${err && err.message}`)
    }
  }
}

main()
