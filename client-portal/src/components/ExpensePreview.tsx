import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vendor } from "@/lib/services/vendorService";
import { Link } from "react-router-dom";
import { formatDisplayDate } from "@/lib/date";
import { formatCurrency, Currency } from "@/lib/currency";

export interface ExpenseItemPreview {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ExpensePreviewProps {
  billNumber: string;
  billDate: string;
  dueDate: string;
  vendor?: Vendor;
  items: ExpenseItemPreview[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  total: number;
  currency?: Currency;
  notes?: string;
  inclusiveGST?: boolean;
}

const ExpensePreview = ({
  billNumber,
  billDate,
  dueDate,
  vendor,
  items,
  subtotal,
  taxPercentage,
  taxAmount,
  total,
  currency = "INR",
  notes,
  inclusiveGST,
}: ExpensePreviewProps) => {
  return (
    <Card>
      <CardHeader data-html2canvas-ignore="true">
        <CardTitle>Live Expense Preview</CardTitle>
      </CardHeader>
      <CardContent className="bg-card">
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">EXPENSE BILL</h2>
              <p className="text-sm text-muted-foreground">Bill Number</p>
              <p className="font-medium">{billNumber || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Bill Date</p>
              <p className="font-medium">
                {billDate ? formatDisplayDate(billDate) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Bill From:</p>
            {vendor ? (
              <>
                <p className="font-medium">{vendor.fullName}</p>
                {vendor.organization && (
                  <p className="text-sm text-muted-foreground">{vendor.organization}</p>
                )}
                {vendor.email && (
                  <p className="text-sm text-muted-foreground">{vendor.email}</p>
                )}
                {vendor.mobileNumber && (
                  <p className="text-sm text-muted-foreground">{vendor.mobileNumber}</p>
                )}
                {vendor.gstin && (
                  <p className="text-sm text-muted-foreground">GSTIN: {vendor.gstin}</p>
                )}
                {vendor.pan && (
                  <p className="text-sm text-muted-foreground">PAN: {vendor.pan}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">No vendor selected</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Payment Due:</p>
            <p className="font-medium">{dueDate ? formatDisplayDate(dueDate) : "—"}</p>
          </div>
        </div>

        <div className="border rounded-lg mb-6">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-sm font-semibold">Description</th>
                <th className="text-right p-3 text-sm font-semibold">Quantity</th>
                <th className="text-right p-3 text-sm font-semibold">Unit Price</th>
                <th className="text-right p-3 text-sm font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.description || "—"}</td>
                  <td className="text-right p-3">{item.quantity.toLocaleString()}</td>
                  <td className="text-right p-3">
                    {formatCurrency(item.rate, currency)}
                  </td>
                  <td className="text-right p-3 font-medium">
                    {formatCurrency(item.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 ml-auto w-64">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>
              {formatCurrency(subtotal, currency)}
            </span>
          </div>
          {taxPercentage > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Tax ({taxPercentage.toFixed(2)}%)
                {inclusiveGST ? " (included)" : ""}
              </span>
              <span>
                {formatCurrency(taxAmount, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total</span>
            <span>
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>

        {notes && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">{notes}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground text-center mt-8 border-t-[2px] border-dashed pt-4">
          Generated with <Link className="underline" to="/">Mudhro</Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensePreview;


