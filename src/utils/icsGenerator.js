import { getHolidayLinks } from './chabadLinks'

/**
 * Converts a JS Date to ICS UTC format: 20260313T215200Z
 */
function toUTCStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Given the ISO candle lighting string (e.g. "2026-03-13T17:52:00-04:00")
 * and the user's chosen reminder time (e.g. "12:00"), returns the UTC Date
 * for when the reminder should fire — noon that same day in the local timezone.
 *
 * We reuse the UTC offset embedded in HebCal's candle lighting timestamp,
 * which already accounts for DST on that specific date.
 */
function getReminderUTCDate(candleISOString, reminderTime) {
  const match = candleISOString.match(/^(\d{4}-\d{2}-\d{2})T[\d:]+([+-]\d{2}:\d{2})$/)

  if (!match) {
    // Fallback: treat reminder time as UTC (shouldn't normally happen)
    return new Date(`${candleISOString.substring(0, 10)}T${reminderTime}:00Z`)
  }

  const [, dateStr, offset] = match
  // Construct an ISO string in the local timezone using the known offset
  return new Date(`${dateStr}T${reminderTime}:00${offset}`)
}

/**
 * Escapes special characters for ICS text fields.
 */
function escapeICS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Folds long ICS lines at 75 octets per RFC 5545.
 */
function foldLine(line) {
  if (line.length <= 75) return line
  const parts = [line.substring(0, 75)]
  let i = 75
  while (i < line.length) {
    parts.push(' ' + line.substring(i, i + 74))
    i += 74
  }
  return parts.join('\r\n')
}

/**
 * Generates a complete .ics file string for the given list of candle lighting events.
 *
 * @param {Array} events - processed candle lighting events from hebcal.js
 * @param {Object} options
 * @param {boolean} options.familyParshah - include family parshah/holiday links
 * @param {boolean} options.kidsParshah   - include kids parshah/holiday links
 * @param {string}  options.reminderTime  - "HH:MM" (24h), e.g. "12:00"
 */
export function generateICS(events, { familyParshah, kidsParshah, reminderTime }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shabbat Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Shabbat & Holiday Reminders',
  ]

  for (const event of events) {
    const { candleISOString, timeDisplay, parshah, holiday } = event

    // --- Build event summary ---
    let summary = 'Candle Lighting'
    if (holiday) {
      summary = `Candle Lighting – ${holiday.title}`
    } else if (parshah) {
      summary = `Candle Lighting – ${parshah.title}`
    }

    // --- Build description ---
    const sunsetLine = event.sunsetDisplay ? `Sunset: ${event.sunsetDisplay}` : ''
    const descLines = [
      `Candle lighting: ${timeDisplay}`,
      ...(sunsetLine ? [sunsetLine] : []),
    ]

    if (holiday) {
      const links = getHolidayLinks(holiday.title)
      if (links) {
        descLines.push('')
        if (familyParshah) descLines.push(`Family: ${links.family}`)
        if (kidsParshah) descLines.push(`Kids: ${links.kids}`)
      }
    } else if (parshah) {
      const parshaLink = parshah.link || ''
      if (parshaLink) {
        descLines.push('')
        if (familyParshah) descLines.push(`Family: ${parshaLink}`)
        if (kidsParshah) descLines.push(`Kids: ${parshaLink}`)
      }
    }

    const description = descLines.join('\n')

    // --- Timing ---
    const dtStart = new Date(candleISOString)
    const dtEnd = new Date(dtStart.getTime() + 60 * 60 * 1000) // +1 hour
    const reminderUTC = getReminderUTCDate(candleISOString, reminderTime)

    // --- Unique ID ---
    const uid = `candles-${candleISOString.substring(0, 10)}@shabbat-reminders`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTART:${toUTCStamp(dtStart)}`)
    lines.push(`DTEND:${toUTCStamp(dtEnd)}`)
    lines.push(foldLine(`SUMMARY:${escapeICS(summary)}`))
    lines.push(foldLine(`DESCRIPTION:${escapeICS(description)}`))

    // Link field (first available)
    const urlLink = holiday
      ? getHolidayLinks(holiday.title)?.family
      : parshah?.link
    if (urlLink) lines.push(foldLine(`URL:${urlLink}`))

    // Alarm
    lines.push('BEGIN:VALARM')
    lines.push('ACTION:DISPLAY')
    lines.push(foldLine(`DESCRIPTION:${escapeICS(summary)}`))
    lines.push(`TRIGGER;VALUE=DATE-TIME:${toUTCStamp(reminderUTC)}`)
    lines.push('END:VALARM')

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}
