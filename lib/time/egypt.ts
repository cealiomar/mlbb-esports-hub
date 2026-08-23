export const EGYPT_TIME_ZONE = 'Africa/Cairo'

const egyptDateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: EGYPT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** A stable calendar-day key in Egypt, including Cairo daylight-saving time. */
export function egyptDayKey(unixSeconds: number): string {
  const parts = egyptDateParts.formatToParts(new Date(unixSeconds * 1000))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}
