// Repair script: promote catalog `description` to the top-level plugin.description.
// Field discovery (probe-catalog-fields.cjs) proved the key is `description`
// ({en,zh} localized object), not `desc`.
const fs = require('node:fs')
const path = require('node:path')

const DIR = __dirname
const CATALOG = process.argv[2] || path.join(DIR, 'catalog', 'plugins.json')
const INDEX = process.argv[3] || path.join(DIR, 'index.json')

// Source files are UTF-8 Chinese text read/written through PowerShell 5.1's
// default GBK pipes, so normalize mojibake instead of trusting the decoded
// string: re-encode as latin1 and decode as UTF-8 when the result is valid.
function ungarble(text) {
  if (!text || !/[ÃÂåä][\u0080-\u00ff]/.test(text)) return text
  try {
    const buf = Buffer.from(text, 'latin1')
    const round = buf.toString('utf8')
    if (round && !/\uFFFD/.test(round)) return round
  } catch { /* fall through */ }
  return text
}

const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const byNpm = new Map()
for (const e of raw.plugins || []) {
  if (e && typeof e.npm === 'string' && e.npm.trim()) byNpm.set(e.npm.trim(), e)
}

const doc = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
let fixed = 0
let missing = 0
let repaired = 0
for (const plugin of doc.plugins) {
  const entry = byNpm.get(plugin.name)
  if (!entry) { missing++; continue }
  const d = entry.description
  if (d && typeof d === 'object' && typeof d.en === 'string' && d.en.trim()) {
    const en = ungarble(d.en)
    const zh = typeof d.zh === 'string' && d.zh.trim() ? ungarble(d.zh) : en
    plugin.description = { en, zh }
    if (en !== d.en || zh !== d.zh) repaired++
    fixed++
  }
}
// Same repair for the document-level title/description and category titles.
const docText = (v) => (v && typeof v === 'object' ? v : null)
for (const key of ['title', 'description']) {
  const obj = docText(doc[key])
  if (obj) {
    for (const lang of Object.keys(obj)) {
      const before = obj[lang]
      obj[lang] = ungarble(before)
      if (obj[lang] !== before) repaired++
    }
  }
}
for (const cat of Object.values(doc.metadata.categories || {})) {
  const obj = docText(cat.title)
  if (!obj) continue
  for (const lang of Object.keys(obj)) {
    const before = obj[lang]
    obj[lang] = ungarble(before)
    if (obj[lang] !== before) repaired++
  }
}
for (const plugin of doc.plugins) {
  const obj = docText(plugin.title)
  if (!obj) continue
  for (const lang of Object.keys(obj)) {
    const before = obj[lang]
    obj[lang] = ungarble(before)
    if (obj[lang] !== before) repaired++
  }
}
// Names are pure ASCII; descriptions come from the catalog's GitHub README.
fs.writeFileSync(INDEX, JSON.stringify(doc))
console.log(JSON.stringify({ fixed, missing, repairedText: repaired, total: doc.plugins.length, bytes: fs.statSync(INDEX).size }, null, 2))

