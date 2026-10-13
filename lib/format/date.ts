const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "Wed, 30 Sep 2026" */
export const formatDate = (iso: string) => dateFormatter.format(new Date(iso))

/** "14:22" */
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso))

/** "Wed, 30 Sep 2026, 14:22" */
export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso))

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  )
}

export interface RelativeDateOptions {
  now?: Date
  uppercase?: boolean
}

/**
 * Formats a date relative to today/yesterday or returns the formatted calendar date.
 *
 * Matching the Transactions page UI:
 * - Today: "TODAY"
 * - Yesterday: "YESTERDAY"
 * - Other dates: "MON, 5 OCT 2026"
 *
 * With `uppercase: false`:
 * - Today: "Today"
 * - Yesterday: "Yesterday"
 * - Other dates: "Mon, 5 Oct 2026"
 */
export function formatRelativeDate(
  input: string | Date | number,
  nowOrOptions?: Date | RelativeDateOptions
): string {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''

  let now = new Date()
  let uppercase = true

  if (nowOrOptions instanceof Date) {
    now = nowOrOptions
  } else if (nowOrOptions) {
    if (nowOrOptions.now) now = nowOrOptions.now
    if (nowOrOptions.uppercase !== undefined) uppercase = nowOrOptions.uppercase
  }

  if (isSameDay(d, now)) {
    return uppercase ? 'TODAY' : 'Today'
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (isSameDay(d, yesterday)) {
    return uppercase ? 'YESTERDAY' : 'Yesterday'
  }

  const formatted = dateFormatter.format(d)
  return uppercase ? formatted.toUpperCase() : formatted
}
