import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Client } from "@/lib/services/clientService";
import { Link } from "react-router-dom";
import { formatDisplayDate } from "@/lib/date";
import { formatCurrency, Currency, ALL_CURRENCIES } from "@/lib/currency";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoicePreviewProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client?: Client;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency?: Currency;
  notes?: string;
  installments?: number;
  currentInstallment?: number;
  inclusiveGST?: boolean;
  // new props:
  detectedCountry?: string;
  taxRate?: number;
  userLogoUrl?: string;
  userGstin?: string;
  userPan?: string;
  // Payment terms props
  paymentTerms?: 'full' | 'advance_balance';
  advanceAmount?: number | null;
  balanceDue?: number | null;
}

const InvoicePreview = ({
  invoiceNumber,
  issueDate,
  dueDate,
  client,
  items,
  subtotal,
  tax,
  total,
  currency = "INR",
  notes,
  installments,
  currentInstallment,
  inclusiveGST,
  detectedCountry = "Other",
  taxRate = 0,
  userLogoUrl,
  userGstin,
  userPan,
  paymentTerms,
  advanceAmount,
  balanceDue,
}: InvoicePreviewProps) => {
  // Decide label based on detected country
  const getTaxLabel = (country?: string) => {
    if (!country) return "Tax";
    const c = country.toLowerCase();
    if (c === "india") return "GST";
    if (c === "uk") return "VAT";
    if (c === "australia") return "GST";
    return "Tax";
  };

  const taxLabel = getTaxLabel(detectedCountry);
  const taxPercent = taxRate && taxRate > 0 ? `${(taxRate * 100).toFixed(0)}%` : null;

  // Friendly tax line text
  const taxLineLabel = taxPercent ? `${taxLabel} @${taxPercent}` : inclusiveGST ? `${taxLabel} (included)` : taxLabel;
  const showTaxDetails = Boolean(userGstin) && (taxPercent || tax > 0);

  return (
    <Card>
      <CardHeader data-html2canvas-ignore="true">
        <CardTitle>Live Invoice Preview</CardTitle>
      </CardHeader>
      <CardContent className="bg-card">
        {/* Invoice Header */}
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">INVOICE</h2>
              <p className="text-sm text-muted-foreground">Invoice #</p>
              <p className="font-medium">{invoiceNumber}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              {userLogoUrl ? (
                <img
                  src={userLogoUrl}
                  alt="Company logo"
                  crossOrigin="anonymous"
                  className="object-contain rounded border"
                  style={{ width: 100, height: 100 }}
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-muted text-muted-foreground border rounded"
                  style={{ width: 100, height: 100 }}
                >
                  <span className="text-sm">No Logo</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Date: {issueDate ? formatDisplayDate(issueDate) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To & Due Date */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Bill To:</p>
            {client ? (
              <>
                <p className="font-medium">{client.fullName}</p>
                {client.organization && (
                  <p className="text-sm text-muted-foreground">{client.organization}</p>
                )}
                {client.email && (
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                )}
                {client.mobileNumber && (
                  <p className="text-sm text-muted-foreground">{client.mobileNumber}</p>
                )}
                {client.gstin && (
                  <p className="text-sm text-muted-foreground">GSTIN: {client.gstin}</p>
                )}
                {client.pan && (
                  <p className="text-sm text-muted-foreground">PAN: {client.pan}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">No client selected</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Due Date:</p>
            <p className="font-medium">{dueDate ? formatDisplayDate(dueDate) : "—"}</p>
          </div>
        </div>

        {/* Items Table */}
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

        {/* Totals */}
        <div className="space-y-2 ml-auto w-64">
          {showTaxDetails && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{taxLineLabel}</span>
                <span>
                  {formatCurrency(tax, currency)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total</span>
            <span>
              {formatCurrency(total, currency)}
            </span>
          </div>

          {/* Payment Terms Breakdown (Advance + Balance) */}
          {paymentTerms === 'advance_balance' && advanceAmount !== null && balanceDue !== null && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Advance</span>
                <span>{formatCurrency(advanceAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance due:</span>
                <span>{formatCurrency(balanceDue, currency)}</span>
              </div>
            </div>
          )}
        </div>

        {/* User Tax Details */}
        {(userGstin || userPan) && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Tax Details</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {userGstin && <p>GSTIN: {userGstin}</p>}
              {userPan && <p>PAN: {userPan}</p>}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">{notes}</p>
          </div>
        )}

        {/* Mudhro Footer */}
        <div className="text-sm text-muted-foreground text-center mt-8 border-t-[2px] border-dashed pt-4">
          Generated with <Link className="underline" to="/">Mudhro</Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicePreview;
