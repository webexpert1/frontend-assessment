import type { Transaction, TransactionStatus, TransactionType } from '@/types/api'
import { formatRelativeDate } from './date'

export const formatLongText = (narration: string) => {
  return narration.length > 50 ? `${narration.slice(0, 50)}...` : narration
}

/**
 * Strips HTML tags and collapses whitespace from upstream narrations
 * (e.g. `Bill payment - Spectranet <img src="x" onerror="...">` -> `Bill payment - Spectranet`)
 */
export function sanitizeNarration(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  conversion: 'Conversion',
  card_payment: 'Card payment',
  bill_payment: 'Bill payment',
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  successful: 'Successful',
  pending: 'Pending',
  failed: 'Failed',
  reversed: 'Reversed',
}

export interface TransactionDateGroup {
  key: string
  label: string
  transactions: Transaction[]
}
/**
 * Groups transactions by date for UI display with labels like "TODAY", "YESTERDAY", or "MON, 5 OCT 2026".
 */
export function groupTransactionsByDate(
  transactions: Transaction[],
  now = new Date()
): TransactionDateGroup[] {
  const groups = new Map<string, TransactionDateGroup>()

  for (const tx of transactions) {
    const date = new Date(tx.createdAt)
    if (Number.isNaN(date.getTime())) continue

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const label = formatRelativeDate(date, now)

    const group = groups.get(key)
    if (group) {
      group.transactions.push(tx)
    } else {
      groups.set(key, { key, label, transactions: [tx] })
    }
  }

  return [...groups.values()]
}
