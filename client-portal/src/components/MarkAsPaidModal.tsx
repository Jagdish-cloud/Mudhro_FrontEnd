import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatCurrency, Currency } from "@/lib/currency";
import { paymentService, PaymentCreateData, PaymentUpdateData } from "@/lib/services/paymentService";
import { invoiceService } from "@/lib/services/invoiceService";
import { toast } from "sonner";

interface MarkAsPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  invoiceAmount: number;
  currency?: Currency;
  isPaid?: boolean;
  existingPaymentId?: number;
  onPaymentRecorded?: () => void;
}

const MarkAsPaidModal = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceAmount,
  currency = "INR",
  isPaid = false,
  existingPaymentId,
  onPaymentRecorded,
}: MarkAsPaidModalProps) => {
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [paymentGatewayFee, setPaymentGatewayFee] = useState<string>("0");
  const [tdsDeducted, setTdsDeducted] = useState<string>("0");
  const [otherDeduction, setOtherDeduction] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [loadedPaymentId, setLoadedPaymentId] = useState<number | undefined>(undefined);

  // Load existing payment data when modal opens for paid invoices
  useEffect(() => {
    if (open && isPaid) {
      setIsLoadingPayment(true);
      paymentService
        .getPaymentsByInvoiceId(invoiceId)
        .then((payments) => {
          if (payments.length > 0) {
            const payment = payments[0]; // Most recent payment
            setAmountReceived(payment.amountReceived.toString());
            setPaymentGatewayFee(payment.paymentGatewayFee.toString());
            setTdsDeducted(payment.tdsDeducted.toString());
            setOtherDeduction(payment.otherDeduction.toString());
            setLoadedPaymentId(payment.id); // Store payment ID for updates
            setIsManualOverride(true); // Don't auto-calculate when loading existing data
          } else {
            setLoadedPaymentId(undefined);
          }
        })
        .catch((error) => {
          console.error("Error loading payment:", error);
          toast.error("Failed to load payment data");
          setLoadedPaymentId(undefined);
        })
        .finally(() => {
          setIsLoadingPayment(false);
        });
    } else if (open && !isPaid) {
      // Reset form for new payments
      setAmountReceived(invoiceAmount.toString());
      setPaymentGatewayFee("0");
      setTdsDeducted("0");
      setOtherDeduction("0");
      setLoadedPaymentId(undefined);
      setIsManualOverride(false);
    }
  }, [open, invoiceId, isPaid, invoiceAmount]);

  // Auto-calculate amountReceived when deductions change (only if not manual override)
  useEffect(() => {
    if (!isManualOverride && open) {
      const gatewayFee = parseFloat(paymentGatewayFee) || 0;
      const tds = parseFloat(tdsDeducted) || 0;
      const other = parseFloat(otherDeduction) || 0;
      const totalDeductions = gatewayFee + tds + other;
      const calculatedAmountReceived = invoiceAmount - totalDeductions;
      
      // Only update if calculated value is valid (non-negative)
      if (calculatedAmountReceived >= 0) {
        setAmountReceived(calculatedAmountReceived.toString());
      }
    }
  }, [paymentGatewayFee, tdsDeducted, otherDeduction, invoiceAmount, isManualOverride, open]);

  // Reset manual override flag when user manually edits amountReceived
  const handleAmountReceivedChange = (value: string) => {
    setAmountReceived(value);
    setIsManualOverride(true);
  };

  const calculateDifference = (): number => {
    const received = parseFloat(amountReceived) || 0;
    return invoiceAmount - received;
  };

  const calculateFinalAmount = (): number => {
    const received = parseFloat(amountReceived) || 0;
    const gatewayFee = parseFloat(paymentGatewayFee) || 0;
    const tds = parseFloat(tdsDeducted) || 0;
    const other = parseFloat(otherDeduction) || 0;
    return received - gatewayFee - tds - other;
  };

  const handleSubmit = async () => {
    // Validation
    const received = parseFloat(amountReceived);
    if (!received || received <= 0) {
      toast.error("Amount received must be greater than 0");
      return;
    }

    if (received > invoiceAmount) {
      toast.error("Amount received cannot exceed invoice amount");
      return;
    }

    const gatewayFee = parseFloat(paymentGatewayFee) || 0;
    const tds = parseFloat(tdsDeducted) || 0;
    const other = parseFloat(otherDeduction) || 0;

    if (gatewayFee < 0 || tds < 0 || other < 0) {
      toast.error("Deductions cannot be negative");
      return;
    }

    // Prevent negative amountReceived after deductions
    const totalDeductions = gatewayFee + tds + other;
    if (received < totalDeductions) {
      toast.error("Amount received cannot be less than total deductions");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use loadedPaymentId if available, otherwise fall back to existingPaymentId from props
      const paymentIdToUpdate = loadedPaymentId || existingPaymentId;
      
      if (isPaid && paymentIdToUpdate) {
        // Update existing payment
        const updateData: PaymentUpdateData = {
          amountReceived: received,
          paymentGatewayFee: gatewayFee > 0 ? gatewayFee : 0,
          tdsDeducted: tds > 0 ? tds : 0,
          otherDeduction: other > 0 ? other : 0,
        };

        await paymentService.updatePayment(paymentIdToUpdate, updateData);
        toast.success("Payment updated successfully");
      } else {
        // Create new payment
        const paymentData: PaymentCreateData = {
          invoiceId,
          amountReceived: received,
          paymentGatewayFee: gatewayFee > 0 ? gatewayFee : undefined,
          tdsDeducted: tds > 0 ? tds : undefined,
          otherDeduction: other > 0 ? other : undefined,
        };

        await paymentService.createPayment(paymentData);

        // Update invoice status to paid
        await invoiceService.updateInvoice(invoiceId, { status: "paid" });
        toast.success("Invoice marked as paid successfully");
      }

      onOpenChange(false);

      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const difference = calculateDifference();
  const finalAmount = calculateFinalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isPaid ? "Payment Details" : "Mark Invoice as Paid"}</DialogTitle>
        </DialogHeader>

        {isLoadingPayment ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading payment data...</span>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-4 py-4">
          {/* Invoice Amount (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="invoiceAmount">Invoice amount</Label>
            <Input
              id="invoiceAmount"
              value={formatCurrency(invoiceAmount, currency)}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Amount Received */}
          <div className="space-y-2">
            <Label htmlFor="amountReceived">Amount received (in bank)</Label>
            <Input
              id="amountReceived"
              type="number"
              step="0.01"
              min="0"
              value={amountReceived}
              onChange={(e) => handleAmountReceivedChange(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Auto-calculated from deductions. You can manually override.
            </p>
          </div>

          {/* Deductions Section (Always Visible) */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Deductions</Label>
            
            <div className="space-y-2">
              <Label htmlFor="paymentGatewayFee">Payment gateway fee</Label>
              <Input
                id="paymentGatewayFee"
                type="number"
                step="0.01"
                min="0"
                value={paymentGatewayFee}
                onChange={(e) => {
                  setPaymentGatewayFee(e.target.value);
                  setIsManualOverride(false); // Re-enable auto-calculation
                }}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdsDeducted">TDS deducted</Label>
              <Input
                id="tdsDeducted"
                type="number"
                step="0.01"
                min="0"
                value={tdsDeducted}
                onChange={(e) => {
                  setTdsDeducted(e.target.value);
                  setIsManualOverride(false); // Re-enable auto-calculation
                }}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherDeduction">Other deduction</Label>
              <Input
                id="otherDeduction"
                type="number"
                step="0.01"
                min="0"
                value={otherDeduction}
                onChange={(e) => {
                  setOtherDeduction(e.target.value);
                  setIsManualOverride(false); // Re-enable auto-calculation
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Difference (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="difference">Difference</Label>
            <Input
              id="difference"
              value={formatCurrency(difference, currency)}
              readOnly
              className={`bg-muted ${
                difference !== 0 ? "text-destructive" : ""
              }`}
            />
            <p className="text-xs text-muted-foreground">
              Invoice Amount - Amount Received (in bank)
            </p>
          </div>
          </div>
        )}

        <DialogFooter className="mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoadingPayment}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingPayment}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isPaid ? (
              "Update Payment"
            ) : (
              "Mark as Paid"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkAsPaidModal;

