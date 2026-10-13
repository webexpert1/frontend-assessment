import type { TransactionStatus } from '@/types/api'
import { cx } from '@/lib/cx'
import { TRANSACTION_STATUS_LABELS } from '@/lib/format'
import styles from './StatusDot.module.css'

export function StatusDot({ status }: { status: TransactionStatus }) {
  const label = TRANSACTION_STATUS_LABELS[status] ?? status

  return (
    <span className={cx(styles.badge, styles[status])} title={label}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
