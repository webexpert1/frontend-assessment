import type { Transaction, TransactionType } from '@/types/api'
import { Icon, type IconName, Money } from '@/components/ui'
import { formatTime, formatLongText, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import { StatusDot } from './StatusDot'
import styles from './TransactionRow.module.css'

const TYPE_ICONS: Record<TransactionType, IconName> = {
  deposit: 'arrow-down-left',
  transfer_in: 'arrow-down-left',
  withdrawal: 'arrow-up-right',
  transfer_out: 'arrow-up-right',
  conversion: 'swap',
  card_payment: 'card',
  bill_payment: 'receipt',
}

const CREDIT_TYPES: TransactionType[] = ['deposit', 'transfer_in', 'conversion']

export interface TransactionRowProps {
  transaction: Transaction
  onSelect?: (transaction: Transaction) => void
  showTimeOnly?: boolean
  safeNarration?: boolean
  accurateFee?: boolean
}

export function TransactionRow({ transaction: tx, onSelect, showTimeOnly = false, safeNarration = false, accurateFee = false }: TransactionRowProps) {
  const isCredit = CREDIT_TYPES.includes(tx.type)

  return (
    <button type="button" className={styles.row} onClick={() => onSelect?.(tx)}>
      <span className={styles.icon}>
        <Icon name={TYPE_ICONS[tx.type]} size={18} />
      </span>
      <span className={styles.main}>
        <span className={styles.title}>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
        {safeNarration ? (
          <span className={styles.narration}>{formatLongText(tx.narration)}</span>
        ) : (
          <span className={styles.narration} dangerouslySetInnerHTML={{ __html: formatLongText(tx.narration) }} />
        )}
      </span>

      <span className={styles.status}>
        <StatusDot status={tx.status} />
      </span>
      <span className={styles.end}>
        <Money
          amount={tx.amount}
          currency={tx.currency}
          sign={isCredit ? 'credit' : 'debit'}
          className={isCredit ? styles.credit : styles.amount}
        />
        <span className={styles.meta}>
          {formatTime(tx.createdAt)}
          {tx.fee > 0 && (
            accurateFee ? <> · Fee <Money amount={tx.fee} currency={tx.currency} /></> : ` · Fee ₦${tx.fee}`
          )}
        </span>
      </span>
    </button>
  )
}
