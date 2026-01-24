import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/lib/auth";
import { expenseService, Expense } from "@/lib/services/expenseService";
import { vendorService } from "@/lib/services/vendorService";
import { Loader2, Plus, Download, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { API_BASE_URL } from "@/lib/api";
import { formatDisplayDate } from "@/lib/date";
import { toast } from "sonner";
import { encodeId } from "@/lib/urlEncoder";
import { formatCurrency, Currency } from "@/lib/currency";
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

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorsMap, setVendorsMap] = useState<Record<number, string>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const user = authService.getCurrentUser();
  const userCurrency = (user?.currency as Currency) || 'INR';

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }
    loadExpenses();
    trackExpenseScreenVisit();
  }, [navigate]);

  const trackExpenseScreenVisit = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/user/track-expense-visit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to track expense screen visit:", error);
      // Silently fail - don't interrupt user experience
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [expensesData, vendors] = await Promise.all([
        expenseService.getExpenses(),
        vendorService.getVendors(),
      ]);

      const vendorLookup = vendors.reduce<Record<number, string>>((acc, vendor) => {
        acc[vendor.id] = vendor.fullName;
        return acc;
      }, {});

      setVendorsMap(vendorLookup);
      setExpenses(expensesData);
    } catch (error) {
      console.error("Failed to load expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (expenseId: number, billNumber?: string | null) => {
    try {
      setDownloadingId(expenseId);
      const token = localStorage.getItem("accessToken");
      const encodedId = encodeId(expenseId);
      console.log(`[Expenses] Downloading PDF for expense ID: ${expenseId}, encoded: ${encodedId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/expenses/${encodedId}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText || "Failed to download expense PDF";
        
        // Try to parse JSON error response
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text as is
        }
        
        console.error(`[Expenses] PDF download failed: ${response.status} - ${errorMessage}`);
        
        // If PDF not found, suggest editing the expense to regenerate it
        if (response.status === 404) {
          toast.error("PDF not found. Please edit the expense to regenerate the PDF.", {
            action: {
              label: "Edit Expense",
              onClick: () => navigate(`/expenses/create?id=${encodedId}`),
            },
          });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      const blob = await response.blob();
      
      // Check if the blob is actually a PDF
      if (blob.type !== 'application/pdf' && blob.size === 0) {
        throw new Error("Received empty or invalid PDF file");
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${billNumber || `BILL-${expenseId}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Expense PDF downloaded");
    } catch (error: any) {
      console.error("Error downloading expense PDF:", error);
      toast.error(error?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return expenses
      .filter((expense) => {
        const billDate = new Date(expense.billDate);
        return billDate.getMonth() === month && billDate.getFullYear() === year;
      })
      .reduce((sum, expense) => sum + expense.totalAmount, 0);
  }, [expenses]);

  const handleDeleteClick = (expenseId: number) => {
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;

    try {
      setDeletingId(expenseToDelete);
      await expenseService.deleteExpense(expenseToDelete);
      setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete));
      toast.success("Expense deleted successfully");
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      toast.error(error?.message || "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Expenses</h1>
          <Link to="/expenses/create" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Record Expense
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Expense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Expenses this month</p>
                <p className="text-xl sm:text-2xl font-semibold">
                  {formatCurrency(totalThisMonth, userCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total recorded</p>
                <p className="text-xl sm:text-2xl font-semibold">
                  {formatCurrency(
                    expenses.reduce((sum, expense) => sum + expense.totalAmount, 0),
                    userCurrency
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Unique vendors</p>
                <p className="text-xl sm:text-2xl font-semibold">
                  {Object.keys(vendorsMap).length}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Recorded bills</p>
                <p className="text-xl sm:text-2xl font-semibold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Bill #</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Vendor</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Bill Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading expenses...
                        </div>
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No expenses recorded yet. Click &ldquo;Record Expense&rdquo; to add your first bill.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 text-sm font-medium">
                          {expense.billNumber || `BILL-${expense.id}`}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {vendorsMap[expense.vendorId] || "Vendor"}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatDisplayDate(expense.billDate)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatDisplayDate(expense.dueDate)}
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-medium">
                          {formatCurrency(expense.totalAmount, userCurrency)}
                        </td>
                        <td className="py-3 px-2 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadPdf(expense.id, expense.billNumber)}
                              disabled={downloadingId === expense.id}
                              title="Download PDF"
                            >
                              {downloadingId === expense.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                            </Button>
                            <Link to={`/expenses/create?id=${encodeId(expense.id)}`}>
                              <span className="inline-block px-3 py-1 rounded border text-sm text-foreground bg-background border-dashed border-cyan-800">
                                Edit
                              </span>
                            </Link>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(expense.id)}
                              disabled={deletingId === expense.id}
                              title="Delete Expense"
                            >
                              {deletingId === expense.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading expenses...
                  </div>
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No expenses recorded yet. Click &ldquo;Record Expense&rdquo; to add your first bill.
                </div>
              ) : (
                expenses.map((expense) => (
                  <Card key={expense.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Bill #</span>
                        <span className="text-sm font-semibold">{expense.billNumber || `BILL-${expense.id}`}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Vendor</span>
                        <span className="text-sm">{vendorsMap[expense.vendorId] || "Vendor"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Bill Date</span>
                        <span className="text-sm">{formatDisplayDate(expense.billDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Due Date</span>
                        <span className="text-sm">{formatDisplayDate(expense.dueDate)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs font-medium text-muted-foreground">Amount</span>
                        <span className="text-base font-semibold">
                          {formatCurrency(expense.totalAmount, userCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDownloadPdf(expense.id, expense.billNumber)}
                          disabled={downloadingId === expense.id}
                          title="Download PDF"
                        >
                          {downloadingId === expense.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Link to={`/expenses/create?id=${encodeId(expense.id)}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(expense.id)}
                          disabled={deletingId === expense.id}
                          title="Delete Expense"
                        >
                          {deletingId === expense.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone and will also delete the associated PDF and attachment files.
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
    </AppShell>
  );
};

export default Expenses;
