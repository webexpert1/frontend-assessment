'use client'

import { useState } from 'react'
import type { Transaction, TransactionStatus, TransactionType } from '@/types/api'
import { Badge, type BadgeTone, Icon, type IconName } from '@/components/ui'
import {
  formatDateTime,
  formatMoney,
  sanitizeNarration,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/format'
import styles from './TransactionDetails.module.css'

const TYPE_ICONS: Record<TransactionType, IconName> = {
  deposit: 'arrow-down-left',
  transfer_in: 'arrow-down-left',
  withdrawal: 'arrow-up-right',
  transfer_out: 'arrow-up-right',
  conversion: 'swap',
  card_payment: 'card',
  bill_payment: 'receipt',
}

const STATUS_TONES: Record<TransactionStatus, BadgeTone> = {
  successful: 'success',
  pending: 'warning',
  failed: 'danger',
  reversed: 'neutral',
}

const CREDIT_TYPES: TransactionType[] = ['deposit', 'transfer_in', 'conversion']

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function getHeroSubtitle(tx: Transaction): string {
  if (tx.counterparty) {
    if (tx.type === 'transfer_out') return `Transfer out to ${tx.counterparty}`
    if (tx.type === 'transfer_in') return `Transfer from ${tx.counterparty}`
    return `${TRANSACTION_TYPE_LABELS[tx.type]} - ${tx.counterparty}`
  }
  return sanitizeNarration(tx.narration) || TRANSACTION_TYPE_LABELS[tx.type]
}

export interface TransactionDetailsProps {
  transaction: Transaction
}

export function TransactionDetails({ transaction: tx }: TransactionDetailsProps) {
  const [copied, setCopied] = useState(false)

  const isCredit = CREDIT_TYPES.includes(tx.type)
  const initials = tx.counterparty ? getInitials(tx.counterparty) : null
  const heroSubtitle = getHeroSubtitle(tx)
  const prefix = isCredit ? '+' : '−'
  const formattedAmount = formatMoney(tx.amount, tx.currency)
  const totalAmount = tx.amount + tx.fee

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(tx.reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback in environments without clipboard permissions
      const textarea = document.createElement('textarea')
      textarea.value = tx.reference
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {initials ? (
            <span className={styles.initials}>{initials}</span>
          ) : (
            <Icon name={TYPE_ICONS[tx.type]} size={24} />
          )}
        </div>
        <p className={styles.subtitle}>{heroSubtitle}</p>
        <div className={styles.amount}>
          {prefix}
          {formattedAmount}
        </div>
        <div className={styles.statusBadge}>
          <Badge tone={STATUS_TONES[tx.status]} dot>
            {TRANSACTION_STATUS_LABELS[tx.status]}
          </Badge>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Details Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>DETAILS</h3>
        <dl className={styles.list}>
          <div className={styles.row}>
            <dt className={styles.label}>Reference</dt>
            <dd className={styles.value}>
              <span className={styles.referenceText}>{tx.reference}</span>
              <button
                type="button"
                className={styles.copyButton}
                onClick={handleCopyReference}
                title={copied ? 'Copied!' : 'Copy reference'}
                aria-label="Copy reference"
              >
                <Icon name={copied ? 'check' : 'copy'} size={15} />
              </button>
            </dd>
          </div>

          <div className={styles.row}>
            <dt className={styles.label}>Date</dt>
            <dd className={styles.value}>{formatDateTime(tx.createdAt)}</dd>
          </div>

          <div className={styles.row}>
            <dt className={styles.label}>Type</dt>
            <dd className={styles.value}>{TRANSACTION_TYPE_LABELS[tx.type]}</dd>
          </div>

          {tx.counterparty && (
            <div className={styles.row}>
              <dt className={styles.label}>Counterparty</dt>
              <dd className={styles.value}>{tx.counterparty}</dd>
            </div>
          )}

          {tx.narration && (
            <div className={styles.row}>
              <dt className={styles.label}>Narration</dt>
              <dd className={styles.value}>{sanitizeNarration(tx.narration)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Summary Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>SUMMARY</h3>
        <dl className={styles.list}>
          <div className={styles.row}>
            <dt className={styles.label}>Amount</dt>
            <dd className={styles.value}>{formatMoney(tx.amount, tx.currency)}</dd>
          </div>

          <div className={styles.row}>
            <dt className={styles.label}>Fee</dt>
            <dd className={styles.value}>{formatMoney(tx.fee, tx.currency)}</dd>
          </div>

          <div className={styles.summaryDivider} />

          <div className={styles.row}>
            <dt className={styles.totalLabel}>Total</dt>
            <dd className={styles.totalValue}>{formatMoney(totalAmount, tx.currency)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
