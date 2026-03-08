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

    const dateStr = candle.date.substring(0, 10)
    results.push({
      candleISOString: candle.date, // e.g. "2026-03-13T17:52:00-04:00"
      timeDisplay,
      sunsetDisplay: formatLocalTime(candle.date, 18),
      dateDisplay: formatDateDisplay(dateStr),
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

/**
 * Formats a time from an ISO string (with UTC offset) into "h:mmam/pm" local time,
 * optionally adding extra minutes first.
 * e.g. "2026-03-13T17:52:00-04:00" + 0 min → "5:52pm"
 *      "2026-03-13T17:52:00-04:00" + 18 min → "6:10pm"
 */
export function formatLocalTime(isoString, addMinutes = 0) {
  const match = isoString.match(/T(\d{2}):(\d{2}):\d{2}([+-])(\d{2}):(\d{2})$/)
  if (!match) return ''
  const [, hStr, mStr, sign, offH, offM] = match
  const offsetMinutes = (parseInt(offH) * 60 + parseInt(offM)) * (sign === '+' ? 1 : -1)
  const localMinutes = parseInt(hStr) * 60 + parseInt(mStr) + offsetMinutes + addMinutes
  const wrapped = ((localMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${period}`
}

/**
 * Formats "2026-03-13" as "Friday, March 13"
 */
export function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
