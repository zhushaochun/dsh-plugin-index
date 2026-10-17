const fs = require('node:fs')
const path = require('node:path')

// update.cjs unpacks the tarball into an ASCII temp dir and publishes the
// extracted path through CATALOG_SRC; resolve it here instead of trusting argv,
// which a Windows shell can split on the workspace's spaces.
const SRC = process.env.CATALOG_SRC
  || path.join(__dirname, 'package', 'plugins.json')
const TO = path.join(__dirname, 'catalog', 'plugins.json')

fs.mkdirSync(path.dirname(TO), { recursive: true })
fs.copyFileSync(SRC, TO)
console.log(`copied ${fs.statSync(TO).size} bytes -> catalog/plugins.json`)
