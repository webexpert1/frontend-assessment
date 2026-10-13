'use client'

import { Suspense, useEffect, useState, useMemo, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { ApiErrorBody, Transaction, TransactionType, TransactionStatus } from '@/types/api'
import { Card, Button, Input, Select, Drawer, Icon } from '@/components/ui'
import { TransactionRow } from '@/components/transactions'
import { getTransactions, getTransaction, type TransactionQuery as ApiTransactionQuery } from '@/lib/api/endpoints'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS, groupTransactionsByDate } from '@/lib/format'
import { cx } from '@/lib/cx'
import styles from './page.module.css'
import TransactionDetails from '@/components/transactions/TransactionDetails'

const TRANSACTION_TYPES: readonly TransactionType[] = [
  'deposit',
  'withdrawal',
  'transfer_in',
  'transfer_out',
  'conversion',
  'card_payment',
  'bill_payment',
]

const TRANSACTION_STATUSES: readonly TransactionStatus[] = ['successful', 'pending', 'failed']
type TransactionQuery = ApiTransactionQuery & { page: number; limit: number }

class TransactionApiError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'TransactionApiError'
  }
}

function unwrapResponse<T>(response: unknown): T {
  const body = response as { data?: T; error?: ApiErrorBody['error'] }
  if (body?.error) throw new TransactionApiError(body.error.message, body.error.code)
  if (!body || !('data' in body)) throw new Error('The server returned an invalid response.')
  return body.data as T
}

interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

function TransactionsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // Derive filter state directly from URL search params (single source of truth)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const type = (searchParams.get('type') as TransactionType) || undefined
  const status = (searchParams.get('status') as TransactionStatus) || undefined
  const q = searchParams.get('q') || undefined
  const txIdParam = searchParams.get('id') || null

  const query = useMemo<TransactionQuery>(
    () => ({ page, limit: 20, type, status, q }),
    [page, type, status, q]
  )

  const hasActiveFilters = Boolean(type || status || q)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingNext, setIsFetchingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drawer state for direct URL inspection
  const [fetchedDetails, setFetchedDetails] = useState<Transaction | null>(null)
  const [detailsNotFound, setDetailsNotFound] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  // Update URL helper
  const updateUrl = useCallback(
    (params: { page?: number; type?: string; status?: string; q?: string; id?: string | null }) => {
      const nextParams = new URLSearchParams()
      if (params.page && params.page > 1) nextParams.set('page', String(params.page))
      if (params.type) nextParams.set('type', params.type)
      if (params.status) nextParams.set('status', params.status)
      if (params.q) nextParams.set('q', params.q)
      if (params.id) nextParams.set('id', params.id)

      const qs = nextParams.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router]
  )

  // Fetch transactions whenever query changes
  useEffect(() => {
    let ignore = false

    getTransactions(query)
      .then((res) => {
        const data = unwrapResponse<Transaction[]>(res)
        if (!ignore) {
          setTransactions(data)
          if ('meta' in res && res.meta) setMeta(res.meta)
          setError(null)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setTransactions([])
          setError(err instanceof Error ? err.message : 'Failed to load transactions')
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false)
          setIsFetchingNext(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [query])

  // Fetch single transaction if opened via link and not currently in list
  useEffect(() => {
    if (!txIdParam) return

    let ignore = false

    getTransaction(txIdParam)
      .then((res) => {
        const transaction = unwrapResponse<Transaction>(res)
        if (!ignore) {
          setFetchedDetails(transaction)
          setDetailsNotFound(false)
          setDetailsError(null)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setFetchedDetails(null)
          if (err instanceof TransactionApiError && err.code === 'NOT_FOUND') {
            setDetailsNotFound(true)
            setDetailsError(null)
          } else {
            setDetailsNotFound(false)
            setDetailsError(err instanceof Error ? err.message : 'Failed to load transaction details')
          }
        }
      })

    return () => {
      ignore = true
    }
  }, [txIdParam])

  const handleQueryChange = (key: 'q' | 'type' | 'status', value: string | undefined) => {
    setIsFetchingNext(true)
    updateUrl({
      page: 1,
      type: key === 'type' ? value : type,
      status: key === 'status' ? value : status,
      q: key === 'q' ? value : q,
      id: txIdParam,
    })
  }

  const handlePageChange = (newPage: number) => {
    setIsFetchingNext(true)
    updateUrl({
      page: newPage,
      type,
      status,
      q,
      id: txIdParam,
    })
  }

  const clearFilters = () => {
    setIsFetchingNext(true)
    updateUrl({ page: 1, id: txIdParam })
  }

  const handleSelectTransaction = (tx: Transaction) => {
    setFetchedDetails(tx)
    setDetailsNotFound(false)
    setDetailsError(null)
    updateUrl({ page, type, status, q, id: tx.id })
  }

  const handleCloseDrawer = () => {
    setFetchedDetails(null)
    setDetailsNotFound(false)
    setDetailsError(null)
    updateUrl({ page, type, status, q, id: null })
  }

  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
    getTransactions(query)
      .then((res) => {
        setTransactions(unwrapResponse<Transaction[]>(res))
        if (res.meta) setMeta(res.meta)
      })
      .catch((err) => {
        setTransactions([])
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const getPageNumbers = () => {
    const total = meta.totalPages
    const current = meta.page
    const pages: (number | string)[] = []

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, '...', total)
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 2, total - 1, total)
      } else {
        pages.push(1, '...', current, '...', total)
      }
    }
    return pages
  }

  // Active selected transaction: priority to list item, then fetchedDetails
  const selected = useMemo(() => {
    if (!txIdParam) return null
    return transactions.find((t) => t.id === txIdParam) ?? fetchedDetails
  }, [txIdParam, transactions, fetchedDetails])

  const isDetailsLoading = Boolean(txIdParam && !selected && !detailsNotFound)
  const isDrawerOpen = Boolean(txIdParam)

  const isInitialLoad = isLoading && transactions.length === 0
  const isFilteredEmpty = !isLoading && !error && transactions.length === 0 && hasActiveFilters
  const isTotalEmpty = !isLoading && !error && transactions.length === 0 && !hasActiveFilters
  const isErrorState = !isLoading && Boolean(error) && transactions.length === 0

  const getSubtitle = () => {
    if (isInitialLoad) return 'Loading…'
    if (isFilteredEmpty) return '0 results'
    if (hasActiveFilters) {
      return meta.total === 1 ? '1 result' : `${meta.total} results`
    }
    return meta.total === 1 ? '1 transaction' : `${meta.total} transactions`
  }

  const startItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const endItem = Math.min(meta.page * meta.limit, meta.total)

  const groupedTransactions = groupTransactionsByDate(transactions)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Transactions</h1>
        <p className={styles.subtitle}>{getSubtitle()}</p>
      </header>

      {/* Filter bar - stays in place in every state */}
      <div className={styles.filtersRow}>
        <Input
          label="Search"
          name="q"
          placeholder="Search by reference, name or narration"
          leadingIcon="search"
          value={q ?? ''}
          onChange={(e) => handleQueryChange('q', e.target.value.trim() || undefined)}
          fieldClassName={styles.searchField}
        />
        <div className={styles.filtersSelects}>
          <Select
            label="Type"
            name="type"
            value={type ?? ''}
            onChange={(e) => handleQueryChange('type', e.target.value || undefined)}
            options={[
              { value: '', label: 'All types' },
              ...TRANSACTION_TYPES.map((t) => ({ value: t, label: TRANSACTION_TYPE_LABELS[t] })),
            ]}
            fieldClassName={styles.typeField}
          />
          <Select
            label="Status"
            name="status"
            value={status ?? ''}
            onChange={(e) => handleQueryChange('status', e.target.value || undefined)}
            options={[
              { value: '', label: 'All statuses' },
              ...TRANSACTION_STATUSES.map((s) => ({ value: s, label: TRANSACTION_STATUS_LABELS[s] })),
            ]}
            fieldClassName={styles.statusField}
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className={styles.clearFiltersBtn}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Main card - renders the 4 list states */}
      <Card className={cx(styles.tableCard, isFetchingNext && styles.tableCardFetching)} padding="none">
        {/* State 1: Loading Skeleton on first load */}
        {isInitialLoad && (
          <div className={styles.tableBody}>
            <div className={styles.skeletonHeaderBar} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonMain}>
                  <div className={styles.skeletonBarLong} />
                  <div className={styles.skeletonBarMedium} />
                </div>
                <div className={styles.skeletonEnd}>
                  <div className={styles.skeletonBarShort} />
                  <div className={styles.skeletonBarTiny} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* State 2: Filtered - no results */}
        {isFilteredEmpty && (
          <div className={styles.emptyState}>
            <div className={cx(styles.emptyStateIcon, styles.emptyStateIconPrimary)}>
              <Icon name="search" size={22} />
            </div>
            <h3 className={styles.emptyStateTitle}>No transactions match your filters</h3>
            <p className={styles.emptyStateSubtitle}>Try a different search term or remove some filters.</p>
            <div className={styles.emptyStateAction}>
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        )}

        {/* State 3: Empty - no transactions at all */}
        {isTotalEmpty && (
          <div className={styles.emptyState}>
            <div className={cx(styles.emptyStateIcon, styles.emptyStateIconPrimary)}>
              <Icon name="inbox" size={22} />
            </div>
            <h3 className={styles.emptyStateTitle}>No transactions yet</h3>
            <p className={styles.emptyStateSubtitle}>
              When you add money, send a transfer or pay with your card, it will show up here.
            </p>
          </div>
        )}

        {/* State 4: Error */}
        {isErrorState && (
          <div className={styles.emptyState}>
            <div className={cx(styles.emptyStateIcon, styles.emptyStateIconDanger)}>
              <Icon name="alert" size={22} />
            </div>
            <h3 className={styles.emptyStateTitle}>We couldn&apos;t load your transactions</h3>
            <p className={styles.emptyStateSubtitle}>Check your connection and try again.</p>
            <div className={styles.emptyStateAction}>
              <Button variant="primary" iconLeft="refresh" onClick={handleRetry}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Normal populated state */}
        {!isInitialLoad && !isFilteredEmpty && !isTotalEmpty && !isErrorState && transactions.length > 0 && (
          <div className={styles.tableBody}>
            {groupedTransactions.map((group) => (
              <section key={group.key} className={styles.dateGroupContainer}>
                <h2 className={styles.dateHeader}>{group.label}</h2>
                {group.transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    showTimeOnly
                    safeNarration
                    accurateFee
                    onSelect={handleSelectTransaction}
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination below the card */}
      {!isInitialLoad && !isFilteredEmpty && !isTotalEmpty && !isErrorState && meta.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {startItem}–{endItem} of {meta.total}
          </span>

          <div className={styles.paginationControls}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft="chevron-left"
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>

            <div className={styles.pageNumbers}>
              {getPageNumbers().map((p, idx) =>
                typeof p === 'number' ? (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    className={cx(styles.pageBtn, page === p && styles.activePageBtn)}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={idx} className={styles.paginationEllipsis}>
                    {p}
                  </span>
                )
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              iconRight="chevron-right"
              disabled={page === meta.totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Details Drawer */}
      <Drawer open={isDrawerOpen} title="Transaction details" onClose={handleCloseDrawer}>
        {/* State 5: Details - loading (opened from a link) */}
        {isDetailsLoading && (
          <div className={styles.detailsSkeleton}>
            <div className={styles.detailsSkeletonHeader}>
              <div className={styles.skeletonCircleLarge} />
              <div className={styles.skeletonDrawerTitle} />
              <div className={styles.skeletonDrawerAmount} />
              <div className={styles.skeletonDrawerBadge} />
            </div>
            <div className={styles.skeletonDivider} />
            <div className={styles.detailsSkeletonList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.detailsSkeletonRow}>
                  <div className={styles.skeletonDrawerLabel} />
                  <div className={styles.skeletonDrawerValue} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State 6: Details - not found */}
        {!isDetailsLoading && detailsNotFound && (
          <div className={styles.detailsNotFound}>
            <div className={cx(styles.emptyStateIcon, styles.emptyStateIconPrimary)}>
              <Icon name="search" size={22} />
            </div>
            <h3 className={styles.emptyStateTitle}>Transaction not found</h3>
            <p className={styles.emptyStateSubtitle}>It may have been removed, or the link is wrong.</p>
            <div className={styles.emptyStateAction}>
              <Button variant="secondary" onClick={handleCloseDrawer}>
                Back to transactions
              </Button>
            </div>
          </div>
        )}

        {!isDetailsLoading && detailsError && (
          <div className={styles.detailsNotFound}>
            <div className={cx(styles.emptyStateIcon, styles.emptyStateIconDanger)}>
              <Icon name="alert" size={22} />
            </div>
            <h3 className={styles.emptyStateTitle}>We couldn&apos;t load this transaction</h3>
            <p className={styles.emptyStateSubtitle}>{detailsError}</p>
          </div>
        )}

        {/* Details Loaded */}
        {!isDetailsLoading && !detailsNotFound && !detailsError && selected && <TransactionDetails transaction={selected} />}
      </Drawer>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <header className={styles.header}>
            <h1 className={styles.title}>Transactions</h1>
            <p className={styles.subtitle}>Loading…</p>
          </header>
          <div className={styles.tableCard}>
            <div className={styles.skeletonHeaderBar} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonMain}>
                  <div className={styles.skeletonBarLong} />
                  <div className={styles.skeletonBarMedium} />
                </div>
                <div className={styles.skeletonEnd}>
                  <div className={styles.skeletonBarShort} />
                  <div className={styles.skeletonBarTiny} />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  )
}
