import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invoiceService, Invoice } from "@/lib/services/invoiceService";
import { clientService } from "@/lib/services/clientService";
import { authService, User } from "@/lib/auth";
import { formatCurrency, Currency, getCurrencySymbol, CURRENCY_INFO, ALL_CURRENCIES } from "@/lib/currency";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { expenseService, Expense } from "@/lib/services/expenseService";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDisplayDate } from "@/lib/date";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [range, setRange] = useState<"monthly" | "3months" | "custom">("monthly");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesData, clients, expensesData] = await Promise.all([
        invoiceService.getInvoices(),
        clientService.getClients(),
        expenseService.getExpenses(),
      ]);
      
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
      
      // Sort by date (most recent first)
      invoicesWithClientInfo.sort((a, b) => {
        const dateA = new Date(a.invoiceDate).getTime();
        const dateB = new Date(b.invoiceDate).getTime();
        return dateB - dateA;
      });
      
      setInvoices(invoicesWithClientInfo);
      setExpenses(expensesData);
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = () => {
    loadData();
  };

  const handleStatusChange = async (invoiceId: number, newStatus: Invoice["status"]) => {
    if (!newStatus) return;
    
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
      loadData();
      toast.error(error.message || "Failed to update invoice status");
    }
  };

  // Date range helpers for metrics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.invoiceDate);
    if (Number.isNaN(invDate.getTime())) return false;

    if (range === "monthly") {
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    }

    if (range === "3months") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      const invDateNormalized = new Date(invDate);
      invDateNormalized.setHours(0, 0, 0, 0);
      return invDateNormalized >= threeMonthsAgo && invDateNormalized <= now;
    }

    if (range === "custom") {
      if (!customFromDate || !customToDate) return false;
      const fromDate = new Date(customFromDate);
      const toDate = new Date(customToDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      const invDateNormalized = new Date(invDate);
      invDateNormalized.setHours(0, 0, 0, 0);
      return invDateNormalized >= fromDate && invDateNormalized <= toDate;
    }

    return true;
  });

  const filteredExpenses = expenses.filter((exp) => {
    const billDate = new Date(exp.billDate);
    if (Number.isNaN(billDate.getTime())) return false;

    if (range === "monthly") {
      return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
    }

    if (range === "3months") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      const billDateNormalized = new Date(billDate);
      billDateNormalized.setHours(0, 0, 0, 0);
      return billDateNormalized >= threeMonthsAgo && billDateNormalized <= now;
    }

    if (range === "custom") {
      if (!customFromDate || !customToDate) return false;
      const fromDate = new Date(customFromDate);
      const toDate = new Date(customToDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      const billDateNormalized = new Date(billDate);
      billDateNormalized.setHours(0, 0, 0, 0);
      return billDateNormalized >= fromDate && billDateNormalized <= toDate;
    }

    return true;
  });

  // Get user's default currency
  const userCurrency = (currentUser?.currency as Currency) || 'INR';
  
  // Get all unique currencies from invoices and expenses
  const invoiceCurrencies = new Set(
    filteredInvoices.map(inv => (inv.currency as Currency) || userCurrency)
  );
  const expenseCurrencies = new Set([userCurrency]); // Expenses use user's currency for now
  const allCurrencies = Array.from(new Set([...invoiceCurrencies, ...expenseCurrencies]));
  
  // Sort currencies: user's currency first, then others
  const sortedCurrencies = allCurrencies.sort((a, b) => {
    if (a === userCurrency) return -1;
    if (b === userCurrency) return 1;
    return a.localeCompare(b);
  });
  
  // State for selected currency tab
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    sortedCurrencies[0] || userCurrency
  );
  
  // Use selectedCurrency or default to first currency
  const activeCurrency = selectedCurrency || sortedCurrencies[0] || userCurrency;
  
  // Calculate metrics for selected currency
  const currencyInvoices = filteredInvoices.filter(
    inv => ((inv.currency as Currency) || userCurrency) === activeCurrency
  );
  const currencyExpenses = filteredExpenses; // Expenses use user's currency
  
  // Total invoices for selected currency
  const totalInvoices = currencyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  // Pending payments (pending + overdue status) for selected currency
  const pendingPayments = currencyInvoices
    .filter((inv) => inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  // Overdue invoices for selected currency
  const overdueInvoices = currencyInvoices.filter((inv) => inv.status === "overdue");

  // Tax payable vs savings for selected currency
  const totalGstCollected = currencyInvoices.reduce((sum, inv) => {
    const gstAmount = (inv.totalAmount || 0) - (inv.subTotalAmount || 0);
    return sum + (gstAmount > 0 ? gstAmount : 0);
  }, 0);

  const totalTaxOnExpenses = activeCurrency === userCurrency 
    ? filteredExpenses.reduce((sum, exp) => {
    const rate = typeof exp.taxPercentage === "number" ? exp.taxPercentage : 0;
    if (!rate || rate <= 0) return sum;
    const total = Number(exp.totalAmount || 0);
    if (!total) return sum;
    const tax = total - total / (1 + rate / 100);
    return sum + (tax > 0 ? tax : 0);
      }, 0)
    : 0;

  const netTax = totalGstCollected - totalTaxOnExpenses;
  const taxPayableAmount = netTax > 0 ? netTax : 0;
  const taxSavingsAmount = netTax < 0 ? Math.abs(netTax) : 0;

  // Calculate next pay day from pending invoices (excluding overdue)
  const nextPayDay = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pendingInvoices = filteredInvoices.filter(
      (inv) => inv.status === "pending"
    );
    
    if (pendingInvoices.length === 0) return null;
    
    const upcomingDueDates = pendingInvoices
      .map((inv) => {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate;
      })
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (upcomingDueDates.length === 0) return null;
    
    return upcomingDueDates[0];
  })();

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

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        {/* Period Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <Tabs value={range} onValueChange={(val) => {
            setRange(val as typeof range);
            if (val !== "custom") {
              setCustomFromDate("");
              setCustomToDate("");
            }
          }} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex h-11 sm:h-9 gap-1 sm:gap-0 bg-muted/50 sm:bg-muted p-1 sm:p-1">
              <TabsTrigger 
                value="monthly" 
                className="text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-7 rounded-md sm:rounded-sm transition-all duration-200 active:scale-[0.98] sm:active:scale-100 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:data-[state=active]:shadow-sm data-[state=active]:font-semibold sm:data-[state=active]:font-medium data-[state=active]:ring-2 data-[state=active]:ring-primary/20 sm:data-[state=active]:ring-0"
              >
                Monthly
              </TabsTrigger>
              <TabsTrigger 
                value="3months" 
                className="text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-7 rounded-md sm:rounded-sm transition-all duration-200 active:scale-[0.98] sm:active:scale-100 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:data-[state=active]:shadow-sm data-[state=active]:font-semibold sm:data-[state=active]:font-medium data-[state=active]:ring-2 data-[state=active]:ring-primary/20 sm:data-[state=active]:ring-0"
              >
                3 Months
              </TabsTrigger>
              <TabsTrigger 
                value="custom" 
                className="text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-7 rounded-md sm:rounded-sm transition-all duration-200 active:scale-[0.98] sm:active:scale-100 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:data-[state=active]:shadow-sm data-[state=active]:font-semibold sm:data-[state=active]:font-medium data-[state=active]:ring-2 data-[state=active]:ring-primary/20 sm:data-[state=active]:ring-0"
              >
                Custom
              </TabsTrigger>
            </TabsList>
            {range === "custom" && (
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="space-y-2 flex-1 sm:flex-initial">
                  <Label htmlFor="from-date" className="text-sm font-medium">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full sm:w-[150px] h-10"
                  />
                </div>
                <div className="space-y-2 flex-1 sm:flex-initial">
                  <Label htmlFor="to-date" className="text-sm font-medium">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full sm:w-[150px] h-10"
                  />
                </div>
              </div>
            )}
          </Tabs>
          
          {nextPayDay && (
            <div className="text-left sm:text-right px-1 py-2">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Next Pay Day</p>
              <p className="text-base sm:text-lg font-semibold">{formatDisplayDate(nextPayDay)}</p>
            </div>
          )}
        </div>

        {/* Currency Tabs */}
        {sortedCurrencies.length > 1 && (
          <div className="mb-2 sm:mb-4">
            <Tabs value={activeCurrency} onValueChange={(val) => setSelectedCurrency(val as Currency)}>
              <TabsList className="w-full sm:w-auto overflow-x-auto h-10 sm:h-9">
                {sortedCurrencies.map((curr) => {
                  const currencyInfo = ALL_CURRENCIES[curr as Currency] || CURRENCY_INFO[curr as Currency] || { code: curr, symbol: curr, name: curr };
                  return (
                    <TabsTrigger key={curr} value={curr} className="text-xs sm:text-sm px-3 sm:px-4">
                      {currencyInfo.symbol} {currencyInfo.code}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold mb-1">{formatCurrency(totalInvoices, activeCurrency)}</div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {range === "monthly" ? "this month" : range === "3months" ? "last 3 months" : range === "custom" ? "custom range" : ""}
                {sortedCurrencies.length > 1 && ` (${activeCurrency})`}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold mb-1">{formatCurrency(pendingPayments, activeCurrency)}</div>
              <p className="text-xs text-destructive mt-1.5">
                {overdueInvoices.length > 0 ? "overdue" : "current"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Expenses Logged
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold mb-1">
                {formatCurrency(
                  activeCurrency === userCurrency
                    ? filteredExpenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0)
                    : 0,
                  activeCurrency
                )}
              </div>
              {activeCurrency !== userCurrency && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Expenses shown in {userCurrency}
                </p>
              )}
            </CardContent>
          </Card>

          {currentUser?.gstin && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Tax Payble/Savings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-2.5">
                <div className="flex items-baseline justify-between py-1">
                  <span className="text-xs text-muted-foreground">Tax Payable</span>
                  <span className="text-lg sm:text-xl font-semibold text-destructive">
                    {formatCurrency(Math.round(taxPayableAmount), activeCurrency)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between py-1">
                  <span className="text-xs text-muted-foreground">Savings</span>
                  <span className="text-lg sm:text-xl font-semibold text-emerald-600">
                    {formatCurrency(Math.round(taxSavingsAmount), activeCurrency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Invoice #
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        {range === "custom" && (!customFromDate || !customToDate)
                          ? "Please select a date range to view invoices."
                          : `No invoices found for the selected period.`}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.slice(0, 10).map((invoice) => (
                      <tr key={invoice.id} className="border-b">
                        <td className="py-3 px-2 text-sm">
                          {formatDisplayDate(invoice.invoiceDate)}
                        </td>
                        <td className="py-3 px-2 text-sm">{invoice.clientName || 'Unknown Client'}</td>
                        <td className="py-3 px-2 text-sm">{invoice.invoiceNumber || `INV-${invoice.id}`}</td>

                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              invoice.status || 'pending'
                            )}`}
                          >
                            {(invoice.status || 'pending').charAt(0).toUpperCase() +
                              (invoice.status || 'pending').slice(1)}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-sm text-right font-medium">
                          {formatCurrency(invoice.totalAmount, (invoice.currency as Currency) || userCurrency)}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Loading...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm px-4">
                  {range === "custom" && (!customFromDate || !customToDate)
                    ? "Please select a date range to view invoices."
                    : `No invoices found for the selected period.`}
                </div>
              ) : (
                filteredInvoices.slice(0, 10).map((invoice) => (
                  <Card key={invoice.id} className="p-4 shadow-sm border">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-medium text-muted-foreground">Invoice #</span>
                        <span className="text-sm font-semibold text-right">{invoice.invoiceNumber || `INV-${invoice.id}`}</span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-medium text-muted-foreground">Date</span>
                        <span className="text-sm text-right">{formatDisplayDate(invoice.invoiceDate)}</span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-medium text-muted-foreground">Client</span>
                        <span className="text-sm text-right max-w-[60%] truncate">{invoice.clientName || 'Unknown Client'}</span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-medium text-muted-foreground">Status</span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(
                            invoice.status || 'pending'
                          )}`}
                        >
                          {(invoice.status || 'pending').charAt(0).toUpperCase() +
                            (invoice.status || 'pending').slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground">Amount</span>
                        <span className="text-base font-bold">
                          {formatCurrency(invoice.totalAmount, (invoice.currency as Currency) || userCurrency)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            <div className="flex justify-center mt-5 sm:mt-6 pt-2">
              <Link to="/invoices" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-10 px-6">
                  View All Invoices
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Smart Nudges */}
        <Card className="shadow-sm">
          <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
              <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Smart Nudges
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {overdueInvoices.length > 0 && (
                <li>• {overdueInvoices.length} {overdueInvoices.length === 1 ? 'invoice is' : 'invoices are'} overdue - send reminders?</li>
              )}
              {pendingPayments > 0 && overdueInvoices.length === 0 && (
                <li>• {formatCurrency(pendingPayments, userCurrency)} in pending payments - follow up with clients.</li>
              )}
              {invoices.length === 0 && (
                <li>• Create your first invoice to get started with tracking your business.</li>
              )}
              {invoices.length > 0 && totalInvoices === 0 && (
                <li>• No invoices this month yet - create one to track your revenue.</li>
              )}
              {expenses.length === 0 && invoices.length > 0 && (
                <li>• Log your expenses to maximize tax savings and get accurate financial insights.</li>
              )}
              {currentUser?.gstin && taxSavingsAmount > 0 && (
                <li>• Potential tax savings of {formatCurrency(Math.round(taxSavingsAmount), userCurrency)} based on your invoices and expenses.</li>
              )}
              {invoices.length > 0 && (
                <li>• Consider setting up automated payment reminders for clients.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default Dashboard;
