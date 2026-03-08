const HEBCAL_BASE = 'https://www.hebcal.com/hebcal'

/**
 * Fetches candle lighting and parshah/holiday data from HebCal for a given US zip code.
 * Fetches the current year; if we're in Nov/Dec and Simchat Torah has passed, fetches
 * the next year too so we always have a future Simchat Torah as an end date.
 */
export async function fetchCalendarData(zipCode) {
  const now = new Date()
  const currentYear = now.getFullYear()
  // If Nov or Dec, also fetch next year to ensure we find the next Simchat Torah
  const years = now.getMonth() >= 10 ? [currentYear, currentYear + 1] : [currentYear]

  let allItems = []
  let timezone = 'America/New_York'

  for (const year of years) {
    const params = new URLSearchParams({
      v: '1',
      cfg: 'json',
      maj: 'on',   // major holidays
      min: 'off',
      mod: 'off',
      nx: 'off',
      year: String(year),
      month: 'x', // all months
      ss: 'off',
      mf: 'off',
      c: 'on',     // candle lighting times
      geo: 'zip',
      zip: zipCode,
      m: '18',     // 18 minutes before sunset (standard candle lighting offset)
      s: 'off',
      leyning: 'off',
    })

    const res = await fetch(`${HEBCAL_BASE}?${params}`)

    if (!res.ok) {
      if (res.status === 400 || res.status === 404) {
        throw new Error('Invalid zip code. Please enter a valid US zip code.')
      }
      throw new Error(`Unable to fetch calendar data (${res.status}). Please try again.`)
    }

    const data = await res.json()

    if (!data.location) {
      throw new Error('Invalid zip code. Please enter a valid US zip code.')
    }

    if (data.location.tzid) {
      timezone = data.location.tzid
    }

    allItems = allItems.concat(data.items || [])
  }

  return { items: allItems, timezone }
}

/**
 * Finds the next Simchat Torah date on or after today.
 */
export function findSimchatTorahDate(items, today) {
  const candidates = items.filter(
    (item) =>
      item.category === 'holiday' &&
      item.title === 'Simchat Torah' &&
      new Date(item.date) >= today
  )

  if (candidates.length === 0) return null

  candidates.sort((a, b) => new Date(a.date) - new Date(b.date))
  return new Date(candidates[0].date)
}

/**
 * Processes raw HebCal items into a list of candle lighting events, each paired
 * with its associated parshah and/or holiday for that week/day.
 *
 * Returns events sorted by date, from today through endDate (inclusive).
 */
export function processCalendarItems(items, today, endDate) {
  // Index all items by calendar date (YYYY-MM-DD)
  const byDate = {}
  for (const item of items) {
    const key = item.date.substring(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(item)
  }

  const candleEvents = items.filter((item) => item.category === 'candles')
  const results = []

  for (const candle of candleEvents) {
    // Use noon of the candle date to safely compare (avoids DST edge cases)
    const candleDateOnly = new Date(candle.date.substring(0, 10) + 'T12:00:00')
    if (candleDateOnly < today || candleDateOnly > endDate) continue

    const nextDateStr = addOneDay(candle.date.substring(0, 10))
    const nextItems = byDate[nextDateStr] || []

    const parshah = nextItems.find((i) => i.category === 'parashat') || null
    const holiday =
      nextItems.find((i) => i.category === 'holiday' && i.subcat === 'major') || null

    // Extract "5:32pm" from HebCal title like "Candle lighting: 5:32pm"
    const timeMatch = candle.title.match(/:\s*(.+)$/)
    const timeDisplay = timeMatch ? timeMatch[1].trim() : ''

    results.push({
      candleISOString: candle.date, // e.g. "2026-03-13T17:52:00-04:00"
      timeDisplay,
      parshah,
      holiday,
    })
  }

  results.sort((a, b) => new Date(a.candleISOString) - new Date(b.candleISOString))
  return results
}

function addOneDay(dateStr) {
  // dateStr: "2026-03-13" — use noon to avoid DST boundary issues
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().substring(0, 10)
}
