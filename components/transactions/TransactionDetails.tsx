import { Transaction } from "@/types/api"


export interface TransactionDetailsProps {
    transaction: Transaction
  }
export default function TransactionDetails({ transaction: tx} : TransactionDetailsProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Transaction Details</h1>
      <p className="text-muted-foreground">
        This is a mock transaction details page. In a real application, you would fetch and display the details of a specific transaction here.
      </p>
    </div>
  )
}