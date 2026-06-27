import { describe, it, expect } from 'vitest'
import {
  parseDDMMYYYY, addMonths, stripMarket, extractWaves, buildPineScript,
} from './waveScript.js'

// Helper: build a batch whose results[] are one row per horizon for a ticker.
function makeBatch(id, date, ticker, prices, company = 'Co', sector) {
  const { base, m1, m3, m6, m12 } = prices
  const row = (horizon, targetPrice) => ({
    ticker, company, horizon, basePrice: base, targetPrice, sector,
  })
  const results = [
    row('1M', m1), row('3M', m3), row('6M', m6),
  ]
  if (m12 != null) results.push(row('12M', m12))
  return { id, date, results }
}

// ── stripMarket ───────────────────────────────────────────────────────────────

describe('stripMarket', () => {
  it('strips European market suffixes', () => {
    expect(stripMarket('NEM.DE')).toBe('NEM')
    expect(stripMarket('ASML.AS')).toBe('ASML')
    expect(stripMarket('AIR.PA')).toBe('AIR')
    expect(stripMarket('BP.L')).toBe('BP')
    expect(stripMarket('SAN.MC')).toBe('SAN')
  })

  it('strips the .US suffix', () => {
    expect(stripMarket('TER.US')).toBe('TER')
  })

  it('leaves a bare US ticker unchanged', () => {
    expect(stripMarket('AMD')).toBe('AMD')
    expect(stripMarket('MU')).toBe('MU')
  })

  it('uppercases the result', () => {
    expect(stripMarket('nem.de')).toBe('NEM')
  })

  it('handles empty / nullish input', () => {
    expect(stripMarket('')).toBe('')
    expect(stripMarket(null)).toBe('')
    expect(stripMarket(undefined)).toBe('')
  })
})

// ── addMonths ─────────────────────────────────────────────────────────────────

describe('addMonths', () => {
  it('adds calendar months keeping the day number', () => {
    const base = new Date(2026, 0, 15)        // 15 Jan 2026
    expect(addMonths(base, 1).getMonth()).toBe(1)   // Feb
    expect(addMonths(base, 1).getDate()).toBe(15)
    expect(addMonths(base, 3).getMonth()).toBe(3)   // Apr
    expect(addMonths(base, 6).getMonth()).toBe(6)   // Jul
    expect(addMonths(base, 12).getFullYear()).toBe(2027)
    expect(addMonths(base, 12).getMonth()).toBe(0)  // Jan next year
  })

  it('does not mutate the input date', () => {
    const base = new Date(2026, 0, 15)
    addMonths(base, 6)
    expect(base.getMonth()).toBe(0)
  })
})

// ── parseDDMMYYYY ─────────────────────────────────────────────────────────────

describe('parseDDMMYYYY', () => {
  it('parses a valid DD/MM/YYYY string', () => {
    const d = parseDDMMYYYY('08/05/2026')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4)   // May
    expect(d.getDate()).toBe(8)
  })

  it('returns null on bad input', () => {
    expect(parseDDMMYYYY('')).toBeNull()
    expect(parseDDMMYYYY(null)).toBeNull()
    expect(parseDDMMYYYY('2026-05-08')).toBeNull()
  })
})

// ── extractWaves ──────────────────────────────────────────────────────────────

describe('extractWaves', () => {
  it('returns an empty array for no batches', () => {
    expect(extractWaves([])).toEqual([])
    expect(extractWaves(null)).toEqual([])
  })

  it('builds one wave per ticker per batch with the right fields', () => {
    const batches = [
      makeBatch('b1', '10/01/2026', 'AMD', { base: 100, m1: 110, m3: 120, m6: 130, m12: 150 }),
    ]
    const waves = extractWaves(batches)
    expect(waves).toHaveLength(1)
    const w = waves[0]
    expect(w.ticker).toBe('AMD')
    expect(w.tickerNorm).toBe('AMD')
    expect(w.p0).toBe(100)
    expect(w.p1).toBe(110)
    expect(w.p2).toBe(120)   // 3M maps to p2
    expect(w.p3).toBe(130)   // 6M maps to p3
    expect(w.p4).toBe(150)   // 12M maps to p4
  })

  it('normalises EU tickers (NEM.DE → NEM)', () => {
    const batches = [
      makeBatch('b1', '10/01/2026', 'NEM.DE', { base: 50, m1: 55, m3: 58, m6: 60, m12: 65 }),
    ]
    expect(extractWaves(batches)[0].tickerNorm).toBe('NEM')
  })

  it('sets p4 to null when the 12M target is absent', () => {
    const batches = [
      makeBatch('b1', '10/01/2026', 'AMD', { base: 100, m1: 110, m3: 120, m6: 130, m12: null }),
    ]
    expect(extractWaves(batches)[0].p4).toBeNull()
  })

  it('skips a wave missing any of the 1M/3M/6M spine', () => {
    const batches = [{
      id: 'b1', date: '10/01/2026',
      results: [
        { ticker: 'X', horizon: '1M', basePrice: 10, targetPrice: 11 },
        { ticker: 'X', horizon: '6M', basePrice: 10, targetPrice: 13 },
        // no 3M → incomplete spine
      ],
    }]
    expect(extractWaves(batches)).toHaveLength(0)
  })

  it('discards an exact duplicate (same date AND same prices)', () => {
    const p = { base: 100, m1: 110, m3: 120, m6: 130, m12: 150 }
    const batches = [
      makeBatch('b1', '10/01/2026', 'AMD', p),
      makeBatch('b2', '10/01/2026', 'AMD', p),   // identical → dropped
    ]
    expect(extractWaves(batches)).toHaveLength(1)
  })

  it('keeps same ticker on different dates as separate waves', () => {
    const batches = [
      makeBatch('b1', '10/01/2026', 'AMD', { base: 100, m1: 110, m3: 120, m6: 130, m12: 150 }),
      makeBatch('b2', '10/02/2026', 'AMD', { base: 105, m1: 115, m3: 125, m6: 135, m12: 155 }),
    ]
    expect(extractWaves(batches)).toHaveLength(2)
  })

  it('sorts waves chronologically (oldest first)', () => {
    const batches = [
      makeBatch('b1', '10/03/2026', 'AMD', { base: 108, m1: 118, m3: 128, m6: 138, m12: 158 }),
      makeBatch('b2', '10/01/2026', 'AMD', { base: 100, m1: 110, m3: 120, m6: 130, m12: 150 }),
    ]
    const waves = extractWaves(batches)
    expect(waves[0].baseDate.getMonth()).toBe(0)   // Jan first
    expect(waves[1].baseDate.getMonth()).toBe(2)   // Mar second
  })

  it('uses calendar-month arithmetic for the time axis', () => {
    const batches = [
      makeBatch('b1', '15/01/2026', 'AMD', { base: 100, m1: 110, m3: 120, m6: 130, m12: 150 }),
    ]
    const w = extractWaves(batches)[0]
    expect(w.t1).toBe(new Date(2026, 1, 15).getTime())   // +1 month
    expect(w.t2).toBe(new Date(2026, 3, 15).getTime())   // +3 months
    expect(w.t3).toBe(new Date(2026, 6, 15).getTime())   // +6 months
    expect(w.t4).toBe(new Date(2027, 0, 15).getTime())   // +12 months
  })
})

// ── buildPineScript ───────────────────────────────────────────────────────────

describe('buildPineScript', () => {
  const sample = () => extractWaves([
    makeBatch('b1', '10/01/2026', 'AMD', { base: 100, m1: 110, m3: 120, m6: 130, m12: 150 }),
    makeBatch('b2', '10/02/2026', 'AMD', { base: 105, m1: 115, m3: 125, m6: 135, m12: null }),
    makeBatch('b3', '10/02/2026', 'NEM.DE', { base: 50, m1: 55, m3: 58, m6: 60, m12: 65 }),
  ])

  it('emits a valid Pine v6 header with raised limits', () => {
    const pine = buildPineScript(sample())
    expect(pine).toContain('//@version=6')
    expect(pine).toContain('max_lines_count = 500')
    expect(pine).toContain('max_labels_count = 500')
  })

  it('embeds each ticker for the syminfo filter', () => {
    const pine = buildPineScript(sample())
    expect(pine).toContain('AMD;')
    expect(pine).toContain('NEM;')
    expect(pine).toContain('syminfo.ticker')
  })

  it('assigns per-ticker colour index (each ticker restarts at 0)', () => {
    const pine = buildPineScript(sample())
    // AMD: ci 0 then 1 ; NEM: ci 0
    expect(pine).toContain('AMD;0;')
    expect(pine).toContain('AMD;1;')
    expect(pine).toContain('NEM;0;')
  })

  it('leaves the 12M field empty when there is no 12M target', () => {
    const pine = buildPineScript(sample())
    // AMD wave #2 (ci 1) ends with an empty trailing field before the newline/quote
    const amd1Line = pine.split('\\n').find(l => l.includes('AMD;1;'))
    expect(amd1Line).toBeDefined()
    expect(amd1Line.endsWith(';')).toBe(true)   // empty p4 → trailing ';'
  })

  it('contains the drawWave helper and per-ticker filter logic', () => {
    const pine = buildPineScript(sample())
    expect(pine).toContain('drawWave(array<string> f) =>')
    expect(pine).toContain('array.get(f, 0) == syminfo.ticker')
    expect(pine).toContain('str.split(WAVE_DATA')
  })

  it('reports the wave count in the header comment', () => {
    const pine = buildPineScript(sample())
    expect(pine).toContain('Waves: 3')
  })

  it('handles an empty wave list without crashing', () => {
    const pine = buildPineScript([])
    expect(pine).toContain('//@version=6')
    expect(pine).toContain('Waves: 0')
  })
})
