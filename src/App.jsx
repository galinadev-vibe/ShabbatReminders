import { useState } from 'react'
import { fetchCalendarData, processCalendarItems, findSimchatTorahDate } from './utils/hebcal'
import { generateICS } from './utils/icsGenerator'
import './App.css'

export default function App() {
  const [zipCode, setZipCode] = useState('')
  const [familyParshah, setFamilyParshah] = useState(true)
  const [kidsParshah, setKidsParshah] = useState(true)
  const [reminderTime, setReminderTime] = useState('12:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleZipChange(e) {
    setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))
    setError('')
    setSuccess(false)
  }

  async function handleGenerate() {
    setError('')
    setSuccess(false)

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

      const icsContent = generateICS(events, { familyParshah, kidsParshah, reminderTime })

      // Trigger file download
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'shabbat-reminders.ics'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
                  onChange={(e) => { setFamilyParshah(e.target.checked); setError('') }}
                />
                <span>Family Parshah &amp; Holiday links</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={kidsParshah}
                  onChange={(e) => { setKidsParshah(e.target.checked); setError('') }}
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
              onChange={(e) => setReminderTime(e.target.value)}
            />
            <span className="field-hint">
              on the day of each candle lighting (Shabbat &amp; holidays)
            </span>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="message error-message" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="message success-message" role="status">
              ✓ Calendar downloaded! Import it into Google Calendar, Apple Calendar, or Outlook.
            </div>
          )}

          {/* CTA */}
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-text">
                <span className="spinner" aria-hidden="true" />
                Generating…
              </span>
            ) : (
              'Generate Calendar ↓'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
