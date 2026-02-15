import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService } from "@/lib/auth";
import { vendorService, Vendor } from "@/lib/services/vendorService";
import { vendorNoteService } from "@/lib/services/vendorNoteService";
import { VendorNote } from "@/lib/types/vendorNote";
import { projectService, Project } from "@/lib/services/projectService";
import {
  expenseServiceCatalog,
  ExpenseServiceCatalogItem,
} from "@/lib/services/expenseServiceCatalog";
import { expenseService, Expense } from "@/lib/services/expenseService";
import { expenseItemService } from "@/lib/services/expenseItemService";
import ExpensePreview, { ExpenseItemPreview } from "@/components/ExpensePreview";
import { Plus, Trash2, Loader2, Edit2, Download, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import NotesModal from "@/components/NotesModal";
import NoteDisplay from "@/components/NoteDisplay";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/lib/api";
import { getIdFromUrl, encodeId } from "@/lib/urlEncoder";
import { formatCurrency, Currency, getCurrencySymbol } from "@/lib/currency";

type SaveMode = "create-save" | "update-save";

const CreateExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
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

  // Debug: Log when items change
  useEffect(() => {
    console.log("[CreateExpense] Items state changed:", {
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate
      }))
    });
  }, [items]);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [inclusiveGST, setInclusiveGST] = useState<boolean>(false);
  const [availableServices, setAvailableServices] = useState<ExpenseServiceCatalogItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveMode | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachmentFileName, setExistingAttachmentFileName] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState({
    fullName: "",
    email: "",
    organization: "",
    mobileNumber: "",
    gstin: "",
    pan: "",
  });

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormRate, setItemFormRate] = useState<number | undefined>(undefined);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemModalTargetLineId, setItemModalTargetLineId] = useState<string | null>(null);
  const [editingItemOriginalName, setEditingItemOriginalName] = useState<string | null>(null);

  // Notes state
  const [latestVendorNote, setLatestVendorNote] = useState<VendorNote | null>(null);
  const [allVendorNotes, setAllVendorNotes] = useState<VendorNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const search = new URLSearchParams(location.search);
  const editIdNumber = getIdFromUrl(search, "id");
  const editId = editIdNumber?.toString() ?? null;

  const hydrateExpense = useCallback(
    async (
      expenseId: number,
      vendorsData: Vendor[],
      servicesData: ExpenseServiceCatalogItem[]
    ) => {
      console.log("[CreateExpense] Loading expense data for ID:", expenseId);
      const expense = await expenseService.getExpenseById(expenseId);
      console.log("[CreateExpense] Expense loaded:", {
        id: expense.id,
        billNumber: expense.billNumber,
        vendorId: expense.vendorId
      });
      
      const expenseItems = await expenseItemService.getExpenseItems(expenseId);
      console.log("[CreateExpense] Fetched expense items:", expenseItems);

      setBillNumber(expense.billNumber || `BILL-${expense.id}`);
      setBillDate(formatDateForInput(expense.billDate));
      setDueDate(formatDateForInput(expense.dueDate));
      setSelectedVendorId(expense.vendorId.toString());
      if (expense.projectId) {
        setSelectedProjectId(expense.projectId.toString());
      }
      setTaxPercentage(expense.taxPercentage ?? 0);
      setNotes(expense.additionalNotes || "");
      // TODO: Load inclusiveGST from expense if stored in backend

      if (expenseItems && expenseItems.length > 0) {
        const mappedItems = expenseItems.map((item, idx) => ({
          id: `expense-item-${item.id ?? idx}`,
          description: item.serviceName || `Item ${idx + 1}`,
          quantity: item.quantity ?? 1,
          rate: item.unitPrice ?? 0,
          amount: (item.quantity ?? 1) * (item.unitPrice ?? 0),
        }));
        console.log("[CreateExpense] Mapped expense items:", mappedItems);
        setItems(mappedItems);
        console.log("[CreateExpense] Expense items loaded and set:", mappedItems.length);
      } else {
        console.warn("[CreateExpense] No expense items found for expense:", expenseId);
        // Initialize with empty item if no items found
        setItems([{
          id: "expense-item-1",
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
        }]);
      }

      setExistingAttachmentFileName(expense.attachmentFileName || null);

      if (!vendorsData.some((vendor) => vendor.id === expense.vendorId)) {
        const vendor = await vendorService.getVendorById(expense.vendorId);
        setVendors((prev) => [...prev, vendor]);
      }

      // Ensure all expense item service names are available in availableServices
      // This handles cases where services were deleted or renamed
      const serviceNamesInExpense = new Set(
        expenseItems
          .map((item) => item.serviceName)
          .filter((name): name is string => !!name && name.trim() !== "")
      );
      
      const existingServiceNames = new Set(servicesData.map((service) => service.name));
      const missingServiceNames = Array.from(serviceNamesInExpense).filter(
        (name) => !existingServiceNames.has(name)
      );
      
      // Add missing service names as temporary catalog items so they can be displayed
      if (missingServiceNames.length > 0) {
        console.log("[CreateExpense] Adding missing service names to availableServices:", missingServiceNames);
        const currentUser = authService.getCurrentUser();
        const userId = currentUser?.id || 0; // Fallback to 0 if user not found
        const tempServices: ExpenseServiceCatalogItem[] = missingServiceNames.map((name, idx) => ({
          id: -999 - idx, // Use negative IDs for temporary services
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

      // Also fetch missing services by ID (in case serviceId exists but service was deleted)
      const serviceIdsInExpense = new Set(expenseItems.map((item) => item.serviceId).filter((id): id is number => !!id));
      const missingServices = Array.from(serviceIdsInExpense).filter(
        (serviceId) => !servicesData.some((service) => service.id === serviceId)
      );
      if (missingServices.length > 0) {
        const fetched = await Promise.all(
          missingServices.map((id) => expenseServiceCatalog.getById(id))
        );
        setAvailableServices((prev) => {
          const existingIds = new Set(prev.map((service) => service.id));
          const merged = [...prev];
          fetched.forEach((service) => {
            if (!existingIds.has(service.id)) {
              merged.push(service);
            }
          });
          return merged;
        });
      }
    },
    []
  );

  const loadInitialData = useCallback(async () => {
    try {
      const [vendorsData, servicesData, projectsData] = await Promise.all([
        vendorService.getVendors(),
        expenseServiceCatalog.list(),
        projectService.getProjects(),
      ]);

      setVendors(vendorsData);
      setAvailableServices(servicesData);
      setProjects(projectsData || []);

      if (editId) {
        const expenseId = parseInt(editId, 10);
        if (Number.isNaN(expenseId)) {
          toast.error("Invalid expense ID");
          navigate("/expenses");
          return;
        }

        await hydrateExpense(expenseId, vendorsData, servicesData);
      }
    } catch (error) {
      console.error("Error loading expense data:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load data";
      toast.error(message);
    }
  }, [editId, hydrateExpense, navigate]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }
    void loadInitialData();
  }, [navigate, loadInitialData]);

  // Fetch latest vendor note when selected vendor changes
  useEffect(() => {
    const fetchLatestNote = async () => {
      if (!selectedVendorId) {
        setLatestVendorNote(null);
        setAllVendorNotes([]);
        return;
      }

      try {
        setIsLoadingNotes(true);
        const vendorId = parseInt(selectedVendorId, 10);
        if (!isNaN(vendorId)) {
          const note = await vendorNoteService.getLatestVendorNote(vendorId);
          setLatestVendorNote(note);
        } else {
          setLatestVendorNote(null);
        }
      } catch (error: any) {
        console.error("Error fetching latest vendor note:", error);
        setLatestVendorNote(null);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    fetchLatestNote();
  }, [selectedVendorId]);

  // Fetch all notes when notes modal opens
  const fetchAllVendorNotes = async () => {
    if (!selectedVendorId) {
      setAllVendorNotes([]);
      return;
    }

    try {
      setIsLoadingNotes(true);
      const vendorId = parseInt(selectedVendorId, 10);
      if (!isNaN(vendorId)) {
        const notes = await vendorNoteService.getVendorNotes(vendorId);
        setAllVendorNotes(notes);
      } else {
        setAllVendorNotes([]);
      }
    } catch (error: any) {
      console.error("Error fetching vendor notes:", error);
      setAllVendorNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleCreateVendorNote = async (note: string) => {
    if (!selectedVendorId) {
      throw new Error("No vendor selected");
    }
    const vendorId = parseInt(selectedVendorId, 10);
    if (isNaN(vendorId)) {
      throw new Error("Invalid vendor ID");
    }
    await vendorNoteService.createVendorNote(vendorId, { note });
  };

  const handleUpdateVendorNote = async (noteId: number, note: string) => {
    if (!selectedVendorId) {
      throw new Error("No vendor selected");
    }
    const vendorId = parseInt(selectedVendorId, 10);
    if (isNaN(vendorId)) {
      throw new Error("Invalid vendor ID");
    }
    await vendorNoteService.updateVendorNote(vendorId, noteId, { note });
  };

  const handleDeleteVendorNote = async (noteId: number) => {
    if (!selectedVendorId) {
      throw new Error("No vendor selected");
    }
    const vendorId = parseInt(selectedVendorId, 10);
    if (isNaN(vendorId)) {
      throw new Error("Invalid vendor ID");
    }
    await vendorNoteService.deleteVendorNote(vendorId, noteId);
    // Refresh latest note after deletion
    if (allVendorNotes.length === 1) {
      // If we deleted the last note, clear latest note
      setLatestVendorNote(null);
    } else {
      // Otherwise, refresh to get the new latest
      try {
        const note = await vendorNoteService.getLatestVendorNote(vendorId);
        setLatestVendorNote(note);
      } catch (error) {
        console.error("Error refreshing latest note after deletion:", error);
        setLatestVendorNote(null);
      }
    }
  };

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

  // compute subtotal (net, excluding tax), tax and total according to inclusiveGST flag
  const subtotal = applyInclusiveGst
    ? rawTotalEntered / (1 + effectiveTaxRate)
    : rawTotalEntered;

  const taxAmount = applyInclusiveGst
    ? rawTotalEntered - subtotal
    : subtotal * effectiveTaxRate;

  const totalAmount = applyInclusiveGst
    ? rawTotalEntered
    : subtotal + taxAmount;

  const handleSaveVendor = async () => {
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
    }
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
  }
};

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
    console.error("Error creating item:", error);
    return 0;
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

      console.log("[CreateExpense] Starting PDF generation...");
      console.log("[CreateExpense] Preview element:", {
        exists: !!previewRef.current,
        offsetWidth: previewElement.offsetWidth,
        offsetHeight: previewElement.offsetHeight,
        scrollHeight: previewElement.scrollHeight,
        innerHTML: previewElement.innerHTML.substring(0, 100) // First 100 chars for debugging
      });

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
      
      console.log("[CreateExpense] Libraries loaded, generating canvas...");
      
      // Ensure the preview is in the viewport
      previewElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for scroll to complete
      
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
        useCORS: true,
        logging: false,
        allowTaint: false, // Changed to false to avoid taint issues
        foreignObjectRendering: false,
        removeContainer: false,
        imageTimeout: 15000, // 15 second timeout for images
        onclone: (clonedDoc) => {
          // Ensure all images in the cloned document are loaded
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            if (!img.complete) {
              console.warn("[CreateExpense] Image not loaded:", img.src);
            }
          });
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Generated canvas is empty or invalid");
      }

      console.log("[CreateExpense] Canvas generated:", {
        width: canvas.width,
        height: canvas.height
      });

      const imgData = canvas.toDataURL("image/png", 0.95); // Use 0.95 quality for better compression
      if (!imgData || imgData === "data:," || imgData.length < 100) {
        throw new Error("Failed to convert canvas to image data or image is too small");
      }

      console.log("[CreateExpense] Creating PDF document...");
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
        console.log(`[CreateExpense] Content requires ${pagesNeeded} pages`);
        
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

      console.log("[CreateExpense] PDF generated successfully");
      return {
        pdf,
        defaultFileName: `${billNumber || "expense"}.pdf`,
      };
    } catch (error: any) {
      console.error("[CreateExpense] PDF generation error:", {
        error,
        message: error?.message,
        stack: error?.stack,
        previewRefExists: !!previewRef.current
      });
      throw new Error(`PDF generation failed: ${error?.message || "Unknown error"}`);
    }
  };

  const handleSave = async ({ mode }: { mode: SaveMode }) => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (!selectedProjectId) {
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
    setSaveMode(mode);

    try {
      const mappedItems = await Promise.all(
        items.map(async (item) => ({
          serviceId: await getOrCreateService(item.description, item.rate),
          quantity: item.quantity,
          unitPrice: item.rate,
        }))
      );

      const expensePayload = {
        billNumber: billNumber || undefined,
        billDate,
        dueDate,
        vendorId: parseInt(selectedVendorId, 10),
        projectId: parseInt(selectedProjectId, 10),
        taxPercentage,
        totalAmount: totalAmount,
        additionalNotes: notes || undefined,
        items: mappedItems,
      };

      let savedExpense: Expense;
      if (editId) {
        const expenseId = parseInt(editId, 10);
        savedExpense = await expenseService.updateExpense(expenseId, expensePayload);

        const existingItems = await expenseItemService.getExpenseItems(expenseId);
        await Promise.all(existingItems.map((item) => expenseItemService.deleteExpenseItem(item.id)));

        for (const item of mappedItems) {
          if (item.serviceId > 0) {
            await expenseItemService.createExpenseItem(expenseId, item);
          }
        }
        toast.success("Expense updated successfully");
      } else {
        savedExpense = await expenseService.createExpense(expensePayload);
        if (mappedItems.length > 0) {
          for (const item of mappedItems) {
            if (item.serviceId > 0) {
              await expenseItemService.createExpenseItem(savedExpense.id, item);
            }
          }
        }
        toast.success("Expense recorded successfully");
      }

      // Generate and upload PDF
      try {
        console.log("[CreateExpense] Generating PDF for saved expense:", savedExpense.id);
        const { pdf, defaultFileName } = await generatePdfDocument();
        const inferredName =
          savedExpense.billNumber && savedExpense.billNumber.trim() !== ""
            ? `${savedExpense.billNumber}.pdf`
            : defaultFileName;
        const pdfArrayBuffer = pdf.output("arraybuffer") as ArrayBuffer;
        const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

        console.log("[CreateExpense] Uploading PDF to server...");
        await expenseService.uploadExpensePdf(savedExpense.id, pdfBlob, inferredName);
        console.log("[CreateExpense] PDF uploaded successfully");
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

      // Upload attachment if provided
      if (attachmentFile) {
        try {
          const formData = new FormData();
          formData.append("attachment", attachmentFile);
          const token = localStorage.getItem("accessToken");
          const uploadResponse = await fetch(
            `${API_BASE_URL}/api/expenses/${encodeId(savedExpense.id)}/attachment`,
            {
              method: "POST",
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: formData,
            }
          );
          if (!uploadResponse.ok) {
            throw new Error("Failed to upload attachment");
          }
          setExistingAttachmentFileName(attachmentFile.name);
        } catch (error) {
          console.error("Error uploading attachment:", error);
          toast.warning("Expense saved but attachment upload failed");
        }
      }

      navigate("/expenses");
    } catch (error) {
      console.error("Error saving expense:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save expense";
      toast.error(message);
    } finally {
      setIsSaving(false);
      setSaveMode(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!editId) {
      toast.error("Please save the expense before downloading the PDF");
      return;
    }

    try {
      setDownloadingPdf(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/api/expenses/${editId ? encodeId(parseInt(editId, 10)) : ''}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download expense PDF");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${billNumber || "expense"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Expense PDF downloaded");
    } catch (error: any) {
      console.error("Error downloading expense PDF:", error);
      toast.error(error?.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadAttachment = async () => {
    if (!editId) {
      toast.error("Please save the expense before downloading the attachment");
      return;
    }

    if (!existingAttachmentFileName) {
      toast.error("No attachment found for this expense");
      return;
    }

    try {
      setDownloadingAttachment(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/api/expenses/${editId ? encodeId(parseInt(editId, 10)) : ''}/attachment`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download attachment");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = existingAttachmentFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Attachment downloaded");
    } catch (error: any) {
      console.error("Error downloading attachment:", error);
      toast.error(error?.message || "Failed to download attachment");
    } finally {
      setDownloadingAttachment(false);
    }
  };

  return (
    <>
      {isSaving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {saveMode === "update-save" ? "Updating expense..." : "Saving expense..."}
          </p>
        </div>
      )}
      <AppShell>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{editId ? "Edit Expense" : "Record Expense"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Project <span className="text-red-500">*</span></Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter((project) => project.status === 'active' || project.id.toString() === selectedProjectId)
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
                        .filter((vendor) => {
                          // Show active vendors, or the currently selected vendor even if inactive
                          return vendor.isActive !== false || vendor.id.toString() === selectedVendorId;
                        })
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
                    {/* <span className="sm:hidden">Add</span> */}
                  </Button>
                </div>
                {/* Vendor Notes Display */}
                {selectedVendorId && (
                  <NoteDisplay
                    note={latestVendorNote?.note || null}
                    onViewNotes={() => {
                      setShowNotesModal(true);
                      fetchAllVendorNotes();
                    }}
                    entityType="Vendor"
                  />
                )}
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
                                          ({formatCurrency(service.defaultRate, (authService.getCurrentUser()?.currency as Currency) || 'INR')})
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
                            {getCurrencySymbol((authService.getCurrentUser()?.currency as Currency) || 'INR')}
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
                            {item.amount.toLocaleString("en-IN", {
                              style: "currency",
                              currency: "INR",
                            })}
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
                  id="inclusive-gst-expense"
                  checked={inclusiveGST}
                  onCheckedChange={(v) => setInclusiveGST(Boolean(v))}
                />
                <Label htmlFor="inclusive-gst-expense">Amount inclusive of GST?</Label>
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
                      onClick={handleDownloadAttachment}
                      disabled={downloadingAttachment}
                    >
                      {downloadingAttachment ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
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

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button
                  className="flex-1 min-w-[120px] text-xs sm:text-sm whitespace-nowrap"
                  disabled={isSaving}
                  onClick={() => handleSave({ mode: editId ? "update-save" : "create-save" })}
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">{editId ? "Updating..." : "Saving..."}</span>
                      <span className="sm:hidden">{editId ? "Updating" : "Saving"}</span>
                    </span>
                  ) : editId ? (
                    <>
                      <span className="hidden sm:inline">Update Expense</span>
                      <span className="sm:hidden">Update</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Save Expense</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </Button>
                {editId && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      className="text-xs sm:text-sm whitespace-nowrap"
                    >
                      {downloadingPdf ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Preparing...</span>
                          <span className="sm:hidden">Preparing</span>
                        </span>
                      ) : (
                        <>
                          <Download className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Download PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </>
                      )}
                    </Button>
                    {existingAttachmentFileName && (
                      <Button
                        variant="outline"
                        onClick={handleDownloadAttachment}
                        disabled={downloadingAttachment}
                        title="Download uploaded attachment"
                      >
                        {downloadingAttachment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => navigate("/expenses")} disabled={isSaving} className="text-xs sm:text-sm whitespace-nowrap">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:sticky lg:top-24 h-fit">
            <div ref={previewRef}>
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
                currency={(authService.getCurrentUser()?.currency as Currency) || 'INR'}
                notes={notes}
                inclusiveGST={applyInclusiveGst}
              />
            </div>
          </div>
        </div>

        <Dialog open={showVendorModal} onOpenChange={setShowVendorModal}>
          <DialogContent>
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
                <Button variant="outline" onClick={() => setShowVendorModal(false)} className="text-xs sm:text-sm whitespace-nowrap">
                  Cancel
                </Button>
                <Button onClick={handleSaveVendor} className="text-xs sm:text-sm whitespace-nowrap">
                  {editingVendorId ? (
                    <>
                      <span className="hidden sm:inline">Save Vendor</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Add Vendor</span>
                      <span className="sm:hidden">Add</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItemId ? "Edit Item" : "Add Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Item name</Label>
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
                    {getCurrencySymbol((authService.getCurrentUser()?.currency as Currency) || 'INR')}
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
                <Button variant="outline" onClick={() => setShowItemModal(false)} className="text-xs sm:text-sm whitespace-nowrap">
                  Cancel
                </Button>
                <Button onClick={handleSaveItem} className="text-xs sm:text-sm whitespace-nowrap">
                  {editingItemId ? (
                    <>
                      <span className="hidden sm:inline">Save Item</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Add Item</span>
                      <span className="sm:hidden">Add</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Modal */}
        {selectedVendorId && (
          <NotesModal
            open={showNotesModal}
            onOpenChange={setShowNotesModal}
            title="Vendor"
            entityId={parseInt(selectedVendorId, 10)}
            notes={allVendorNotes.map((n) => ({
              id: n.id,
              note: n.note,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            }))}
            isLoading={isLoadingNotes}
            onRefresh={fetchAllVendorNotes}
            onCreateNote={handleCreateVendorNote}
            onUpdateNote={handleUpdateVendorNote}
            onDeleteNote={handleDeleteVendorNote}
          />
        )}
      </AppShell>
    </>
  );
};

export default CreateExpense;


