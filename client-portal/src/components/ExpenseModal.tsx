import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authService } from "@/lib/auth";
import { expenseService } from "@/lib/services/expenseService";
import { vendorService, Vendor } from "@/lib/services/vendorService";
import { projectService, Project } from "@/lib/services/projectService";
import {
  expenseServiceCatalog,
  ExpenseServiceCatalogItem,
} from "@/lib/services/expenseServiceCatalog";
import { expenseItemService } from "@/lib/services/expenseItemService";
import { Loader2, Plus, Download, Trash2, Edit2 } from "lucide-react";
import ExpensePreview from "@/components/ExpensePreview";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { encodeId } from "@/lib/urlEncoder";
import { formatCurrency, Currency, getCurrencySymbol } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExpenseItemPreview {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpenseId?: number | null;
  preselectedProjectId?: number | null;
  onExpenseSaved?: () => void;
}

const ExpenseModal = ({
  open,
  onOpenChange,
  editingExpenseId = null,
  preselectedProjectId = null,
  onExpenseSaved,
}: ExpenseModalProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedProjectIdModal, setSelectedProjectIdModal] = useState("");
  const [billNumber, setBillNumber] = useState(`BILL-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    return defaultDue.toISOString().split("T")[0];
  });
  const [items, setItems] = useState<ExpenseItemPreview[]>([
    {
      id: "item-1",
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    },
  ]);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [inclusiveGST, setInclusiveGST] = useState<boolean>(false);
  const [availableServices, setAvailableServices] = useState<ExpenseServiceCatalogItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachmentFileName, setExistingAttachmentFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  
  // Item/Service modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormRate, setItemFormRate] = useState<number | undefined>(undefined);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemModalTargetLineId, setItemModalTargetLineId] = useState<string | null>(null);
  const [editingItemOriginalName, setEditingItemOriginalName] = useState<string | null>(null);
  
  // Vendor modal state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [isSavingVendor, setIsSavingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState({
    fullName: "",
    email: "",
    organization: "",
    mobileNumber: "",
    gstin: "",
    pan: "",
  });
  
  const user = authService.getCurrentUser();
  const userCurrency = (user?.currency as Currency) || 'INR';

  // Load vendors, projects, and services when modal opens
  useEffect(() => {
    if (open) {
      const loadModalData = async () => {
        try {
          const [vendorsData, projectsData, servicesData] = await Promise.all([
            vendorService.getVendors(),
            projectService.getProjects(),
            expenseServiceCatalog.list(),
          ]);
          setVendors(vendorsData);
          setProjects(projectsData);
          setAvailableServices(servicesData);

          // Set preselected project if provided
          if (preselectedProjectId && !editingExpenseId) {
            setSelectedProjectIdModal(preselectedProjectId.toString());
          }

          // If editing, load expense data
          if (editingExpenseId) {
            await loadExpenseForEdit(editingExpenseId, vendorsData, servicesData);
          }
        } catch (error) {
          console.error("Failed to load modal data:", error);
        }
      };
      loadModalData();
    }
  }, [open, editingExpenseId, preselectedProjectId]);

  const formatDateForInput = (date: string | Date): string => {
    if (typeof date === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadExpenseForEdit = async (
    expenseId: number,
    vendorsData: Vendor[],
    servicesData: ExpenseServiceCatalogItem[]
  ) => {
    try {
      const expense = await expenseService.getExpenseById(expenseId);
      const expenseItems = await expenseItemService.getExpenseItems(expenseId);

      setBillNumber(expense.billNumber || `BILL-${expense.id}`);
      setBillDate(formatDateForInput(expense.billDate));
      setDueDate(formatDateForInput(expense.dueDate));
      setSelectedVendorId(expense.vendorId.toString());
      if (expense.projectId) {
        setSelectedProjectIdModal(expense.projectId.toString());
      }
      setTaxPercentage(expense.taxPercentage ?? 0);
      setNotes(expense.additionalNotes || "");
      setExistingAttachmentFileName(expense.attachmentFileName || null);

      if (expenseItems && expenseItems.length > 0) {
        const mappedItems = expenseItems.map((item, idx) => ({
          id: `expense-item-${item.id ?? idx}`,
          description: item.serviceName || `Item ${idx + 1}`,
          quantity: item.quantity ?? 1,
          rate: item.unitPrice ?? 0,
          amount: (item.quantity ?? 1) * (item.unitPrice ?? 0),
        }));
        setItems(mappedItems);
      } else {
        setItems([{
          id: "expense-item-1",
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
        }]);
      }

      if (!vendorsData.some((vendor) => vendor.id === expense.vendorId)) {
        const vendor = await vendorService.getVendorById(expense.vendorId);
        setVendors((prev) => [...prev, vendor]);
      }

      // Ensure all expense item service names are available
      const serviceNamesInExpense = new Set(
        expenseItems
          .map((item) => item.serviceName)
          .filter((name): name is string => !!name && name.trim() !== "")
      );
      
      const existingServiceNames = new Set(servicesData.map((service) => service.name));
      const missingServiceNames = Array.from(serviceNamesInExpense).filter(
        (name) => !existingServiceNames.has(name)
      );
      
      if (missingServiceNames.length > 0) {
        const currentUser = authService.getCurrentUser();
        const userId = currentUser?.id || 0;
        const tempServices: ExpenseServiceCatalogItem[] = missingServiceNames.map((name, idx) => ({
          id: -999 - idx,
          name,
          defaultRate: 0,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setAvailableServices((prev) => {
          const existingNames = new Set(prev.map((service) => service.name));
          const merged = [...prev];
          tempServices.forEach((service) => {
            if (!existingNames.has(service.name)) {
              merged.push(service);
            }
          });
          return merged;
        });
      }
    } catch (error) {
      console.error("Error loading expense for edit:", error);
      toast.error("Failed to load expense data");
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: availableServices[0]?.name ?? "",
        quantity: 1,
        rate: availableServices[0]?.defaultRate ?? 0,
        amount: availableServices[0]?.defaultRate ?? 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ExpenseItemPreview, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value } as ExpenseItemPreview;
        const quantity = field === "quantity" ? Number(value) || 0 : Number(updated.quantity) || 0;
        const rate = field === "rate" ? Number(value) || 0 : Number(updated.rate) || 0;
        updated.quantity = quantity;
        updated.rate = rate;
        updated.amount = quantity * rate;
        return updated;
      })
    );
  };

  const rawTotalEntered = useMemo(
    () => items.reduce((sum, item) => sum + (item.amount || 0), 0),
    [items]
  );

  const effectiveTaxRate = taxPercentage / 100;
  const applyInclusiveGst = inclusiveGST;

  const subtotal = applyInclusiveGst
    ? rawTotalEntered / (1 + effectiveTaxRate)
    : rawTotalEntered;

  const taxAmount = applyInclusiveGst
    ? rawTotalEntered - subtotal
    : subtotal * effectiveTaxRate;

  const totalAmount = applyInclusiveGst
    ? rawTotalEntered
    : subtotal + taxAmount;

  const getOrCreateService = async (description: string, rate: number): Promise<number> => {
    const normalizedName = description.trim().toLowerCase();
    const existing = availableServices.find(
      (service) => service.name.trim().toLowerCase() === normalizedName
    );
    if (existing) {
      return existing.id;
    }
    try {
      const created = await expenseServiceCatalog.create({
        name: description,
        description,
        defaultRate: rate,
      });
      setAvailableServices((prev) => [...prev, created]);
      return created.id;
    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
    }
  };

  const generatePdfDocument = async () => {
    try {
      // Wait a bit for the preview to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!previewRef.current) {
        throw new Error("Preview element not found. Please ensure the expense preview is visible.");
      }

      // Check if preview has content
      const previewElement = previewRef.current;
      if (previewElement.offsetWidth === 0 || previewElement.offsetHeight === 0) {
        throw new Error("Preview element has no dimensions. Please ensure the expense preview is visible on the page.");
      }

      console.log("[ExpenseModal] Starting PDF generation...");

      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      
      if (!html2canvasModule || !html2canvasModule.default) {
        throw new Error("Failed to load html2canvas library");
      }
      if (!jsPDFModule || !jsPDFModule.jsPDF) {
        throw new Error("Failed to load jsPDF library");
      }

      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;
      
      console.log("[ExpenseModal] Libraries loaded, generating canvas...");
      
      // Ensure the preview is in the viewport
      previewElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for scroll to complete
      
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
        useCORS: true,
        logging: false,
        allowTaint: false,
        foreignObjectRendering: false,
        removeContainer: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure all images in the cloned document are loaded
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            if (!img.complete) {
              console.warn("[ExpenseModal] Image not loaded:", img.src);
            }
          });
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Generated canvas is empty or invalid");
      }

      console.log("[ExpenseModal] Canvas generated:", {
        width: canvas.width,
        height: canvas.height
      });

      const imgData = canvas.toDataURL("image/png", 0.95);
      if (!imgData || imgData === "data:," || imgData.length < 100) {
        throw new Error("Failed to convert canvas to image data or image is too small");
      }

      console.log("[ExpenseModal] Creating PDF document...");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Convert canvas pixels to mm (html2canvas uses 96 DPI by default: 1px = 0.264583mm)
      // Since we use scale: 2, the actual pixel size is doubled, so we divide by 2
      const pxToMm = 0.264583;
      const imgWidthMm = (canvas.width * pxToMm) / 2;
      const imgHeightMm = (canvas.height * pxToMm) / 2;
      
      // Calculate ratio to fit on page with margins
      const margin = 10; // 10mm margin on all sides
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      const widthRatio = availableWidth / imgWidthMm;
      const heightRatio = availableHeight / imgHeightMm;
      const ratio = Math.min(widthRatio, heightRatio, 1); // Don't scale up, only down
      
      const finalWidth = imgWidthMm * ratio;
      const finalHeight = imgHeightMm * ratio;
      const marginX = (pageWidth - finalWidth) / 2;
      let marginY = margin;
      
      // Handle multi-page content if image is taller than one page
      if (finalHeight > availableHeight) {
        const pagesNeeded = Math.ceil(finalHeight / availableHeight);
        console.log(`[ExpenseModal] Content requires ${pagesNeeded} pages`);
        
        for (let page = 0; page < pagesNeeded; page++) {
          if (page > 0) {
            pdf.addPage();
            marginY = margin;
          }
          
          const pageStartY = page * availableHeight;
          const pageEndY = Math.min((page + 1) * availableHeight, finalHeight);
          const pageHeightMm = pageEndY - pageStartY;
          
          // Calculate source coordinates
          const sourceStartY = (pageStartY / finalHeight) * canvas.height;
          const sourceHeight = (pageHeightMm / finalHeight) * canvas.height;
          
          // Create a temporary canvas for this page slice
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) {
            throw new Error("Failed to get canvas context");
          }
          ctx.drawImage(canvas, 0, sourceStartY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          
          const pageImgData = pageCanvas.toDataURL("image/png", 0.95);
          const pageImgHeightMm = (sourceHeight * pxToMm) / 2;
          const pageFinalHeight = pageImgHeightMm * ratio;
          
          pdf.addImage(pageImgData, "PNG", marginX, marginY, finalWidth, pageFinalHeight, undefined, "FAST");
        }
      } else {
        // Single page - center vertically
        marginY = (pageHeight - finalHeight) / 2;
        pdf.addImage(imgData, "PNG", marginX, marginY, finalWidth, finalHeight, undefined, "FAST");
      }

      console.log("[ExpenseModal] PDF generated successfully");
      return {
        pdf,
        defaultFileName: `${billNumber || "expense"}.pdf`,
      };
    } catch (error: any) {
      console.error("[ExpenseModal] PDF generation error:", {
        error,
        message: error?.message,
        stack: error?.stack,
        previewRefExists: !!previewRef.current
      });
      throw new Error(`PDF generation failed: ${error?.message || "Unknown error"}`);
    }
  };

  const handleSaveExpense = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (!selectedProjectIdModal) {
      toast.error("Please select a project");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      toast.error("Each item requires a description");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const mappedItems = await Promise.all(
        items.map(async (item) => ({
          serviceId: await getOrCreateService(item.description, item.rate),
          quantity: item.quantity,
          unitPrice: item.rate,
        }))
      );

      let expenseIdForAttachment: number | null = null;

      if (editingExpenseId) {
        // Update existing expense
        const expenseId = editingExpenseId;
        const updatePayload = {
          billNumber: billNumber || undefined,
          billDate,
          dueDate,
          vendorId: parseInt(selectedVendorId, 10),
          projectId: parseInt(selectedProjectIdModal, 10),
          taxPercentage,
          totalAmount: totalAmount,
          additionalNotes: notes || undefined,
        };
        await expenseService.updateExpense(expenseId, updatePayload);

        // Delete existing items and create new ones
        const existingItems = await expenseItemService.getExpenseItems(expenseId);
        await Promise.all(existingItems.map((item) => expenseItemService.deleteExpenseItem(item.id)));

        for (const item of mappedItems) {
          if (item.serviceId > 0) {
            await expenseItemService.createExpenseItem(expenseId, item);
          }
        }

        expenseIdForAttachment = expenseId;
        toast.success("Expense updated successfully");
      } else {
        // Create new expense
        const createPayload = {
          billNumber: billNumber || undefined,
          billDate,
          dueDate,
          vendorId: parseInt(selectedVendorId, 10),
          projectId: parseInt(selectedProjectIdModal, 10),
          taxPercentage,
          totalAmount: totalAmount,
          additionalNotes: notes || undefined,
          items: mappedItems,
        };
        const savedExpense = await expenseService.createExpense(createPayload);
        
        if (mappedItems.length > 0) {
          for (const item of mappedItems) {
            if (item.serviceId > 0) {
              await expenseItemService.createExpenseItem(savedExpense.id, item);
            }
          }
        }

        expenseIdForAttachment = savedExpense.id;
        toast.success("Expense recorded successfully");
      }

      // Generate and upload PDF
      try {
        console.log("[ExpenseModal] Generating PDF for saved expense:", expenseIdForAttachment);
        // Ensure preview is visible for PDF generation
        if (!showPreview) {
          setShowPreview(true);
          // Wait for collapsible to expand and preview to render
          await new Promise(resolve => setTimeout(resolve, 800));
        } else {
          // Even if already visible, wait a bit to ensure it's fully rendered
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        const { pdf, defaultFileName } = await generatePdfDocument();
        const inferredName =
          billNumber && billNumber.trim() !== ""
            ? `${billNumber}.pdf`
            : defaultFileName;
        const pdfArrayBuffer = pdf.output("arraybuffer") as ArrayBuffer;
        const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

        console.log("[ExpenseModal] Uploading PDF to server...");
        await expenseService.uploadExpensePdf(expenseIdForAttachment, pdfBlob, inferredName);
        console.log("[ExpenseModal] PDF uploaded successfully");
      } catch (error: any) {
        console.error("Error generating/uploading expense PDF:", {
          error,
          message: error?.message,
          stack: error?.stack
        });
        const errorMessage = error?.message || "PDF generation failed";
        toast.warning(`Expense saved but PDF generation failed: ${errorMessage}`, {
          duration: 5000,
        });
      }

      // Handle attachment upload if file is selected
      if (attachmentFile && expenseIdForAttachment) {
        try {
          const formData = new FormData();
          formData.append('attachment', attachmentFile);
          const token = localStorage.getItem("accessToken");
          const uploadResponse = await fetch(`${API_BASE_URL}/api/expenses/${encodeId(expenseIdForAttachment)}/attachment`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });
          if (!uploadResponse.ok) {
            throw new Error("Failed to upload attachment");
          }
        } catch (error) {
          console.error("Error uploading attachment:", error);
          // Don't fail the entire operation if attachment upload fails
        }
      }

      // Reset form
      resetExpenseForm();
      
      // Close modal and call callback
      onOpenChange(false);
      if (onExpenseSaved) {
        onExpenseSaved();
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast.error(error?.message || `Failed to ${editingExpenseId ? 'update' : 'create'} expense`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetExpenseForm = () => {
    setSelectedVendorId("");
    setSelectedProjectIdModal("");
    setBillNumber(`BILL-${Date.now().toString().slice(-4)}`);
    setBillDate(new Date().toISOString().split("T")[0]);
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    setDueDate(defaultDue.toISOString().split("T")[0]);
    setItems([{
      id: "item-1",
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    }]);
    setTaxPercentage(0);
    setNotes("");
    setInclusiveGST(false);
    setAttachmentFile(null);
    setExistingAttachmentFileName(null);
    setShowPreview(false);
    setShowItemModal(false);
    setItemFormName("");
    setItemFormRate(undefined);
    setEditingItemId(null);
    setItemModalTargetLineId(null);
    setEditingItemOriginalName(null);
    setShowVendorModal(false);
    setEditingVendorId(null);
    setVendorForm({
      fullName: "",
      email: "",
      organization: "",
      mobileNumber: "",
      gstin: "",
      pan: "",
    });
  };

  const openNewVendorModal = () => {
    setEditingVendorId(null);
    setVendorForm({
      fullName: "",
      email: "",
      organization: "",
      mobileNumber: "",
      gstin: "",
      pan: "",
    });
    setShowVendorModal(true);
  };

  const openEditVendorModal = async (vendorId: string) => {
    const vendor = vendors.find((v) => v.id.toString() === vendorId);
    if (!vendor) return;
    setEditingVendorId(vendorId);
    setVendorForm({
      fullName: vendor.fullName,
      email: vendor.email,
      organization: vendor.organization ?? "",
      mobileNumber: vendor.mobileNumber ?? "",
      gstin: vendor.gstin ?? "",
      pan: vendor.pan ?? "",
    });
    setShowVendorModal(true);
  };

  const handleSaveVendor = async () => {
    if (isSavingVendor) return;
    setIsSavingVendor(true);
    try {
      let vendorId: number;
      
      if (editingVendorId) {
        vendorId = parseInt(editingVendorId, 10);
        const updated = await vendorService.updateVendor(vendorId, {
          fullName: vendorForm.fullName,
          email: vendorForm.email,
          organization: vendorForm.organization || undefined,
          mobileNumber: vendorForm.mobileNumber || undefined,
          gstin: vendorForm.gstin || undefined,
          pan: vendorForm.pan || undefined,
        });
        setVendors((prev) => prev.map((v) => (v.id === vendorId ? updated : v)));
        toast.success("Vendor updated");
      } else {
        const created = await vendorService.createVendor({
          fullName: vendorForm.fullName,
          email: vendorForm.email,
          organization: vendorForm.organization || undefined,
          mobileNumber: vendorForm.mobileNumber || undefined,
          gstin: vendorForm.gstin || undefined,
          pan: vendorForm.pan || undefined,
        });
        vendorId = created.id;
        setVendors((prev) => [...prev, created]);
        setSelectedVendorId(created.id.toString());
        toast.success("Vendor added");
      }
      
      setShowVendorModal(false);
    } catch (error) {
      console.error("Error saving vendor:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save vendor";
      toast.error(message);
    } finally {
      setIsSavingVendor(false);
    }
  };

  const openNewItemModalForLine = (lineId: string | null = null) => {
    setItemModalTargetLineId(lineId);
    setEditingItemId(null);
    setItemFormName("");
    if (lineId) {
      const line = items.find((entry) => entry.id === lineId);
      setItemFormRate(line ? line.rate : undefined);
    } else {
      setItemFormRate(undefined);
    }
    setEditingItemOriginalName(null);
    setShowItemModal(true);
  };

  const openEditItemModal = (serviceName: string) => {
    const existing = availableServices.find((service) => service.name === serviceName);
    if (!existing) return;
    setEditingItemId(existing.id);
    setItemFormName(existing.name);
    setItemFormRate(existing.defaultRate);
    setItemModalTargetLineId(null);
    setEditingItemOriginalName(existing.name);
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    const trimmedName = itemFormName.trim();
    if (!trimmedName) {
      toast.error("Item name is required");
      return;
    }
    if (isSavingItem) return;
    setIsSavingItem(true);
    const rate = Number(itemFormRate ?? 0);

    try {
      if (editingItemId) {
        const updated = await expenseServiceCatalog.update(editingItemId, {
          name: trimmedName,
          defaultRate: rate,
          description: trimmedName,
        });
        setAvailableServices((prev) =>
          prev.map((service) => (service.id === updated.id ? updated : service))
        );
        setItems((prev) =>
          prev.map((line) =>
            line.description === (editingItemOriginalName ?? updated.name)
              ? {
                  ...line,
                  description: updated.name,
                  rate: updated.defaultRate,
                  amount: line.quantity * updated.defaultRate,
                }
              : line
          )
        );
        toast.success("Item updated");
      } else {
        const created = await expenseServiceCatalog.create({
          name: trimmedName,
          description: trimmedName,
          defaultRate: rate,
        });
        setAvailableServices((prev) => [...prev, created]);
        if (itemModalTargetLineId) {
          handleItemChange(itemModalTargetLineId, "description", created.name);
          handleItemChange(itemModalTargetLineId, "rate", created.defaultRate);
        }
        toast.success("Item added");
      }
      setShowItemModal(false);
      setItemFormName("");
      setItemFormRate(undefined);
      setEditingItemId(null);
      setItemModalTargetLineId(null);
      setEditingItemOriginalName(null);
    } catch (error) {
      console.error("Error saving item:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save item";
      toast.error(message);
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleModalClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetExpenseForm();
    }
  };

  return (
    <>
      {/* Create/Edit Expense Modal */}
      <Dialog open={open} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="relative">
            {isSaving && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-md rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  {editingExpenseId ? "Updating expense..." : "Saving expense..."}
                </p>
              </div>
            )}
            <DialogHeader>
              <DialogTitle>{editingExpenseId ? "Edit Expense" : "Record Expense"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project <span className="text-red-500">*</span></Label>
                <Select 
                  value={selectedProjectIdModal} 
                  onValueChange={setSelectedProjectIdModal}
                  disabled={preselectedProjectId !== null && preselectedProjectId !== undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter((project) => project.status === 'active' || project.id.toString() === selectedProjectIdModal)
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendor <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors
                        .filter((vendor) => vendor.isActive !== false || vendor.id.toString() === selectedVendorId)
                        .map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id.toString()}>
                            <div className="w-full min-w-0 flex items-center justify-between">
                              <div className="truncate pr-2">{vendor.fullName}</div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openEditVendorModal(vendor.id.toString());
                                }}
                                title="Edit vendor"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={openNewVendorModal} className="text-xs sm:text-sm whitespace-nowrap">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline text-sm">Add New Vendor</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bill Number</Label>
                <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bill Date</Label>
                  <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Items</Label>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={item.description}
                            onValueChange={(value) => {
                              handleItemChange(item.id, "description", value);
                              const matched = availableServices.find((service) => service.name === value);
                              if (matched && matched.defaultRate > 0) {
                                handleItemChange(item.id, "rate", matched.defaultRate);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableServices.map((service) => (
                                <SelectItem key={service.id} value={service.name}>
                                  <div className="w-full min-w-0 flex items-center justify-between">
                                    <div className="truncate pr-2">
                                      {service.name}
                                      {service.defaultRate > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          ({formatCurrency(service.defaultRate, userCurrency)})
                                        </span>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        openEditItemModal(service.name);
                                      }}
                                      title="Edit item"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </SelectItem>
                              ))}
                              <div className="p-1 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openNewItemModalForLine(item.id);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add New Service
                                </Button>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openNewItemModalForLine(item.id)}
                          title="Add new item"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, "quantity", Number(e.target.value) || 0)
                          }
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            {getCurrencySymbol(userCurrency)}
                          </span>
                          <Input
                            type="number"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(item.id, "rate", Number(e.target.value) || 0)
                            }
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.amount, userCurrency)}
                          </span>
                          {items.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={handleAddItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tax (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxPercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = value === "" ? 0 : Number(value);
                    setTaxPercentage(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="inclusive-gst-expense-modal"
                  checked={inclusiveGST}
                  onCheckedChange={(v) => setInclusiveGST(Boolean(v))}
                />
                <Label htmlFor="inclusive-gst-expense-modal">Amount inclusive of GST?</Label>
              </div>

              <div className="space-y-2">
                <Label>Attachment (Image/PDF)</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAttachmentFile(file);
                  }}
                />
                {attachmentFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {attachmentFile.name}
                  </p>
                )}
                {!attachmentFile && existingAttachmentFileName && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Current: {existingAttachmentFileName}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!editingExpenseId) return;
                        try {
                          const token = localStorage.getItem("accessToken");
                          const response = await fetch(`${API_BASE_URL}/api/expenses/${encodeId(editingExpenseId)}/attachment`, {
                            headers: {
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                          });
                          if (response.ok) {
                            const blob = await response.blob();
                            const downloadUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = downloadUrl;
                            link.download = existingAttachmentFileName || "attachment";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(downloadUrl);
                            toast.success("Attachment downloaded");
                          }
                        } catch (error) {
                          console.error("Error downloading attachment:", error);
                          toast.error("Failed to download attachment");
                        }
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Add any notes about this expense"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" type="button" className="w-full">
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div ref={previewRef} className="bg-white">
                    <ExpensePreview
                      billNumber={billNumber}
                      billDate={billDate}
                      dueDate={dueDate}
                      vendor={vendors.find((v) => v.id.toString() === selectedVendorId)}
                      items={items}
                      subtotal={subtotal}
                      taxPercentage={taxPercentage}
                      taxAmount={taxAmount}
                      total={totalAmount}
                      currency={userCurrency}
                      notes={notes}
                      inclusiveGST={inclusiveGST}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-semibold">{formatCurrency(subtotal, userCurrency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax</p>
                  <p className="text-lg font-semibold">{formatCurrency(taxAmount, userCurrency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalAmount, userCurrency)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveExpense}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingExpenseId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    editingExpenseId ? "Update Expense" : "Save Expense"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Vendor Modal */}
      <Dialog open={showVendorModal} onOpenChange={setShowVendorModal}>
        <DialogContent>
          <div className="relative">
            {isSavingVendor && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-md rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  {editingVendorId ? "Updating vendor..." : "Saving vendor..."}
                </p>
              </div>
            )}
            <DialogHeader>
              <DialogTitle>{editingVendorId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={vendorForm.fullName}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Organization</Label>
                <Input
                  value={vendorForm.organization}
                  onChange={(e) =>
                    setVendorForm((prev) => ({ ...prev, organization: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input
                  value={vendorForm.mobileNumber}
                  onChange={(e) =>
                    setVendorForm((prev) => ({ ...prev, mobileNumber: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={vendorForm.gstin}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, gstin: e.target.value }))}
                />
              </div>
              <div>
                <Label>PAN (recommended)</Label>
                <Input
                  value={vendorForm.pan}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowVendorModal(false)} disabled={isSavingVendor}>
                  Cancel
                </Button>
                <Button onClick={handleSaveVendor} disabled={isSavingVendor}>
                  {isSavingVendor ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingVendorId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    editingVendorId ? "Save Vendor" : "Add Vendor"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Service/Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent>
          <div className="relative">
            {isSavingItem && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-md rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  {editingItemId ? "Updating service..." : "Saving service..."}
                </p>
              </div>
            )}
            <DialogHeader>
              <DialogTitle>{editingItemId ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Service name</Label>
                <Input
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  placeholder="e.g. Office rent"
                />
              </div>
              <div>
                <Label>Default rate (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {getCurrencySymbol(userCurrency)}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={itemFormRate ?? ""}
                    onChange={(e) =>
                      setItemFormRate(
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    placeholder="0"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowItemModal(false)} disabled={isSavingItem}>
                  Cancel
                </Button>
                <Button onClick={handleSaveItem} disabled={isSavingItem}>
                  {isSavingItem ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingItemId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    editingItemId ? "Save Service" : "Add Service"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseModal;
