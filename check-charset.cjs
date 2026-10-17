// Diagnose whether any description text still contains characters that only
// appear in mojibake (the U+0080–U+00FF latin-1 supplement block).
const fs = require('node:fs')
const doc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

const hits = new Map()
for (const p of doc.plugins) {
  for (const t of Object.values(p.description || {})) {
    for (const ch of t) {
      const c = ch.codePointAt(0)
      if (c >= 0x80 && c <= 0xff) hits.set(ch, (hits.get(ch) || 0) + 1)
    }
  }
}
console.log('latin-1 supplement chars:', [...hits].map(([c, n]) => `${c} U+${c.codePointAt(0).toString(16)} x${n}`).join(' | ') || 'none')
console.log('plugins affected:', doc.plugins.filter((p) => {
  for (const t of Object.values(p.description || {})) {
    for (const ch of t) {
      const c = ch.codePointAt(0)
      if (c >= 0x80 && c <= 0xff) return true
    }
  }
  return false
}).length)
