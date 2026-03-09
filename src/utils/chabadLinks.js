/**
 * Static map of holiday names (as returned by HebCal) to Chabad.org URLs.
 * Family links go to the main holiday landing page.
 * Kids links go to the /kids/ subsection where available.
 */
export const HOLIDAY_LINKS = {
  // Passover
  'Pesach I': {
    family: 'https://www.chabad.org/holidays/passover/',
    kids: 'https://www.chabad.org/holidays/passover/kids/',
  },
  'Pesach II': {
    family: 'https://www.chabad.org/holidays/passover/',
    kids: 'https://www.chabad.org/holidays/passover/kids/',
  },
  'Pesach VII': {
    family: 'https://www.chabad.org/holidays/passover/',
    kids: 'https://www.chabad.org/holidays/passover/kids/',
  },
  'Pesach VIII': {
    family: 'https://www.chabad.org/holidays/passover/',
    kids: 'https://www.chabad.org/holidays/passover/kids/',
  },
  // Shavuot
  'Shavuot I': {
    family: 'https://www.chabad.org/holidays/shavuot/',
    kids: 'https://www.chabad.org/holidays/shavuot/kids/',
  },
  'Shavuot II': {
    family: 'https://www.chabad.org/holidays/shavuot/',
    kids: 'https://www.chabad.org/holidays/shavuot/kids/',
  },
  // Rosh Hashana
  'Rosh Hashana I': {
    family: 'https://www.chabad.org/holidays/jewishnewyear/',
    kids: 'https://www.chabad.org/holidays/jewishnewyear/kids/',
  },
  'Rosh Hashana II': {
    family: 'https://www.chabad.org/holidays/jewishnewyear/',
    kids: 'https://www.chabad.org/holidays/jewishnewyear/kids/',
  },
  // Yom Kippur
  'Yom Kippur': {
    family: 'https://www.chabad.org/holidays/yomkippur/',
    kids: 'https://www.chabad.org/holidays/yomkippur/kids/',
  },
  // Sukkot
  'Sukkot I': {
    family: 'https://www.chabad.org/holidays/sukkot/',
    kids: 'https://www.chabad.org/holidays/sukkot/kids/',
  },
  'Sukkot II': {
    family: 'https://www.chabad.org/holidays/sukkot/',
    kids: 'https://www.chabad.org/holidays/sukkot/kids/',
  },
  // Shemini Atzeret & Simchat Torah
  'Shemini Atzeret': {
    family: 'https://www.chabad.org/holidays/sukkot/article_cdo/aid/4729/jewish/Shemini-Atzeret.htm',
    kids: 'https://www.chabad.org/holidays/sukkot/kids/',
  },
  'Simchat Torah': {
    family: 'https://www.chabad.org/holidays/simchat-torah/',
    kids: 'https://www.chabad.org/holidays/simchat-torah/kids/',
  },
}

/**
 * Constructs Chabad.org links for a weekly parshah from HebCal's parshah title.
 * HebCal titles look like "Parashat Vayakhel" or "Parashat Vayakhel-Pekudei".
 * Returns { family, kids }.
 */
export function getChabadParshaLinks(parshaTitle) {
  // Strip "Parashat " prefix → e.g. "Vayakhel" or "Vayakhel-Pekudei"
  const name = parshaTitle.replace(/^Parashat\s+/i, '').trim()
  return {
    family: `https://www.chabad.org/parshah/article_cdo/jewish/${name}.htm`,
    kids: `https://www.chabad.org/kids/article_cdo/jewish/${name}.htm`,
  }
}

/**
 * Looks up Chabad.org links for a holiday title from HebCal.
 * Returns { family, kids } or null if not found.
 */
export function getHolidayLinks(holidayTitle) {
  if (!holidayTitle) return null

  // Exact match
  if (HOLIDAY_LINKS[holidayTitle]) return HOLIDAY_LINKS[holidayTitle]

  // Partial match (e.g. HebCal might return "Pesach" instead of "Pesach I")
  for (const [key, value] of Object.entries(HOLIDAY_LINKS)) {
    if (holidayTitle.startsWith(key) || key.startsWith(holidayTitle)) {
      return value
    }
  }

  return null
}
