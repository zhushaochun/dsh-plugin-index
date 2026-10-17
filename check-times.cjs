// Final integrity check on index.json: verify every publishTimestamp is an
// integer Unix second < 1e11, and spot-check three against the live registry.
const fs = require('node:fs')
const path = require('node:path')

const INDEX = process.argv[2] || path.join(__dirname, 'index.json')
const doc = JSON.parse(fs.readFileSync(INDEX, 'utf8'))

let bad = 0
let zero = 0
const samples = []
for (const p of doc.plugins) {
  for (const v of p.versions) {
    const t = v.publishTimestamp
    if (!Number.isInteger(t) || t < 0 || t >= 1e11) { bad++; if (bad <= 5) samples.push(`${p.name}@${v.version}=${t}`) }
    if (t === 0) zero++
  }
}
const all = doc.plugins.map((p) => p.versions[0].publishTimestamp)
console.log(JSON.stringify({
  plugins: doc.plugins.length,
  versions: all.length,
  badTimestamps: bad,
  badSamples: samples,
  zeroTimestamps: zero,
  min: new Date(Math.min(...all) * 1000).toISOString(),
  max: new Date(Math.max(...all) * 1000).toISOString(),
  sizeBytes: fs.statSync(INDEX).size,
}, null, 2))

async function check(name, version) {
  const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}`
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  const json = await res.json()
  const live = Math.floor(Date.parse(json.time[version] || '') / 1000)
  const mine = doc.plugins.find((p) => p.name === name).versions.find((v) => v.version === version).publishTimestamp
  console.log(`check ${name}@${version}: index=${mine} npm=${live} match=${live === mine}`)
}

;(async () => {
  const picks = []
  for (let i = 0; i < 3; i++) picks.push(doc.plugins[Math.floor(Math.random() * doc.plugins.length)])
  for (const p of picks) await check(p.name, p.versions[0].version)
})()
