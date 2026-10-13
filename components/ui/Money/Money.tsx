import type { Currency } from '@/types/api'
import { formatMoney } from '@/lib/format/money'
import { cx } from '@/lib/cx'
import styles from './Money.module.css'

export interface MoneyProps {
  /** Minor units. */
  amount: number
  currency: Currency
  /** Prefix with + or -. */
  sign?: 'credit' | 'debit'
  className?: string
}

export function Money({ amount, currency, sign, className }: MoneyProps) {
  const prefix = sign === 'credit' ? '+' : sign === 'debit' ? '-' : ''
  return (
    <span className={cx(styles.money, className)}>
      {prefix}
      {formatMoney(amount, currency)}
    </span>
  )
}
