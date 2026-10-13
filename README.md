# Acme Wallet

A responsive wallet dashboard built with Next.js, React and TypeScript. It includes an overview of wallet balances, transaction history with search and filters, transaction details, and a currency conversion form.

## Run locally

Use Node 24 (the version in `.nvmrc`), then install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses a mock API served by the same Next.js project. See [API.md](./API.md) for its endpoints, data formats, and behavior.

## App pages

- **Dashboard** (`/`) — wallet balances, recent transactions, and exchange rates.
- **Transactions** (`/transactions`) — searchable, paginated transaction history. Filter by transaction type or status, open a transaction to see its details, and use the URL to share the current page or selection. On mobile, the list shows each transaction’s type, narration, amount, and status in a compact row.
- **Convert** (`/convert`) — convert an amount between supported currencies.

Transaction filters and the selected transaction are reflected in the URL. Opening a transaction from the list adds a browser history entry, so Back returns to the same list page and filters.

## Preview API states

The mock API accepts a `__scenario` query parameter on the page URL. For example:

| URL                                             | What to expect                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `/transactions?__scenario=slow`                 | Loading skeleton, followed by the transaction list after a delay |
| `/transactions?__scenario=empty`                | Empty “No transactions yet” state                                |
| `/transactions?__scenario=error`                | List API error state with a retry button                         |
| `/transactions?id=txn_missing&__scenario=slow`  | Detail loading skeleton, followed by “Transaction not found”     |
| `/transactions?id=txn_missing&__scenario=error` | Detail API error state with a retry button                       |

Append the example query to `http://localhost:3000` while the dev server is running. Scenarios are read from the page URL through the API request’s referrer. Without a scenario, about 3% of mock API requests fail randomly. To disable random failures locally, create `.env.local` with:

```env
MOCK_FAILURE_RATE=0
```

## Commands

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the local development server      |
| `npm run build`        | Create a production build               |
| `npm run start`        | Serve the production build              |
| `npm run lint`         | Run ESLint                              |
| `npm run typecheck`    | Run TypeScript without emitting files   |
| `npm test`             | Run the Vitest suite                    |
| `npm run format`       | Format files with Prettier              |
| `npm run format:check` | Check formatting without changing files |

## Project structure

```text
app/                 App Router pages and the mock API routes
components/
  ui/                Shared interface primitives
  dashboard/         Dashboard widgets
  transactions/      Transaction rows, status, and detail views
  layout/            App shell, navigation, and user menu
lib/
  api/               Typed API client and endpoint helpers
  format/            Money, date, and transaction formatting
  mock/              Mock API data and network behavior
styles/tokens.css    Shared design tokens
types/api.ts         API and domain types
```

## Implementation notes

- The mock API lives in `app/api/**` and `lib/mock/**`. Treat it as a service contract; do not import mock data into page or component code.
- Money is represented in integer minor units (for example, NGN kobo). Use `formatMoney` or the `<Money>` component to display it, and `parseMoney` for user input.
- API response and domain types live in `types/api.ts`.
- Components use CSS Modules and shared values from `styles/tokens.css`.

## Stack

Next.js 16 · React 19 · TypeScript · CSS Modules · Vitest · Testing Library
