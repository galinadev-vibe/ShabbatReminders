import { useState } from 'react'
import { fetchCalendarData, processCalendarItems, findSimchatTorahDate } from './utils/hebcal'
import { generateICS } from './utils/icsGenerator'
import { getHolidayLinks } from './utils/chabadLinks'
import './App.css'

const PREVIEW_COUNT = 3

export default function App() {
  const [zipCode, setZipCode] = useState('')
  const [familyParshah, setFamilyParshah] = useState(true)
  const [kidsParshah, setKidsParshah] = useState(true)
  const [reminderTime, setReminderTime] = useState('12:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewEvents, setPreviewEvents] = useState(null) // null = not yet generated

  function clearPreview() {
    setPreviewEvents(null)
    setError('')
  }

  function handleZipChange(e) {
    setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))
    clearPreview()
  }

  async function handlePreview() {
    setError('')
    setPreviewEvents(null)

    if (!/^\d{5}$/.test(zipCode)) {
      setError('Please enter a valid 5-digit US zip code.')
      return
    }

    if (!familyParshah && !kidsParshah) {
      setError('Please select at least one option under "Include in calendar."')
      return
    }

    setLoading(true)

    try {
      const { items } = await fetchCalendarData(zipCode)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const simchatTorahDate = findSimchatTorahDate(items, today)
      if (!simchatTorahDate) {
        throw new Error('Could not find Simchat Torah date. Please try again.')
      }

      const events = processCalendarItems(items, today, simchatTorahDate)

      if (events.length === 0) {
        throw new Error('No upcoming candle lighting events found for this zip code.')
      }

      setPreviewEvents(events)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!previewEvents) return
    const icsContent = generateICS(previewEvents, { familyParshah, kidsParshah, reminderTime })
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shabbat-reminders.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <span className="candle-icon" aria-hidden="true">🕯️</span>
          <h1>Shabbat Reminders</h1>
          <p className="subtitle">
            Generate a calendar with candle lighting times and Parshah links through Simchat Torah
          </p>
        </div>

        <div className="form">
          {/* Zip Code */}
          <div className="field">
            <label htmlFor="zipCode">Zip Code</label>
            <input
              id="zipCode"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 10001"
              maxLength={5}
              value={zipCode}
              onChange={handleZipChange}
            />
            <span className="field-hint">US zip codes only</span>
          </div>

          {/* Parshah options */}
          <div className="field">
            <label>Include in calendar</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={familyParshah}
                  onChange={(e) => { setFamilyParshah(e.target.checked); clearPreview() }}
                />
                <span>Family Parshah &amp; Holiday links</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={kidsParshah}
                  onChange={(e) => { setKidsParshah(e.target.checked); clearPreview() }}
                />
                <span>Kids Parshah &amp; Holiday links</span>
              </label>
            </div>
          </div>

          {/* Reminder time */}
          <div className="field">
            <label htmlFor="reminderTime">Remind me at</label>
            <input
              id="reminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => { setReminderTime(e.target.value); clearPreview() }}
            />
            <span className="field-hint">
              on the day of each candle lighting (Shabbat &amp; holidays)
            </span>
          </div>

          {/* Error message */}
          {error && (
            <div className="message error-message" role="alert">
              {error}
            </div>
          )}

          {/* Preview section */}
          {previewEvents && (
            <div className="preview">
              <p className="preview-heading">
                Preview — {previewEvents.length} event{previewEvents.length !== 1 ? 's' : ''} through Simchat Torah
              </p>
              <ul className="preview-list">
                {previewEvents.slice(0, PREVIEW_COUNT).map((ev) => {
                  const label = ev.holiday?.title || ev.parshah?.title || 'Shabbat'
                  const holidayLinks = ev.holiday ? getHolidayLinks(ev.holiday.title) : null
                  const parshaLink = !ev.holiday && ev.parshah?.link ? ev.parshah.link : null
                  const familyLink = holidayLinks?.family || parshaLink
                  const kidsLink = holidayLinks?.kids || parshaLink
                  return (
                    <li key={ev.candleISOString} className="preview-row">
                      <span className="preview-date">{ev.dateDisplay}</span>
                      <span className="preview-label">{label}</span>
                      <span className="preview-times">
                        Candles {ev.timeDisplay}
                        {ev.sunsetDisplay && (
                          <> · Sunset {ev.sunsetDisplay}</>
                        )}
                      </span>
                      {(familyParshah || kidsParshah) && (familyLink || kidsLink) && (
                        <span className="preview-links">
                          {familyParshah && familyLink && (
                            <a href={familyLink} target="_blank" rel="noopener noreferrer">Family</a>
                          )}
                          {kidsParshah && kidsLink && (
                            <a href={kidsLink} target="_blank" rel="noopener noreferrer">Kids</a>
                          )}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              {previewEvents.length > PREVIEW_COUNT && (
                <p className="preview-more">
                  …and {previewEvents.length - PREVIEW_COUNT} more events
                </p>
              )}
            </div>
          )}

          {/* CTA */}
          {!previewEvents ? (
            <button
              className="generate-btn"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading ? (
                <span className="loading-text">
                  <span className="spinner" aria-hidden="true" />
                  Loading…
                </span>
              ) : (
                'Preview Calendar'
              )}
            </button>
          ) : (
            <div className="btn-group">
              <button className="generate-btn outline-btn" onClick={clearPreview}>
                ← Edit
              </button>
              <button className="generate-btn" onClick={handleDownload}>
                Download Calendar ↓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
