---
'@agentskit/tools': minor
---

Phase 3 sprint S22 — issues #172, #173, #174, #175.

Eleven new integrations in `@agentskit/tools/integrations`:

- Scraping + parsing: `firecrawl` (scrape/crawl), `reader` (Jina
  Reader), `documentParsers` (BYO `parsePdf`/`parseDocx`/`parseXlsx`
  fns so the heavy native parsers stay out of the bundle).
- Image + voice: `openaiImages` (generate), `elevenlabs` (tts),
  `whisper` (transcribe), `deepgram` (transcribe). Binary outputs
  returned as base64 for JSON-safe tool results.
- Maps / weather / finance: `maps` (Nominatim geocode +
  reverse-geocode), `weather` (OpenWeatherMap), `coingecko`
  (price + market chart, public endpoint with optional pro key).
- Browser agent: `browserAgent` over a 6-method `BrowserPage`
  contract — wire in Playwright / Puppeteer / CDP on your side
  without bundling them. Tools: goto, click, fill, read,
  screenshot, waitFor.

133 new tests; every factory accepts a custom `fetch` for mocking.
