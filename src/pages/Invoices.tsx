import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { invoiceService, Invoice } from "@/lib/services/invoiceService";
import { formatCurrency, Currency } from "@/lib/currency";
import { authService } from "@/lib/auth";
import { clientService } from "@/lib/services/clientService";
import { paymentService } from "@/lib/services/paymentService";
import { Plus, Bell, Loader2, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { API_BASE_URL } from "@/lib/api";
import { formatDisplayDate } from "@/lib/date";
import { encodeId } from "@/lib/urlEncoder";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MarkAsPaidModal from "@/components/MarkAsPaidModal";

const STATUS_OPTIONS = ["paid", "pending", "overdue"] as const;

// Helper function to compute invoice status based on due date
const computeInvoiceStatus = (dueDate: string | Date): 'paid' | 'pending' | 'overdue' => {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) {
    return 'overdue';
  }
  return 'pending';
};

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [markAsPaidModalOpen, setMarkAsPaidModalOpen] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);
  const [existingPaymentId, setExistingPaymentId] = useState<number | undefined>(undefined);
  const user = authService.getCurrentUser();
  const userCurrency = (user?.currency as Currency) || 'INR';

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }
    loadInvoices();
  }, [navigate]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const invoicesData = await invoiceService.getInvoices();
      const clients = await clientService.getClients();
      
      // Map invoices with client names
      const invoicesWithClientInfo = invoicesData.map(inv => {
        const client = clients.find(c => c.id === inv.clientId);
        
        // Use status from API, fallback to computed status if not present
        let status: 'paid' | 'pending' | 'overdue' = inv.status || computeInvoiceStatus(inv.dueDate);
        
        return {
          ...inv,
          clientName: client?.fullName || 'Unknown Client',
          status,
        };
      });
      
      setInvoices(invoicesWithClientInfo);
    } catch (error: any) {
      console.error("Failed to load invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = () => {
    loadInvoices();
  };

  const handleOpenPaymentModal = async (invoice: Invoice) => {
    setInvoiceToMarkPaid(invoice);
    
    // If invoice is already paid, fetch existing payment data
    if (invoice.status === 'paid') {
      try {
        const payments = await paymentService.getPaymentsByInvoiceId(invoice.id);
        if (payments.length > 0) {
          setExistingPaymentId(payments[0].id);
        } else {
          setExistingPaymentId(undefined);
        }
      } catch (error) {
        console.error('Error fetching payment:', error);
        setExistingPaymentId(undefined);
      }
    } else {
      setExistingPaymentId(undefined);
    }
    
    setMarkAsPaidModalOpen(true);
  };

  const handleStatusChange = async (invoiceId: number, newStatus: Invoice["status"]) => {
    if (!newStatus) return;
    
    // If trying to mark as paid, open the modal instead
    if (newStatus === 'paid') {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        await handleOpenPaymentModal(invoice);
      }
      return;
    }
    
    try {
      // Optimistically update the UI
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));

      // Update status in backend using the status column
      await invoiceService.updateInvoice(invoiceId, {
        status: newStatus,
      });

      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Failed to update invoice status:", error);
      // Revert optimistic update on error
      loadInvoices();
      toast.error(error.message || "Failed to update invoice status");
    }
  };

  const handlePaymentRecorded = () => {
    loadInvoices();
    setMarkAsPaidModalOpen(false);
    setInvoiceToMarkPaid(null);
  };

  const handleSendReminder = async (invoiceId: number) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        toast.error("Invoice not found");
        return;
      }

      if (invoice.status !== "overdue") {
        toast.error("Reminders can only be sent for overdue invoices.");
        return;
      }

      setSendingReminderId(invoiceId);
      await invoiceService.sendInvoiceEmail(invoiceId, "reminder");

      const clientName = invoice.clientName || "client";

      toast.success(`Reminder sent to ${clientName}`);
    } catch (error: any) {
      console.error("Failed to send reminder:", error);
      toast.error(error.message || "Failed to send reminder");
    } finally {
      setSendingReminderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-success/10 text-success";
      case "pending":
        return "bg-warning/10 text-warning";
      case "overdue":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDownloadPdf = async (invoiceId: number, invoiceNumber?: string | null) => {
    try {
      setDownloadingId(invoiceId);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/api/invoices/${encodeId(invoiceId)}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download invoice PDF");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${invoiceNumber || `INV-${invoiceId}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Invoice PDF downloaded");
    } catch (error: any) {
      console.error("Error downloading invoice PDF:", error);
      toast.error(error?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteClick = (invoiceId: number) => {
    setInvoiceToDelete(invoiceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    try {
      setDeletingId(invoiceToDelete);
      await invoiceService.deleteInvoice(invoiceToDelete);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
      toast.success("Invoice deleted successfully");
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error(error?.message || "Failed to delete invoice");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {sendingReminderId !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Sending reminder email...
          </p>
        </div>
      )}
      <AppShell>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Invoices</h1>
          <Link to="/invoices/create" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Invoice #
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Issue Date
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Due Date
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Loading invoices...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No invoices found. Create your first invoice to get started.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => {
                      const dueDate = new Date(invoice.dueDate);
                      const today = new Date();
                      dueDate.setHours(0, 0, 0, 0);
                      today.setHours(0, 0, 0, 0);
                      // Overdue is only enabled when today is AFTER the due date (not equal to or before)
                      const isOverdue = today > dueDate;

                      return (
                        <tr key={invoice.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 text-sm font-medium">
                            {invoice.invoiceNumber || `INV-${invoice.id}`}
                          </td>
                          <td className="py-3 px-2 text-sm">{invoice.clientName || 'Unknown Client'}</td>
                          <td className="py-3 px-2 text-sm">
                            {formatDisplayDate(invoice.invoiceDate)}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {formatDisplayDate(invoice.dueDate)}
                          </td>

                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Select
                                value={invoice.status || 'pending'}
                                onValueChange={(val) =>
                                  handleStatusChange(invoice.id, val as Invoice["status"])
                                }
                              >
                                <SelectTrigger
                                  className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                    invoice.status || 'pending'
                                  )}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem
                                      key={s}
                                      value={s}
                                      disabled={s === "overdue" && !isOverdue}
                                    >
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {invoice.status === 'overdue' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSendReminder(invoice.id)}
                                  aria-label="Send reminder"
                                  disabled={sendingReminderId === invoice.id}
                                >
                                  {sendingReminderId === invoice.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Bell className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>

                          <td 
                            className={`py-3 px-2 text-sm text-right font-medium ${
                              invoice.status === 'paid' 
                                ? 'text-success underline cursor-pointer hover:no-underline' 
                                : ''
                            }`}
                            onClick={invoice.status === 'paid' ? () => handleOpenPaymentModal(invoice) : undefined}
                          >
                            {formatCurrency(invoice.totalAmount, (invoice.currency as Currency) || userCurrency)}
                          </td>

                          <td className="py-3 px-2 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  handleDownloadPdf(invoice.id, invoice.invoiceNumber)
                                }
                                disabled={downloadingId === invoice.id}
                                title="Download PDF"
                              >
                                {downloadingId === invoice.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                              </Button>
                              {invoice.status === "paid" ? (
                                <span className="inline-block px-3 py-1 rounded border text-sm text-muted-foreground bg-muted border-dashed border-muted-foreground/40 cursor-not-allowed opacity-70">
                                  Edit
                                </span>
                              ) : (
                                <Link to={`/invoices/create?id=${encodeId(invoice.id)}`}>
                                  <span className="inline-block px-3 py-1 rounded border text-sm text-foreground bg-background border-dashed border-cyan-800">
                                    Edit
                                  </span>
                                </Link>
                              )}
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(invoice.id)}
                                disabled={deletingId === invoice.id}
                                title="Delete Invoice"
                              >
                                {deletingId === invoice.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No invoices found. Create your first invoice to get started.
                </div>
              ) : (
                invoices.map((invoice) => {
                  const dueDate = new Date(invoice.dueDate);
                  const today = new Date();
                  dueDate.setHours(0, 0, 0, 0);
                  today.setHours(0, 0, 0, 0);
                  // Overdue is only enabled when today is AFTER the due date (not equal to or before)
                  const isOverdue = today > dueDate;

                  return (
                    <Card key={invoice.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Invoice #</span>
                          <span className="text-sm font-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Client</span>
                          <span className="text-sm">{invoice.clientName || 'Unknown Client'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Issue Date</span>
                          <span className="text-sm">{formatDisplayDate(invoice.invoiceDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Due Date</span>
                          <span className="text-sm">{formatDisplayDate(invoice.dueDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Status</span>
                          <div className="flex items-center gap-2">
                            <Select
                              value={invoice.status || 'pending'}
                              onValueChange={(val) =>
                                handleStatusChange(invoice.id, val as Invoice["status"])
                              }
                            >
                              <SelectTrigger
                                className={`text-xs px-2 py-1 h-7 rounded ${getStatusColor(
                                  invoice.status || 'pending'
                                )}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem
                                    key={s}
                                    value={s}
                                    disabled={s === "overdue" && !isOverdue}
                                  >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {invoice.status === 'overdue' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleSendReminder(invoice.id)}
                                aria-label="Send reminder"
                                disabled={sendingReminderId === invoice.id}
                              >
                                {sendingReminderId === invoice.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Bell className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs font-medium text-muted-foreground">Amount</span>
                          <span 
                            className={`text-base font-semibold ${
                              invoice.status === 'paid' 
                                ? 'text-success underline cursor-pointer hover:no-underline' 
                                : ''
                            }`}
                            onClick={invoice.status === 'paid' ? () => handleOpenPaymentModal(invoice) : undefined}
                          >
                            {formatCurrency(invoice.totalAmount, (invoice.currency as Currency) || userCurrency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              handleDownloadPdf(invoice.id, invoice.invoiceNumber)
                            }
                            disabled={downloadingId === invoice.id}
                            title="Download PDF"
                          >
                            {downloadingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          {invoice.status === "paid" ? (
                            <Button variant="outline" size="sm" disabled className="text-xs">
                              Edit
                            </Button>
                          ) : (
                            <Link to={`/invoices/create?id=${encodeId(invoice.id)}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                Edit
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(invoice.id)}
                            disabled={deletingId === invoice.id}
                            title="Delete Invoice"
                          >
                            {deletingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </AppShell>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone and will also delete the associated PDF file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Modal */}
      {invoiceToMarkPaid && (
        <MarkAsPaidModal
          open={markAsPaidModalOpen}
          onOpenChange={(open) => {
            setMarkAsPaidModalOpen(open);
            if (!open) {
              setExistingPaymentId(undefined);
            }
          }}
          invoiceId={invoiceToMarkPaid.id}
          invoiceAmount={invoiceToMarkPaid.totalAmount}
          currency={(invoiceToMarkPaid.currency as Currency) || userCurrency}
          isPaid={invoiceToMarkPaid.status === 'paid'}
          existingPaymentId={existingPaymentId}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </>
  );
};

export default Invoices;
