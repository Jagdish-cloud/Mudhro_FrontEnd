import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { monthlyReportService, MonthlyReportData } from "@/lib/services/monthlyReportService";
import { authService } from "@/lib/auth";
import { formatCurrency as formatCurrencyUtil, Currency } from "@/lib/currency";
import { decodeId, encodeId } from "@/lib/urlEncoder";
import { Loader2, Download, ArrowLeft, Calendar, Printer } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatCurrency = (amount: number, currency: Currency = 'INR'): string => {
  return formatCurrencyUtil(amount, currency);
};

const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyReport = () => {
  const { userId: encodedUserId } = useParams<{ userId: string }>();
  // Decode the userId from the route parameter
  const userId = encodedUserId ? (decodeId(encodedUserId)?.toString() ?? encodedUserId) : null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const monthParam = searchParams.get('month');
    return monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const yearParam = searchParams.get('year');
    return yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  });
  const [downloading, setDownloading] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Allow bypassing auth for PDF generation
    const bypassAuth = searchParams.get('bypassAuth') === 'true' || searchParams.get('pdf') === 'true';
    
    if (!bypassAuth && !authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }

    if (!userId) {
      toast.error("User ID is required");
      navigate("/dashboard");
      return;
    }

    loadReport();
  }, [userId, selectedMonth, selectedYear, navigate, searchParams]);

  const loadReport = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const bypassAuth = searchParams.get('bypassAuth') === 'true' || searchParams.get('pdf') === 'true';
      
      // If bypassAuth, make direct fetch call without auth token
      let data: MonthlyReportData;
      if (bypassAuth) {
        const params = new URLSearchParams();
        if (selectedMonth) params.append('month', selectedMonth.toString());
        if (selectedYear) params.append('year', selectedYear.toString());
        
        const queryString = params.toString();
        // Use numeric userId directly (backend can handle both encoded and numeric IDs)
        const numericUserId = parseInt(userId, 10);
        const url = `${import.meta.env.VITE_API_URL || 'https://mudhrobackend-e4hgcza0bsf4fbcu.centralindia-01.azurewebsites.nethttps://mudhrobackend-e4hgcza0bsf4fbcu.centralindia-01.azurewebsites.net'}/api/monthly-reports/${numericUserId}${queryString ? `?${queryString}` : ''}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch monthly report' }));
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Monthly Report] API Response:', result);
        if (!result.success || !result.data) {
          console.error('[Monthly Report] Invalid response:', result);
          throw new Error(result.message || 'No report data available');
        }
        data = result.data;
        console.log('[Monthly Report] Report data loaded:', data);
        console.log('[Monthly Report] Currency breakdown:', data.currencyBreakdown);
        if (data.invoices && data.invoices.length > 0) {
          const currencies = [...new Set(data.invoices.map((inv: any) => inv.currency || 'NULL'))];
          console.log('[Monthly Report] Currencies in invoices:', currencies);
        }
      } else {
        data = await monthlyReportService.getMonthlyReport(
          parseInt(userId, 10),
          selectedMonth,
          selectedYear
        );
      }
      
      setReportData(data);
    } catch (error: any) {
      console.error("Failed to load monthly report:", error);
      // Only show toast if not in bypassAuth mode (to avoid showing errors during PDF generation)
      const bypassAuth = searchParams.get('bypassAuth') === 'true' || searchParams.get('pdf') === 'true';
      if (!bypassAuth) {
        toast.error(error.message || "Failed to load monthly report");
      }
      // Set reportData to null so the error state is shown
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(parseInt(month, 10));
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year, 10));
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
  };

  const handleDownloadPdf = async () => {
    if (!reportContentRef.current || !reportData) return;

    setDownloading(true);
    try {
      // Dynamically import the libraries
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      // Temporarily hide navigation elements to match print preview
      const header = document.querySelector('header');
      const aside = document.querySelector('aside');
      // Find elements with print:hidden class (Tailwind's print:hidden utility)
      const printHiddenElements = Array.from(document.querySelectorAll('[class*="print:hidden"]'));
      
      // Store original styles
      const headerDisplay = header?.style.display || '';
      const asideDisplay = aside?.style.display || '';
      const headerVisibility = header?.style.visibility || '';
      const asideVisibility = aside?.style.visibility || '';
      const hiddenElementsStyles: Array<{ element: Element; display: string; visibility: string }> = [];
      
      // Hide navigation elements
      if (header) {
        header.style.display = 'none';
        header.style.visibility = 'hidden';
      }
      if (aside) {
        aside.style.display = 'none';
        aside.style.visibility = 'hidden';
      }
      
      // Hide elements with print:hidden class (buttons, selects, etc.)
      printHiddenElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        hiddenElementsStyles.push({
          element: el,
          display: htmlEl.style.display || '',
          visibility: htmlEl.style.visibility || '',
        });
        htmlEl.style.display = 'none';
        htmlEl.style.visibility = 'hidden';
      });

      // Wait a bit for styles to apply
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capture the report content with print-like styling
      const canvas = await html2canvas(reportContentRef.current, {
        scale: 2, // Higher scale for better quality
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: reportContentRef.current.scrollWidth,
        windowHeight: reportContentRef.current.scrollHeight,
        removeContainer: false,
      });

      // Restore navigation elements
      if (header) {
        header.style.display = headerDisplay;
        header.style.visibility = headerVisibility;
      }
      if (aside) {
        aside.style.display = asideDisplay;
        aside.style.visibility = asideVisibility;
      }
      
      // Restore hidden elements
      hiddenElementsStyles.forEach(({ element, display, visibility }) => {
        const htmlEl = element as HTMLElement;
        htmlEl.style.display = display;
        htmlEl.style.visibility = visibility;
      });

      // Create PDF
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // 10mm margin (approximately 1cm)
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Calculate image dimensions in mm
      // html2canvas uses 96 DPI by default, 1px = 0.264583mm at 96 DPI
      const pxToMm = 0.264583;
      const imgWidthMm = canvas.width * pxToMm;
      const imgHeightMm = canvas.height * pxToMm;
      
      // Scale to fit page width with margins
      const widthRatio = contentWidth / imgWidthMm;
      const scaledWidth = contentWidth;
      const scaledHeight = imgHeightMm * widthRatio;
      
      // Handle multi-page content
      if (scaledHeight <= contentHeight) {
        // Content fits on one page
        pdf.addImage(imgData, "PNG", margin, margin, scaledWidth, scaledHeight, undefined, "FAST");
      } else {
        // Content spans multiple pages
        let heightLeft = scaledHeight;
        let position = margin;
        
        // Add first page
        pdf.addImage(imgData, "PNG", margin, position, scaledWidth, scaledHeight, undefined, "FAST");
        heightLeft -= contentHeight;
        
        // Add additional pages
        while (heightLeft > 0) {
          position = margin - (scaledHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position, scaledWidth, scaledHeight, undefined, "FAST");
          heightLeft -= contentHeight;
        }
      }

      // Generate filename
      const fileName = `Monthly_Report_${reportData.month}_${reportData.year}_${reportData.userId}.pdf`;
      
      // Download the PDF
      pdf.save(fileName);
      
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      console.error("Failed to generate PDF:", error);
      toast.error(error.message || "Failed to generate PDF");
      
      // Ensure navigation is restored even on error
      const header = document.querySelector('header');
      const aside = document.querySelector('aside');
      const printHiddenElements = Array.from(document.querySelectorAll('[class*="print:hidden"]'));
      
      if (header) {
        header.style.display = '';
        header.style.visibility = '';
      }
      if (aside) {
        aside.style.display = '';
        aside.style.visibility = '';
      }
      
      // Restore hidden elements
      printHiddenElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = '';
        htmlEl.style.visibility = '';
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!reportData) {
    return (
      <AppShell>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchParams.get('bypassAuth') === 'true' || searchParams.get('pdf') === 'true' 
                  ? "No reports available" 
                  : "No report data available"}
              </p>
              {(searchParams.get('bypassAuth') === 'true' || searchParams.get('pdf') === 'true') && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  This may indicate there are no invoices or expenses for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Extract userCurrency from reportData with fallback to INR
  const userCurrency: Currency = (reportData.userCurrency as Currency) || 'INR';
  
  // If currencyBreakdown is missing, create it from invoices
  let currencyBreakdown = reportData.currencyBreakdown;
  if (!currencyBreakdown || currencyBreakdown.length === 0) {
    const currencyMap = new Map<string, {
      currency: string;
      invoiceCount: number;
      invoiceAmount: number;
      gstCollected: number;
      expenseCount: number;
      expenseAmount: number;
      taxOnExpenses: number;
      pendingPayments: number;
      overdueCount: number;
    }>();
    
    // Group invoices by currency
    reportData.invoices.forEach((inv) => {
      const currency = inv.currency || userCurrency;
      if (!currencyMap.has(currency)) {
        currencyMap.set(currency, {
          currency,
          invoiceCount: 0,
          invoiceAmount: 0,
          gstCollected: 0,
          expenseCount: 0,
          expenseAmount: 0,
          taxOnExpenses: 0,
          pendingPayments: 0,
          overdueCount: 0,
        });
      }
      const breakdown = currencyMap.get(currency)!;
      breakdown.invoiceCount++;
      breakdown.invoiceAmount += inv.totalAmount;
      breakdown.gstCollected += inv.gstAmount;
      if (inv.status === 'pending' || inv.status === 'overdue') {
        breakdown.pendingPayments += inv.totalAmount;
      }
      if (inv.status === 'overdue') {
        breakdown.overdueCount++;
      }
    });
    
    // Add expenses (they use user's default currency)
    if (reportData.expenses.length > 0) {
      const defaultCurrency = userCurrency;
      if (!currencyMap.has(defaultCurrency)) {
        currencyMap.set(defaultCurrency, {
          currency: defaultCurrency,
          invoiceCount: 0,
          invoiceAmount: 0,
          gstCollected: 0,
          expenseCount: 0,
          expenseAmount: 0,
          taxOnExpenses: 0,
          pendingPayments: 0,
          overdueCount: 0,
        });
      }
      const breakdown = currencyMap.get(defaultCurrency)!;
      breakdown.expenseCount = reportData.expenses.length;
      breakdown.expenseAmount = reportData.expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
      breakdown.taxOnExpenses = reportData.expenses.reduce((sum, exp) => sum + exp.taxAmount, 0);
    }
    
    currencyBreakdown = Array.from(currencyMap.values());
    console.log('[Monthly Report] Generated currency breakdown from invoices:', currencyBreakdown);
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          body {
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          
          /* Hide AppShell navigation elements - top header */
          header,
          header *,
          /* Hide sidebar */
          aside,
          aside *,
          /* Hide navigation */
          nav,
          nav *,
          /* Hide elements with print:hidden class */
          .print\\:hidden,
          .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Hide the entire AppShell wrapper's header and sidebar using more specific selectors */
          div.min-h-screen > header,
          div.min-h-screen > header *,
          div.min-h-screen > div.flex > aside,
          div.min-h-screen > div.flex > aside *,
          aside,
          aside *,
          header,
          header *,
          /* Target sidebar by specific classes from AppShell */
          .w-64.border-r,
          .w-64.border-r *,
          /* Target navigation inside sidebar */
          nav.p-4,
          nav.p-4 * {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
          }
          
          /* Make main content full width when printing */
          div.min-h-screen > div.flex > main,
          div.min-h-screen > div.flex > main > div {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Remove flex layout for print */
          div.min-h-screen > div.flex {
            display: block !important;
            flex-direction: column !important;
          }
          
          /* Container adjustments */
          .container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          /* Ensure no horizontal overflow */
          body,
          html,
          * {
            overflow-x: visible !important;
            max-width: 100% !important;
          }
          
          /* Report content container */
          [ref] {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Reduce spacing between sections for better PDF layout */
          .space-y-6 > * + * {
            margin-top: 1rem !important;
          }
          
          /* Card styling for print */
          .card,
          [class*="card"] {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            margin-bottom: 0.75rem !important;
            padding: 0.75rem !important;
            background: #fff !important;
          }
          
          /* Currency Breakdown section - allow breaking but keep header with first card */
          [data-currency-breakdown] {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          
          /* Keep header with content - prevent break after header */
          [data-currency-breakdown] [class*="CardHeader"] {
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin-bottom: 0 !important;
            padding-bottom: 0.75rem !important;
          }
          
          /* Remove spacing between header and content */
          [data-currency-breakdown] [class*="CardContent"] {
            padding-top: 0 !important;
            margin-top: 0 !important;
          }
          
          /* Prevent individual currency cards from breaking internally */
          [data-currency-breakdown] [class*="CardContent"] > div > div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Keep first currency card with header - no break before first card */
          [data-currency-breakdown] [class*="CardContent"] > div > div:first-of-type {
            page-break-before: avoid !important;
            break-before: avoid !important;
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          
          /* Allow breaks between currency cards (except first) */
          [data-currency-breakdown] [class*="CardContent"] > div > div:not(:first-of-type) {
            page-break-before: auto !important;
            break-before: auto !important;
          }
          
          /* Card header adjustments */
          [class*="CardHeader"] {
            padding: 0.5rem 0.75rem !important;
            margin-bottom: 0.5rem !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          /* Currency Breakdown header specific adjustments */
          [data-currency-breakdown] [class*="CardHeader"] {
            padding-bottom: 0.5rem !important;
            margin-bottom: 0 !important;
            border-bottom: none !important;
          }
          
          [class*="CardTitle"] {
            font-size: 14pt !important;
            font-weight: 600 !important;
            margin: 0 !important;
          }
          
          [class*="CardContent"] {
            padding: 0.75rem !important;
          }
          
          /* Currency Breakdown content specific adjustments */
          [data-currency-breakdown] [class*="CardContent"] {
            padding-top: 0 !important;
            margin-top: 0 !important;
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          
          /* Table styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10pt !important;
            margin: 0.5rem 0 !important;
          }
          
          thead {
            display: table-header-group !important;
            background-color: #f3f4f6 !important;
          }
          
          tbody {
            display: table-row-group !important;
          }
          
          tfoot {
            display: table-footer-group !important;
            background-color: #f9fafb !important;
            font-weight: 600 !important;
          }
          
          th,
          td {
            padding: 0.5rem !important;
            border: 1px solid #e5e7eb !important;
            text-align: left !important;
          }
          
          th {
            font-weight: 600 !important;
            font-size: 10pt !important;
          }
          
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          /* Prevent table rows from breaking across pages */
          tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Allow table to break between rows if needed, but try to keep rows together */
          table {
            page-break-inside: auto !important;
          }
          
          /* Summary cards grid */
          .grid {
            display: grid !important;
            gap: 0.5rem !important;
          }
          
          .grid-cols-1,
          .grid-cols-2,
          .grid-cols-4 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          
          /* Text adjustments */
          h1 {
            font-size: 18pt !important;
            font-weight: 700 !important;
            margin: 0.5rem 0 !important;
          }
          
          h2 {
            font-size: 16pt !important;
            font-weight: 600 !important;
            margin: 0.5rem 0 !important;
          }
          
          p {
            margin: 0.25rem 0 !important;
            font-size: 11pt !important;
          }
          
          /* Badge styling */
          [class*="Badge"] {
            padding: 0.25rem 0.5rem !important;
            font-size: 9pt !important;
            border: 1px solid #d1d5db !important;
          }
          
          /* Separator */
          [class*="Separator"] {
            margin: 0.5rem 0 !important;
            border-color: #e5e7eb !important;
          }
          
          /* Hide buttons and interactive elements in navigation/header areas during print */
          header button,
          aside button,
          nav button,
          .print\\:hidden button,
          .print\\:hidden select,
          .print\\:hidden input {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Hide select dropdowns in the header area */
          .print\\:hidden select {
            display: none !important;
          }
          
          /* Ensure proper spacing in lists */
          ul {
            margin: 0.5rem 0 !important;
            padding-left: 1.5rem !important;
          }
          
          li {
            margin: 0.25rem 0 !important;
            font-size: 10pt !important;
          }
          
          /* Flex containers */
          .flex {
            display: flex !important;
          }
          
          .justify-between {
            justify-content: space-between !important;
          }
          
          .items-center {
            align-items: center !important;
          }
          
          /* Space-y adjustments */
          .space-y-2 > * + * {
            margin-top: 0.5rem !important;
          }
          
          .space-y-4 > * + * {
            margin-top: 0.75rem !important;
          }
          
          /* Border adjustments */
          .border-b {
            border-bottom: 1px solid #e5e7eb !important;
            padding: 0.5rem 0 !important;
          }
          
          /* Background color adjustments */
          .bg-muted\\/50 {
            background-color: #f3f4f6 !important;
          }
          
          .bg-primary\\/10 {
            background-color: #eef2ff !important;
          }
          
          /* Font weight adjustments */
          .font-semibold {
            font-weight: 600 !important;
          }
          
          .font-bold {
            font-weight: 700 !important;
          }
          
          /* Text size adjustments */
          .text-sm {
            font-size: 10pt !important;
          }
          
          .text-xs {
            font-size: 9pt !important;
          }
          
          .text-lg {
            font-size: 14pt !important;
          }
          
          .text-xl {
            font-size: 16pt !important;
          }
          
          .text-2xl {
            font-size: 18pt !important;
          }
          
          .text-3xl {
            font-size: 20pt !important;
          }
          
          /* Text color adjustments */
          .text-muted-foreground {
            color: #6b7280 !important;
          }
          
          /* Padding adjustments */
          .p-3 {
            padding: 0.5rem !important;
          }
          
          .p-4 {
            padding: 0.75rem !important;
          }
          
          .py-2 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          
          .py-3 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          
          .py-4 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
          
          /* Margin adjustments */
          .mt-1 {
            margin-top: 0.25rem !important;
          }
          
          .mb-4 {
            margin-bottom: 0.75rem !important;
          }
          
          /* Rounded corners */
          .rounded {
            border-radius: 0.25rem !important;
          }
        }
      `}</style>
      <AppShell>
        <div ref={reportContentRef} className="container mx-auto p-6 space-y-6 print:p-0 print:space-y-4" data-report-loaded={reportData ? 'true' : 'false'}>
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Monthly Summary Report</h1>
              <p className="text-muted-foreground">
                {reportData.month} {reportData.year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleDownloadPdf} 
              disabled={downloading}
              variant="outline"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Prepared for</p>
                <p className="font-semibold">{reportData.userFullName}</p>
              </div>
              {reportData.userPAN && (
                <div>
                  <p className="text-sm text-muted-foreground">PAN</p>
                  <p className="font-semibold">{reportData.userPAN}</p>
                </div>
              )}
              {reportData.userGSTIN && (
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-semibold">{reportData.userGSTIN}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-semibold">
                  {formatDate(reportData.startDate)} - {formatDate(reportData.endDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invoices
                {currencyBreakdown && currencyBreakdown.length > 1 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {currencyBreakdown.length} currencies
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalInvoices}</div>
              {currencyBreakdown && currencyBreakdown.length > 1 ? (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {currencyBreakdown.map((bd) => (
                    <div key={bd.currency}>
                      {formatCurrency(bd.invoiceAmount, bd.currency as Currency)} ({bd.currency})
                    </div>
                  ))}
                </div>
              ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(reportData.totalInvoiceAmount, userCurrency)}
              </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalExpenses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(reportData.totalExpenseAmount, userCurrency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                GST Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currencyBreakdown && currencyBreakdown.length > 1 ? (
                <div className="space-y-1">
                  {currencyBreakdown.map((bd) => (
                    <div key={bd.currency} className="text-sm font-semibold">
                      {formatCurrency(bd.gstCollected, bd.currency as Currency)}
                      <span className="text-xs text-muted-foreground ml-1">({bd.currency})</span>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="text-2xl font-bold">{formatCurrency(reportData.gstCollected, userCurrency)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currencyBreakdown && currencyBreakdown.length > 1 ? (
                <div className="space-y-1">
                  {currencyBreakdown.map((bd) => (
                    <div key={bd.currency} className="text-sm font-semibold">
                      {formatCurrency(
                        bd.invoiceAmount - bd.expenseAmount,
                        bd.currency as Currency
                      )}
                      <span className="text-xs text-muted-foreground ml-1">({bd.currency})</span>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="text-2xl font-bold">
                  {formatCurrency(reportData.totalInvoiceAmount - reportData.totalExpenseAmount, userCurrency)}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Income Summary */}
        <Card>
          <CardHeader>
            <CardTitle>1. Income Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.invoices && reportData.invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Currency</TableHead>
                      <TableHead className="text-center">GST %</TableHead>
                      <TableHead className="text-right">GST Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                        <TableCell>
                          {invoice.clientOrganization || invoice.clientName}
                        </TableCell>
                        <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(invoice.totalAmount, invoice.currency || userCurrency)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {invoice.currency || userCurrency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{invoice.gst > 0 ? `${invoice.gst}%` : '—'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.gstAmount, invoice.currency || userCurrency)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Show separate totals row for each currency */}
                    {currencyBreakdown && currencyBreakdown.length > 1 ? (
                      <>
                        {currencyBreakdown.map((bd) => (
                          <TableRow key={`total-${bd.currency}`} className="bg-muted/50 font-bold">
                            <TableCell colSpan={3}>TOTALS ({bd.currency})</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(bd.invoiceAmount, bd.currency as Currency)}
                            </TableCell>
                            <TableCell className="text-center">—</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">{bd.currency}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(bd.gstCollected, bd.currency as Currency)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))}
                      </>
                    ) : (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>TOTALS</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(reportData.totalInvoiceAmount, userCurrency)}
                      </TableCell>
                        <TableCell className="text-center">—</TableCell>
                      <TableCell className="text-center">—</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(reportData.gstCollected, userCurrency)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No income records for this period
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expense Summary */}
        <Card>
          <CardHeader>
            <CardTitle>2. Expense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.expenses && reportData.expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Bill #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Tax %</TableHead>
                      <TableHead className="text-right">Tax Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.billDate)}</TableCell>
                        <TableCell>{expense.vendorName}</TableCell>
                        <TableCell className="font-mono">{expense.billNumber}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.totalAmount, userCurrency)}
                        </TableCell>
                        <TableCell className="text-center">
                          {expense.taxPercentage > 0 ? `${expense.taxPercentage.toFixed(2)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {expense.taxPercentage > 0 ? formatCurrency(expense.taxAmount, userCurrency) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>TOTALS</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(reportData.totalExpenseAmount, userCurrency)}
                      </TableCell>
                      <TableCell className="text-center">—</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(reportData.taxOnExpenses, userCurrency)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No expense records for this period
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tax GST Summary */}
        <Card>
          <CardHeader>
            <CardTitle>3. Tax GST Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span>GST Collected on Invoices</span>
                <span className="font-semibold">{formatCurrency(reportData.gstCollected, userCurrency)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>GST/Tax Paid on Expenses</span>
                <span className="font-semibold">{formatCurrency(reportData.taxOnExpenses, userCurrency)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-semibold">Net GST Payable (Payable/Savings)</span>
                <span className="font-semibold">
                  {formatCurrency(Math.abs(reportData.netTax), userCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>TDS Deducted by Clients</span>
                <span className="font-semibold">{formatCurrency(0, userCurrency)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-muted/50 p-3 rounded">
                <span className="font-bold">Net Tax Payable after TDS</span>
                <span className="font-bold">
                  {formatCurrency(Math.abs(reportData.netTax), userCurrency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit & Loss Overview */}
        <Card>
          <CardHeader>
            <CardTitle>4. Profit & Loss Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-semibold">Total Income for the Month</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(reportData.totalInvoiceAmount, userCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-semibold">Total Expenses</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(reportData.totalExpenseAmount, userCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary/10 p-4 rounded">
                <span className="font-bold text-lg">Net Profit before Income Tax</span>
                <span className="font-bold text-xl">
                  {formatCurrency(reportData.totalInvoiceAmount - reportData.totalExpenseAmount, userCurrency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Details */}
        <Card>
          <CardHeader>
            <CardTitle>5. Compliance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span>GST Filing Frequency</span>
                <span className="font-semibold">
                  {reportData.userGSTIN ? 'Monthly' : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Next Due Date for GST Filing</span>
                <span className="font-semibold">
                  {reportData.userGSTIN
                    ? formatDate(
                        new Date(
                          reportData.monthNumber === 12
                            ? reportData.year + 1
                            : reportData.year,
                          reportData.monthNumber === 12 ? 0 : reportData.monthNumber,
                          13
                        )
                      )
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>TDS Summary</span>
                <span className="font-semibold">Auto-linking with Form 26AS (when available)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency Breakdown - Always show if there are invoices or expenses */}
        {currencyBreakdown && currencyBreakdown.length > 0 && (
          <Card data-currency-breakdown="true">
            <CardHeader className="!pb-3 !px-6 !pt-6">
              <CardTitle className="!mb-0">
                6. Currency Breakdown
                {currencyBreakdown.length > 1 ? (
                  <Badge variant="outline" className="ml-2">
                    {currencyBreakdown.length} currencies
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Single currency
                  </Badge>
                )}
              </CardTitle>
              {reportData.invoices.length > 0 && reportData.invoices.every(inv => !inv.currency) && (
                <p className="text-xs text-muted-foreground mt-2 !mb-0">
                  Note: All invoices are displayed in your default currency. If you used different currencies, 
                  they may need to be updated in the invoice records.
                </p>
              )}
            </CardHeader>
            <CardContent className="!pt-0 !px-6 !pb-6">
              <div className="space-y-4">
                {currencyBreakdown.map((breakdown, index) => {
                  const currency: Currency = (breakdown.currency as Currency) || userCurrency;
                  return (
                    <div 
                      key={breakdown.currency} 
                      className="border rounded-lg p-4 space-y-3"
                      style={{ 
                        pageBreakInside: 'avoid', 
                        breakInside: 'avoid',
                        ...(index === 0 && {
                          pageBreakBefore: 'avoid',
                          breakBefore: 'avoid',
                          marginTop: 0
                        })
                      }}
                    >
                      <div className="flex items-center justify-between pb-2 border-b">
                        <h3 className="text-lg font-semibold">{breakdown.currency}</h3>
                        <Badge variant="outline">{breakdown.currency}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Invoices</p>
                          <p className="text-lg font-semibold">{breakdown.invoiceCount}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(breakdown.invoiceAmount, currency)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">GST Collected</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(breakdown.gstCollected, currency)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Expenses</p>
                          <p className="text-lg font-semibold">{breakdown.expenseCount}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(breakdown.expenseAmount, currency)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Tax on Expenses</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(breakdown.taxOnExpenses, currency)}
                          </p>
                        </div>
                      </div>
                      
                      {(breakdown.pendingPayments > 0 || breakdown.overdueCount > 0) && (
                        <div className="pt-2 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Pending Payments</p>
                              <p className="font-semibold text-orange-600">
                                {formatCurrency(breakdown.pendingPayments, currency)}
                              </p>
                            </div>
                            {breakdown.overdueCount > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground">Overdue Invoices</p>
                                <p className="font-semibold text-red-600">
                                  {breakdown.overdueCount} invoice{breakdown.overdueCount > 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Net Profit ({breakdown.currency})</span>
                          <span className="text-lg font-bold">
                            {formatCurrency(
                              breakdown.invoiceAmount - breakdown.expenseAmount,
                              currency
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{currencyBreakdown && currencyBreakdown.length > 0 ? '7. Notes' : '6. Notes'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• This report is auto-generated using uploaded invoice and expense data.</p>
              <p>• All calculations are based on the data entered in the system.</p>
              {currencyBreakdown && currencyBreakdown.length > 1 && (
                <p>• This report includes multiple currencies. Totals are shown separately for each currency.</p>
              )}
              <p>• This report complies with relevant tax and GST norms for freelancers/small businesses.</p>
              <p>• For any discrepancies, please verify the source documents.</p>
              <Separator className="my-4" />
              <p className="font-semibold">Thank you for using Mudhro - Calm Finance for Freelancers</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
    </>
  );
};

export default MonthlyReport;

