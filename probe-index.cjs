// Probe whether an already-hosted document is usable as a Discover index source:
// fetch it exactly the way the Host does (no redirects) and run the official parser.
const { parseMarketIndex } = require('D:\\APP\\DSH-Web\\runtime-npm\\node_modules\\@deepseek-ai\\dsh-plugin-market-index\\lib\\index.js')

const urls = process.argv.slice(2)
;(async () => {
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: 'error', headers: { accept: 'application/json' } })
      const text = await response.text()
      let ok = '?'
      try {
        const index = parseMarketIndex(JSON.parse(text), url)
        ok = `OK format=${index.format} plugins=${index.plugins.length}`
      } catch (error) {
        ok = `PARSE FAIL: ${error.message}`
      }
      console.log(`${response.status} ${url} bytes=${text.length} ${ok}`)
    } catch (error) {
      console.log(`FETCH FAIL ${url} :: ${error.cause?.code || error.cause?.message || error.message}`)
    }
  }
})()
