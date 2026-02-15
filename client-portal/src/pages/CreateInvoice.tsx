import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService, User } from "@/lib/auth";
import { clientService, Client } from "@/lib/services/clientService";
import { projectService, Project } from "@/lib/services/projectService";
import { invoiceService, Invoice } from "@/lib/services/invoiceService";
import { itemService, Item } from "@/lib/services/itemService";
import { invoiceItemService } from "@/lib/services/invoiceItemService";
import { clientNoteService } from "@/lib/services/clientNoteService";
import { ClientNote } from "@/lib/types/clientNote";
import { Plus, Trash2, Copy, Edit2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import InvoicePreview from "@/components/InvoicePreview";
import NotesModal from "@/components/NotesModal";
import NoteDisplay from "@/components/NoteDisplay";
/* shadcn/dialog components for modals */
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api";
import { getIdFromUrl, encodeId } from "@/lib/urlEncoder";
import { Currency, CURRENCY_INFO, formatCurrency, getCurrencySymbol } from "@/lib/currency";
import { getLogoUrl } from "@/lib/services/fileStorageService";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]); // All clients for when no project is selected
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [disableProjectSelection, setDisableProjectSelection] = useState(false);
  const [sourceProjectId, setSourceProjectId] = useState<number | null>(null); // Store projectId from URL for redirect
  const [selectedClientId, setSelectedClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${Date.now().toString().slice(-4)}`
  );
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [apiItems, setApiItems] = useState<Item[]>([]);

  const initialUser = authService.getCurrentUser();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [userLogoUrl, setUserLogoUrl] = useState<string | undefined>(undefined);
 
  // Function to refresh user data
  const refreshUserData = async () => {
    const storedUser = authService.getCurrentUser();
    setCurrentUser(storedUser);
    // Set default currency from user
    if (storedUser?.currency) {
      setCurrency(storedUser.currency as Currency);
    }
    // Fetch logo URL from Azure Blob Storage if logo exists
    if (storedUser?.logo && storedUser?.id) {
      console.log('[CreateInvoice] Fetching logo URL for user:', storedUser.id, 'logo path:', storedUser.logo);
      try {
        const logoUrl = await getLogoUrl(storedUser.id);
        console.log('[CreateInvoice] Logo URL fetched:', logoUrl ? 'Success' : 'Failed');
        setUserLogoUrl(logoUrl || undefined);
      } catch (error) {
        console.error('[CreateInvoice] Failed to fetch logo URL:', error);
        setUserLogoUrl(undefined);
      }
    } else {
      console.log('[CreateInvoice] No logo found for user:', storedUser?.id);
      setUserLogoUrl(undefined);
    }
  };

  useEffect(() => {
    // Initial load - fetch user data and logo
    refreshUserData();
    
    // Listen for custom event when profile is updated
    const handleProfileUpdate = () => {
      refreshUserData();
    };
    
    // Listen for storage changes (when profile is updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key?.includes('auth')) {
        refreshUserData();
      }
    };
    
    // Listen for window focus (user might have updated profile in another tab)
    const handleFocus = () => {
      refreshUserData();
    };
    
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Separate effect to fetch logo URL when user changes
  useEffect(() => {
    const fetchLogo = async () => {
      if (currentUser?.logo && currentUser?.id) {
        console.log('[CreateInvoice] useEffect: Fetching logo for user:', currentUser.id);
        try {
          const logoUrl = await getLogoUrl(currentUser.id);
          if (logoUrl) {
            console.log('[CreateInvoice] useEffect: Logo URL fetched successfully');
            setUserLogoUrl(logoUrl);
          } else {
            console.warn('[CreateInvoice] useEffect: Logo URL is null');
            setUserLogoUrl(undefined);
          }
        } catch (error) {
          console.error('[CreateInvoice] useEffect: Error fetching logo:', error);
          setUserLogoUrl(undefined);
        }
      } else {
        console.log('[CreateInvoice] useEffect: No logo path or user ID');
        setUserLogoUrl(undefined);
      }
    };

    fetchLogo();
  }, [currentUser?.id, currentUser?.logo]);

  useEffect(() => {
    // Logo URL is now fetched in refreshUserData()
    // This effect handles GST logic
    if (!currentUser?.gstin) {
      setInclusiveGST(false);
    }
  }, [currentUser]);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    },
  ]);

  // Debug: Log when items change
  useEffect(() => {
    console.log("[CreateInvoice] Items state changed:", {
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate
      }))
    });
  }, [items]);

  const [notes, setNotes] = useState<string>("Thank you for your business.");
  const [inclusiveGST, setInclusiveGST] = useState<boolean>(false);
  const [paymentReminderEnabled, setPaymentReminderEnabled] = useState<boolean>(false);
  const [paymentReminderRepetition, setPaymentReminderRepetition] = useState<string[]>([]);
  const [previousPaymentReminderRepetition, setPreviousPaymentReminderRepetition] = useState<string[]>([]);
  
  // Payment terms state
  const [paymentTerms, setPaymentTerms] = useState<'full' | 'advance_balance'>('full');
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [advanceAmountType, setAdvanceAmountType] = useState<'amount' | 'percentage'>('amount');
  const [balanceDueDate, setBalanceDueDate] = useState<string>("");

  // Toggle reminder type (add/remove from array)
  const toggleReminderType = (type: string) => {
    setPaymentReminderRepetition((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Calculate date-based restrictions for reminder options (recalculates when dueDate changes)
  const reminderRestrictions = useMemo(() => {
    // If dueDate is empty, don't disable any options
    if (!dueDate) {
      return {
        disableThreeDaysBefore: false,
        disableOnDueDate: false,
        disableSevenDaysAfter: false,
        disableTenDaysAfter: false,
        disableFifteenDaysAfter: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    
    // Check if due date is valid
    if (isNaN(due.getTime())) {
      return {
        disableThreeDaysBefore: false,
        disableOnDueDate: false,
        disableSevenDaysAfter: false,
        disableTenDaysAfter: false,
        disableFifteenDaysAfter: false,
      };
    }
    
    due.setHours(0, 0, 0, 0);

    const threeDaysBefore = new Date(due);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

    const sevenDaysAfter = new Date(due);
    sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7);

    const tenDaysAfter = new Date(due);
    tenDaysAfter.setDate(tenDaysAfter.getDate() + 10);

    const fifteenDaysAfter = new Date(due);
    fifteenDaysAfter.setDate(fifteenDaysAfter.getDate() + 15);

    return {
      disableThreeDaysBefore: today >= threeDaysBefore, // Too late to schedule 3 days before
      disableOnDueDate: today > due, // Past due date
      disableSevenDaysAfter: today > sevenDaysAfter, // Past 7 days after
      disableTenDaysAfter: today >= tenDaysAfter, // Past 10 days after
      disableFifteenDaysAfter: today >= fifteenDaysAfter, // Past 15 days after
    };
  }, [dueDate]);

  // taxRate is now stateful because it depends on detected country/timezone
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [detectedCountry, setDetectedCountry] = useState<string>("India");
  const [inclusiveDisabled, setInclusiveDisabled] = useState<boolean>(false);
type SaveMode = "create-send" | "create-save" | "update-send" | "update-save";
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveMode | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);

  // modal states for adding/editing client and adding/editing service
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    id: "",
    organization: "",
    fullName: "",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
  });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceModalTargetItemId, setServiceModalTargetItemId] = useState<string | null>(null); // if adding for a specific invoice item
  const [editingServiceName, setEditingServiceName] = useState<string | null>(null);

  // Notes state
  const [latestClientNote, setLatestClientNote] = useState<ClientNote | null>(null);
  const [allClientNotes, setAllClientNotes] = useState<ClientNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // parse optional edit id from query param ?id=...
  // Decode the ID if it's encoded - make it reactive to location changes
  const [editId, setEditId] = useState<number | null>(() => {
    const search = new URLSearchParams(location.search);
    const decoded = getIdFromUrl(search, "id");
    console.log("[CreateInvoice] Initial URL search:", location.search, "Decoded editId:", decoded);
    return decoded;
  });

  // Update editId when location changes
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const decoded = getIdFromUrl(search, "id");
    console.log("[CreateInvoice] URL changed:", {
      search: location.search,
      decoded,
      currentEditId: editId
    });
    if (decoded !== editId) {
      setEditId(decoded);
    }
  }, [location.search, editId]);

  useEffect(() => {
    // detect timezone -> map to country & tax rules
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    console.log("detected timezone:", tz);
    const tzLower = tz.toLowerCase();

    // default values
    let country = "Other";
    let rate = 0.18;
    let disableInclusive = false;

    if (!tz) {
      // No timezone available (rare). Keep as Other so "inclusive" will be forced.
      country = "Other";
      rate = 0;
      disableInclusive = true;
    } else if (
      tzLower === "asia/kolkata" ||
      tzLower.includes("kolkata") ||
      tzLower.includes("calcutta") ||
      tzLower.includes("india")
    ) {
      country = "India";
      rate = 0.18;
      disableInclusive = false;
    } else if (tzLower.includes("london") || tzLower === "europe/london") {
      country = "UK";
      rate = 0.2;
      disableInclusive = false;
    } else if (
      tzLower.startsWith("australia/") ||
      tzLower.includes("sydney") ||
      tzLower.includes("melbourne") ||
      tzLower.includes("perth") ||
      tzLower.includes("adelaide") ||
      tzLower.includes("brisbane") ||
      tzLower.includes("hobart") ||
      tzLower.includes("darwin")
    ) {
      country = "Australia";
      rate = 0.1;
      disableInclusive = false;
    } else {
      // Any other detected timezone -> treat as "Other"
      country = "Other";
      rate = 0;
      disableInclusive = true;
    }

    setDetectedCountry(country);
    setTaxRate(rate);
    setInclusiveDisabled(disableInclusive);

    // If we force inclusive for other countries and not editing an invoice, set inclusiveGST true
    if (disableInclusive && !editId) {
      setInclusiveGST(true);
    }

    // proceed with the rest: auth check and clients + edit load
    if (!authService.isAuthenticated()) {
      navigate("/auth/signin");
      return;
    }

    // Load data from APIs
    const loadData = async () => {
      try {
        // Load clients, projects, and items first (needed for invoice editing)
        const [clientsData, projectsData, itemsData] = await Promise.all([
          clientService.getClients(),
          projectService.getProjects(),
          itemService.getItems()
        ]);
        
        setAllClients(clientsData);
        setClients(clientsData); // Initially show all clients
        setProjects(projectsData || []);
        setApiItems(itemsData);
        let itemNames = itemsData.map(item => item.name);
        
        // Check for projectId query param (for pre-selection from Projects->Invoices tab)
        const search = new URLSearchParams(location.search);
        const preselectedProjectId = getIdFromUrl(search, "projectId");
        if (preselectedProjectId !== null && preselectedProjectId > 0) {
          // Store projectId for redirect after save
          setSourceProjectId(preselectedProjectId);
          
          if (!editId) {
            // Only pre-select if not in edit mode (edit mode will set project from invoice data)
            // Verify project exists in the loaded projects list
            const projectExists = projectsData.find(p => p.id === preselectedProjectId);
            if (projectExists) {
              setSelectedProjectId(preselectedProjectId.toString());
              setDisableProjectSelection(true);
              console.log("[CreateInvoice] Pre-selected project from URL:", preselectedProjectId);
            } else {
              console.warn("[CreateInvoice] Pre-selected project not found:", preselectedProjectId);
            }
          }
        }
        
        // Default due date when creating
        if (!editId) {
          const defaultDue = new Date();
          defaultDue.setDate(defaultDue.getDate() + 14);
          setDueDate(defaultDue.toISOString().split("T")[0]);
        }

        // If editing - load invoice from API
        if (editId !== null && editId > 0) {
          // editId is already decoded by getIdFromUrl as a number
          console.log("[CreateInvoice] Attempting to load invoice with ID:", {
            editId,
            type: typeof editId,
            encoded: encodeId(editId),
            url: location.search
          });
          try {
            const inv = await invoiceService.getInvoiceById(editId);
            console.log("[CreateInvoice] Invoice loaded successfully:", {
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              clientId: inv.clientId,
              totalAmount: inv.totalAmount
            });
          
            setInvoiceNumber(inv.invoiceNumber || `INV-${inv.id}`);
            
            // Handle dates without timezone conversion - use date string directly
            const formatDateForInput = (date: string | Date): string => {
              if (typeof date === 'string') {
                // If it's already YYYY-MM-DD, return it
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                  return date;
                }
                // Otherwise parse and format
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              }
              // If it's a Date object, format it using local date components
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            };
            
            setIssueDate(formatDateForInput(inv.invoiceDate));
            setDueDate(formatDateForInput(inv.dueDate));
            
            // Set currency from invoice
            if (inv.currency) {
              setCurrency(inv.currency as Currency);
            }
            
            // Fetch invoice items separately from /api/invoices/:id/items
            try {
              const invoiceItems = await invoiceItemService.getInvoiceItems(editId);
              console.log("[CreateInvoice] Fetched invoice items:", invoiceItems);
              
              if (invoiceItems && invoiceItems.length > 0) {
                // Ensure all invoice item names are in serviceOptions so they can be displayed in Select
                const currentServiceOptionsSet = new Set(itemNames);
                invoiceItems.forEach((it) => {
                  if (it.itemName && it.itemName.trim() && !currentServiceOptionsSet.has(it.itemName)) {
                    currentServiceOptionsSet.add(it.itemName);
                    console.log("[CreateInvoice] Added missing item name to serviceOptions:", it.itemName);
                  }
                });
                itemNames = Array.from(currentServiceOptionsSet);
                
                // Update serviceOptions immediately so Select can display the items
                setServiceOptions(itemNames);
                console.log("[CreateInvoice] Updated serviceOptions with invoice item names:", itemNames);
                
                // Map invoice items to frontend format
                const baseTime = Date.now();
                const mappedItems = invoiceItems.map((it, idx: number) => ({
                  id: `item-${baseTime}-${it.id}-${idx}`,
                  description: it.itemName || `Item ${idx + 1}`,
                  quantity: it.quantity || 1,
                  rate: it.unitPrice || 0,
                  amount: (it.quantity || 1) * (it.unitPrice || 0),
                }));
                console.log("[CreateInvoice] Mapped invoice items:", mappedItems);
                setItems(mappedItems);
                console.log("[CreateInvoice] Invoice items loaded and set:", mappedItems.length);
              } else {
                console.warn("[CreateInvoice] No invoice items found");
                // No items found, initialize with empty item
                setItems([{
                  id: "1",
                  description: "",
                  quantity: 1,
                  rate: 0,
                  amount: 0,
                }]);
              }
            } catch (error: any) {
              console.error("[CreateInvoice] Error fetching invoice items:", error);
              // Initialize with empty items if fetch fails
              setItems([{
                id: "1",
                description: "",
                quantity: 1,
                rate: 0,
                amount: 0,
              }]);
            }
          
            // Extract notes without status prefix if present
            let notesText = inv.additionalNotes || "";
            // Remove status prefix if present (format: "STATUS:paid|...")
            notesText = notesText.replace(/^STATUS:\w+\|/, '');
            setNotes(notesText);
            
            // Set payment reminder settings
            if (inv.paymentReminderRepetition) {
              try {
                // Parse JSON array if it's a string, or use directly if it's already an array
                const parsed =
                  typeof inv.paymentReminderRepetition === 'string'
                    ? JSON.parse(inv.paymentReminderRepetition)
                    : inv.paymentReminderRepetition;
                const reminderArray = Array.isArray(parsed) ? parsed : [parsed];
                setPaymentReminderEnabled(true);
                setPaymentReminderRepetition(reminderArray);
                setPreviousPaymentReminderRepetition(reminderArray); // Store for restoration
              } catch {
                // Fallback: if it's already an array, use it directly; otherwise wrap in array
                const reminderArray = Array.isArray(inv.paymentReminderRepetition)
                  ? inv.paymentReminderRepetition
                  : typeof inv.paymentReminderRepetition === 'string'
                  ? [inv.paymentReminderRepetition]
                  : [];
                setPaymentReminderEnabled(reminderArray.length > 0);
                setPaymentReminderRepetition(reminderArray);
                setPreviousPaymentReminderRepetition(reminderArray); // Store for restoration
              }
            } else {
              setPaymentReminderEnabled(false);
              setPaymentReminderRepetition([]);
              setPreviousPaymentReminderRepetition([]);
            }
            
            // Set payment terms
            if (inv.paymentTerms) {
              setPaymentTerms(inv.paymentTerms);
              if (inv.paymentTerms === 'advance_balance') {
                if (inv.advanceAmount) {
                  setAdvanceAmount(inv.advanceAmount.toString());
                  setAdvanceAmountType('amount');
                }
                if (inv.balanceDueDate) {
                  const balanceDate = typeof inv.balanceDueDate === 'string' 
                    ? inv.balanceDueDate 
                    : new Date(inv.balanceDueDate).toISOString().split('T')[0];
                  setBalanceDueDate(balanceDate);
                }
              }
            } else {
              setPaymentTerms('full');
            }
            
            // Set client ID - ensure it's set after clients are loaded
            if (inv.clientId) {
              const clientIdStr = inv.clientId.toString();
              console.log("[CreateInvoice] Setting client ID:", clientIdStr, "Available clients:", clientsData.length);
              setSelectedClientId(clientIdStr);
              
              // Verify client exists in the loaded clients list
              const clientExists = clientsData.find(c => c.id.toString() === clientIdStr);
              if (!clientExists) {
                console.warn("[CreateInvoice] Client not found in clients list:", clientIdStr, "Available:", clientsData.map(c => c.id));
                toast.warning(`Client ID ${clientIdStr} not found. Please select a client.`);
              }
            }
            
            // Set project ID if invoice has one
            if (inv.projectId) {
              const projectIdStr = inv.projectId.toString();
              console.log("[CreateInvoice] Setting project ID:", projectIdStr, "Available projects:", projectsData.length);
              setSelectedProjectId(projectIdStr);
              
              // Verify project exists in the loaded projects list
              const projectExists = projectsData.find(p => p.id.toString() === projectIdStr);
              if (!projectExists) {
                console.warn("[CreateInvoice] Project not found in projects list:", projectIdStr, "Available:", projectsData.map(p => p.id));
                toast.warning(`Project ID ${projectIdStr} not found. Please select a project.`);
              }
              
              // If projectId query param exists, disable project selection (edit mode from Projects->Invoices tab)
              const search = new URLSearchParams(location.search);
              const preselectedProjectId = getIdFromUrl(search, "projectId");
              if (preselectedProjectId !== null && preselectedProjectId > 0) {
                setSourceProjectId(preselectedProjectId);
                setDisableProjectSelection(true);
              }
            } else {
              // Reset to "none" if invoice has no project
              setSelectedProjectId("none");
            }
            
            console.log("[CreateInvoice] Invoice data loaded successfully");
          } catch (error: any) {
            console.error("[CreateInvoice] Error loading invoice:", {
              error,
              message: error?.message,
              editId,
              encodedId: editId ? encodeId(editId) : null,
              stack: error?.stack,
              response: error?.response
            });
            const errorMessage = error?.message || error?.error || "Failed to load invoice. Please check if the invoice exists.";
            toast.error(errorMessage);
            // Don't navigate immediately, let user see the error
            setTimeout(() => navigate("/invoices"), 2000);
            return;
          }
        } else if (editId !== null && editId <= 0) {
          console.warn("[CreateInvoice] Invalid editId:", editId);
          toast.error("Invalid invoice ID");
          navigate("/invoices");
          return;
        } else if (editId === null && location.search.includes('id=')) {
          // ID was in URL but couldn't be decoded
          console.error("[CreateInvoice] Failed to decode ID from URL:", location.search);
          toast.error("Invalid invoice ID format in URL");
          navigate("/invoices");
          return;
        }
        
        // Set serviceOptions (only if not editing, or if editing but items weren't loaded)
        // When editing, serviceOptions is set inside the invoice items loading block
        if (!editId || editId <= 0) {
          setServiceOptions(itemNames);
        }
      } catch (error: any) {
        console.error("[CreateInvoice] Error loading data:", error);
        toast.error("Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [location.search, editId]);

  // Effect to filter clients based on selected project
  useEffect(() => {
    const filterClientsByProject = async () => {
      if (selectedProjectId === "none") {
        // Show all clients when no project is selected
        setClients(allClients);
        return;
      }

      // Fetch clients for the selected project
      try {
        const projectId = parseInt(selectedProjectId, 10);
        if (isNaN(projectId)) {
          console.warn("[CreateInvoice] Invalid project ID:", selectedProjectId);
          setClients(allClients);
          return;
        }

        const projectClients = await projectService.getClientsByProjectId(projectId);
        setClients(projectClients);
        
        // If a client was previously selected but is not in the filtered list, clear the selection
        if (selectedClientId) {
          const clientExists = projectClients.some(c => c.id.toString() === selectedClientId);
          if (!clientExists) {
            console.log("[CreateInvoice] Previously selected client not in project, clearing selection");
            setSelectedClientId("");
          }
        }
      } catch (error: any) {
        console.error("[CreateInvoice] Error fetching clients for project:", error);
        toast.error("Failed to load clients for project");
        // Fallback to all clients on error
        setClients(allClients);
      }
    };

    // Only filter if allClients is loaded (to avoid filtering empty array)
    if (allClients.length > 0 || selectedProjectId === "none") {
      filterClientsByProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, allClients]);

  // Fetch latest client note when selected client changes
  useEffect(() => {
    const fetchLatestNote = async () => {
      if (!selectedClientId) {
        setLatestClientNote(null);
        setAllClientNotes([]);
        return;
      }

      try {
        setIsLoadingNotes(true);
        const clientId = parseInt(selectedClientId, 10);
        if (!isNaN(clientId)) {
          const note = await clientNoteService.getLatestClientNote(clientId);
          setLatestClientNote(note);
        } else {
          setLatestClientNote(null);
        }
      } catch (error: any) {
        console.error("Error fetching latest client note:", error);
        setLatestClientNote(null);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    fetchLatestNote();
  }, [selectedClientId]);

  // Fetch all notes when notes modal opens
  const fetchAllClientNotes = async () => {
    if (!selectedClientId) {
      setAllClientNotes([]);
      return;
    }

    try {
      setIsLoadingNotes(true);
      const clientId = parseInt(selectedClientId, 10);
      if (!isNaN(clientId)) {
        const notes = await clientNoteService.getClientNotes(clientId);
        setAllClientNotes(notes);
      } else {
        setAllClientNotes([]);
      }
    } catch (error: any) {
      console.error("Error fetching client notes:", error);
      setAllClientNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleCreateClientNote = async (note: string) => {
    if (!selectedClientId) {
      throw new Error("No client selected");
    }
    const clientId = parseInt(selectedClientId, 10);
    if (isNaN(clientId)) {
      throw new Error("Invalid client ID");
    }
    await clientNoteService.createClientNote(clientId, { note });
  };

  const handleUpdateClientNote = async (noteId: number, note: string) => {
    if (!selectedClientId) {
      throw new Error("No client selected");
    }
    const clientId = parseInt(selectedClientId, 10);
    if (isNaN(clientId)) {
      throw new Error("Invalid client ID");
    }
    await clientNoteService.updateClientNote(clientId, noteId, { note });
  };

  const handleDeleteClientNote = async (noteId: number) => {
    if (!selectedClientId) {
      throw new Error("No client selected");
    }
    const clientId = parseInt(selectedClientId, 10);
    if (isNaN(clientId)) {
      throw new Error("Invalid client ID");
    }
    await clientNoteService.deleteClientNote(clientId, noteId);
    // Refresh latest note after deletion
    if (allClientNotes.length === 1) {
      // If we deleted the last note, clear latest note
      setLatestClientNote(null);
    } else {
      // Otherwise, refresh to get the new latest
      try {
        const note = await clientNoteService.getLatestClientNote(clientId);
        setLatestClientNote(note);
      } catch (error) {
        console.error("Error refreshing latest note after deletion:", error);
        setLatestClientNote(null);
      }
    }
  };

  const handleAddItem = () => {
    const newItemId = `new-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setItems((prev) => [
      ...prev,
      {
        id: newItemId,
        description: serviceOptions[0] ?? "",
        quantity: 1,
        rate: apiItems[0]?.unitPrice || 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value } as InvoiceItem;
          if (field === "quantity" || field === "rate") {
            const qty = field === "quantity" ? Number(value) || 0 : Number(updated.quantity) || 0;
            const rate = field === "rate" ? Number(value) || 0 : Number(updated.rate) || 0;
            updated.quantity = qty;
            updated.rate = rate;
            updated.amount = qty * rate;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // rawTotalEntered is sum of the line amounts as entered (these are either exclusive or inclusive depending on inclusiveGST)
  const rawTotalEntered = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const allowGstFeatures = Boolean(currentUser?.gstin);
  const effectiveTaxRate = allowGstFeatures ? taxRate : 0;
  const applyInclusiveGst = allowGstFeatures && inclusiveGST;

  // compute subtotal (net, excluding GST), tax and total according to inclusiveGST flag
  const subtotal = applyInclusiveGst
    ? items.reduce((sum, item) => sum + (item.amount || 0) / (1 + effectiveTaxRate), 0)
    : rawTotalEntered;

  const tax = applyInclusiveGst ? rawTotalEntered - subtotal : subtotal * effectiveTaxRate;
  const total = applyInclusiveGst ? rawTotalEntered : subtotal + tax;

  // Calculate advance and balance for payment terms
  const calculatedAdvanceAmount = useMemo(() => {
    if (paymentTerms === 'full' || !advanceAmount) return null;
    const advanceValue = parseFloat(advanceAmount) || 0;
    if (advanceAmountType === 'percentage') {
      return (total * advanceValue) / 100;
    }
    return advanceValue;
  }, [paymentTerms, advanceAmount, advanceAmountType, total]);

  const calculatedBalanceDue = useMemo(() => {
    if (paymentTerms === 'full' || calculatedAdvanceAmount === null) return null;
    return total - calculatedAdvanceAmount;
  }, [paymentTerms, calculatedAdvanceAmount, total]);

  const handleSave = async ({
    sendEmail,
    mode,
    emailType,
  }: {
    sendEmail: boolean;
    mode: SaveMode;
    emailType?: "invoice" | "update";
  }) => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    const client = clients.find((c) => c.id.toString() === selectedClientId);
    if (!client) {
      toast.error("Client not found");
      return;
    }

    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setSaveMode(mode);

    try {
      // Helper function to get or create item by description
      const getOrCreateItem = async (description: string, rate: number): Promise<number> => {
        try {
          // Try to find existing item by name
          const allItems = await itemService.getItems();
          const existingItem = allItems.find(item => 
            item.name.toLowerCase() === description.toLowerCase()
          );
          
          if (existingItem) {
            return existingItem.id;
          }
          
          // Create new item if not found
          const newItem = await itemService.createItem({
            name: description,
            description: description,
            unitPrice: rate,
            unit: "unit", // Default unit
          });
          
          return newItem.id;
        } catch (error) {
          console.error("Error getting/creating item:", error);
          // Return 0 as fallback - backend may handle this
          return 0;
        }
      };

      // Map invoice items to backend format
      const invoiceItems = await Promise.all(
        items.map(async (item) => ({
          itemsId: await getOrCreateItem(item.description, item.rate),
          quantity: item.quantity,
          unitPrice: item.rate,
        }))
      );

      // Ensure dates are sent as YYYY-MM-DD strings without timezone conversion
      // Date inputs already return YYYY-MM-DD format, so we can use them directly
      
      // Preserve status if editing (extract from existing invoice)
      let notesToSave = notes || "";
      if (editId !== null) {
        try {
          const existingInvoice = await invoiceService.getInvoiceById(editId);
          if (existingInvoice.additionalNotes) {
            // Check if status prefix exists
            const statusMatch = existingInvoice.additionalNotes.match(/^(STATUS:\w+\|)/);
            if (statusMatch) {
              // Preserve status prefix and append notes
              notesToSave = statusMatch[1] + notesToSave;
            }
          }
        } catch (error) {
          // If we can't get existing invoice, just use notes as is
          console.log("Could not preserve status, using notes as provided");
        }
      }
      
      // Validate advance + balance
      if (paymentTerms === 'advance_balance') {
        if (!calculatedAdvanceAmount || calculatedAdvanceAmount <= 0) {
          toast.error("Please enter a valid advance amount");
          return;
        }
        if (Math.abs((calculatedAdvanceAmount + (calculatedBalanceDue || 0)) - total) > 0.01) {
          toast.error("Advance amount + Balance due must equal Total amount");
          return;
        }
      }

      const invoiceData = {
        invoiceNumber: invoiceNumber || undefined,
        invoiceDate: issueDate, // Already in YYYY-MM-DD format from date input
        dueDate: dueDate, // Already in YYYY-MM-DD format from date input
        clientId: parseInt(selectedClientId, 10),
        projectId: selectedProjectId !== "none" ? parseInt(selectedProjectId, 10) : null,
        subTotalAmount: subtotal,
        gst: effectiveTaxRate * 100, // Convert to percentage (e.g., 0.18 -> 18)
        totalAmount: total,
        currency: currency,
        additionalNotes: notesToSave || undefined,
        paymentReminderRepetition: paymentReminderEnabled && paymentReminderRepetition.length > 0
          ? paymentReminderRepetition
          : null,
        paymentTerms: paymentTerms,
        advanceAmount: paymentTerms === 'advance_balance' ? calculatedAdvanceAmount : null,
        balanceDue: paymentTerms === 'advance_balance' ? calculatedBalanceDue : null,
        balanceDueDate: paymentTerms === 'advance_balance' && balanceDueDate ? balanceDueDate : null,
        items: invoiceItems,
      };

      let savedInvoiceId: number;
      let savedInvoiceNumber: string | undefined;
      const isUpdate = editId !== null;

      if (isUpdate && editId !== null) {
        const invoiceId = editId;

        const updatedInvoice = await invoiceService.updateInvoice(invoiceId, invoiceData);
        savedInvoiceId = updatedInvoice.id;
        savedInvoiceNumber = updatedInvoice.invoiceNumber;

        const existingInvoiceItems = await invoiceItemService.getInvoiceItems(invoiceId);
        for (const existingItem of existingInvoiceItems) {
          await invoiceItemService.deleteInvoiceItem(existingItem.id);
        }

        for (const item of invoiceItems) {
          if (item.itemsId > 0) {
            await invoiceItemService.createInvoiceItem(invoiceId, {
              itemsId: item.itemsId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            });
          }
        }
      } else {
        const createdInvoice = await invoiceService.createInvoice(invoiceData);
        savedInvoiceId = createdInvoice.id;
        savedInvoiceNumber = createdInvoice.invoiceNumber;
      }

      // Generate and upload PDF
      try {
        console.log("[CreateInvoice] Generating PDF for saved invoice:", savedInvoiceId);
        
        // Ensure logo is loaded before generating PDF
        if (currentUser?.logo && currentUser?.id && !userLogoUrl) {
          try {
            const logoUrl = await getLogoUrl(currentUser.id);
            setUserLogoUrl(logoUrl || undefined);
            // Wait a bit for the image to load in the preview
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.warn("[CreateInvoice] Failed to load logo for PDF:", error);
          }
        }
        
        const { pdf, defaultFileName } = await generatePdfDocument();
        const inferredName =
          savedInvoiceNumber && savedInvoiceNumber.trim() !== ""
            ? `${savedInvoiceNumber}.pdf`
            : defaultFileName;
        const pdfArrayBuffer = pdf.output("arraybuffer") as ArrayBuffer;
        const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

        console.log("[CreateInvoice] Uploading PDF to server...");
        await invoiceService.uploadInvoicePdf(savedInvoiceId, pdfBlob, inferredName);
        console.log("[CreateInvoice] PDF uploaded successfully");
      } catch (error: any) {
        console.error("Error generating/uploading invoice PDF:", {
          error,
          message: error?.message,
          stack: error?.stack
        });
        const errorMessage = error?.message || "PDF generation failed";
        toast.warning(`Invoice saved but PDF generation failed: ${errorMessage}`, {
          duration: 5000,
        });
      }

      if (sendEmail && emailType) {
        await invoiceService.sendInvoiceEmail(savedInvoiceId, emailType);
      }

      if (sendEmail && emailType === "invoice") {
        toast.success("Invoice emailed to the client successfully!");
      } else if (sendEmail && emailType === "update") {
        toast.success("Updated invoice emailed to the client successfully!");
      } else {
        toast.success(isUpdate ? "Invoice updated successfully!" : "Invoice created successfully!");
      }

      // Redirect back to project invoices tab if came from Projects->Invoices tab
      if (sourceProjectId !== null) {
        navigate(`/projects/${encodeId(sourceProjectId)}#invoices`);
      } else {
        navigate("/invoices");
      }
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error(error.message || "Failed to save invoice");
    } finally {
      setIsSaving(false);
      setSaveMode(null);
    }
  };
  const overlayMessage = () => {
    if (downloadingPdf) {
      return "Preparing your PDF...";
    }
    if (isSaving) {
      switch (saveMode) {
        case "create-send":
          return "Emailing the invoice to your client...";
        case "create-save":
          return "Saving your invoice...";
        case "update-send":
          return "Emailing the updated invoice to your client...";
        case "update-save":
          return "Updating your invoice...";
        default:
          return "Processing...";
      }
    }
    return "Processing...";
  };


  const handleCopyLink = () => {
    const idForLink = editId ?? invoiceNumber;
    const fakeLink = `https://mudhro.url/invoice/${idForLink}`;
    navigator.clipboard.writeText(fakeLink);
    toast.success("Share link copied to clipboard!");
  };

  const generatePdfDocument = async () => {
    try {
      // Wait a bit for the preview to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!previewRef.current) {
        throw new Error("Preview element not found. Please ensure the invoice preview is visible.");
      }

      // Check if preview has content
      const previewElement = previewRef.current;
      if (previewElement.offsetWidth === 0 || previewElement.offsetHeight === 0) {
        throw new Error("Preview element has no dimensions. Please ensure the invoice preview is visible on the page.");
      }

      console.log("[CreateInvoice] Starting PDF generation...");
      console.log("[CreateInvoice] Preview element:", {
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
      
      console.log("[CreateInvoice] Libraries loaded, generating canvas...");
      
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
        onclone: async (clonedDoc) => {
          // Ensure all images in the cloned document are loaded before PDF generation
          const images = clonedDoc.querySelectorAll('img');
          const imagePromises = Array.from(images).map((imgElement) => {
            const img = imgElement as HTMLImageElement;
            return new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              
              const timeout = setTimeout(() => {
                console.warn("[CreateInvoice] Image load timeout:", img.src);
                resolve();
              }, 10000); // 10 second timeout per image
              
              img.onload = () => {
                clearTimeout(timeout);
                resolve();
              };
              
              img.onerror = () => {
                clearTimeout(timeout);
                console.warn("[CreateInvoice] Image load error:", img.src);
                resolve();
              };
              
              // Force reload if image failed
              if (!img.complete) {
                const src = img.src;
                img.src = '';
                img.src = src;
              }
            });
          });
          
          await Promise.all(imagePromises);
          console.log("[CreateInvoice] All images loaded for PDF generation");
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Generated canvas is empty or invalid");
      }

      console.log("[CreateInvoice] Canvas generated:", {
        width: canvas.width,
        height: canvas.height
      });

      const imgData = canvas.toDataURL("image/png", 0.95); // Use 0.95 quality for better compression
      if (!imgData || imgData === "data:," || imgData.length < 100) {
        throw new Error("Failed to convert canvas to image data or image is too small");
      }

      console.log("[CreateInvoice] Creating PDF document...");
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
        console.log(`[CreateInvoice] Content requires ${pagesNeeded} pages`);
        
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

      console.log("[CreateInvoice] PDF generated successfully");
      return {
        pdf,
        defaultFileName: `${invoiceNumber || "invoice"}.pdf`,
      };
    } catch (error: any) {
      console.error("[CreateInvoice] PDF generation error:", {
        error,
        message: error?.message,
        stack: error?.stack,
        previewRefExists: !!previewRef.current
      });
      throw new Error(`PDF generation failed: ${error?.message || "Unknown error"}`);
    }
  };

  const handleDownloadPdf = async () => {
    if (!editId) {
      toast.error("Please save the invoice before downloading the PDF");
      return;
    }

    try {
      setDownloadingPdf(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/api/invoices/${editId !== null ? encodeId(editId) : ''}/pdf`, {
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
      link.download = `${invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Invoice PDF downloaded");
    } catch (error: any) {
      console.error("Error downloading invoice PDF:", error);
      toast.error(error?.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  //
  // Client modal handlers (add & edit)
  //
  const openAddClientModal = () => {
    setEditingClientId(null);
    setClientForm({
      id: "",
      organization: "",
      fullName: "",
      email: "",
      phone: "",
      gstin: "",
      pan: "",
    });
    setShowClientModal(true);
  };

  const openEditClientModal = (clientId: string) => {
    const c = clients.find((x) => x.id.toString() === clientId);
    if (!c) return;
    setEditingClientId(clientId);
    setClientForm({
      id: c.id.toString(),
      organization: c.organization ?? "",
      fullName: c.fullName ?? "",
      email: c.email ?? "",
      phone: c.mobileNumber ?? "",
      gstin: c.gstin ?? "",
      pan: c.pan ?? "",
    });
    setShowClientModal(true);
  };

  const saveClientFromModal = async () => {
    try {
      if (editingClientId) {
        // Update existing client
        const clientId = parseInt(editingClientId, 10);
        const updatedClient = await clientService.updateClient(clientId, {
          organization: clientForm.organization || undefined,
          fullName: clientForm.fullName,
          email: clientForm.email,
          mobileNumber: clientForm.phone || undefined,
          gstin: clientForm.gstin || undefined,
          pan: clientForm.pan || undefined,
        });
        setClients((prev) => prev.map((p) => (p.id === clientId ? updatedClient : p)));
        setAllClients((prev) => prev.map((p) => (p.id === clientId ? updatedClient : p)));
        toast.success("Client updated");
      } else {
        // Create new client
        const newClient = await clientService.createClient({
          organization: clientForm.organization || undefined,
          fullName: clientForm.fullName,
          email: clientForm.email,
          mobileNumber: clientForm.phone || undefined,
          gstin: clientForm.gstin || undefined,
          pan: clientForm.pan || undefined,
        });
        setClients((prev) => [...prev, newClient]);
        setAllClients((prev) => [...prev, newClient]);
        setSelectedClientId(newClient.id.toString());
        toast.success("Client added");
    }
    setShowClientModal(false);
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast.error(error.message || "Failed to save client");
    }
  };

  //
  // Service modal handlers (add custom service or edit existing service option)
  //
  const openAddServiceModalForItem = (itemId: string | null = null) => {
    setServiceModalTargetItemId(itemId);
    setEditingServiceName(null);
    setServiceFormName("");
    setShowServiceModal(true);
  };

  const openEditServiceModal = (serviceName: string) => {
    setEditingServiceName(serviceName);
    setServiceFormName(serviceName);
    setServiceModalTargetItemId(null);
    setShowServiceModal(true);
  };

  const saveServiceFromModal = async () => {
    const name = serviceFormName?.trim();
    if (!name) {
      toast.error("Please enter a service name");
      return;
    }

    try {
      // If editing an existing service name -> update the item in backend
    if (editingServiceName) {
        // Find the item by name
        const existingItem = apiItems.find(item => item.name === editingServiceName);
        if (existingItem) {
          // Update item in backend
          await itemService.updateItem(existingItem.id, { name });
          // Reload items from API
          const updatedItems = await itemService.getItems();
          setApiItems(updatedItems);
          setServiceOptions(updatedItems.map(item => item.name));
          
          // Update invoice items that reference this service
      setItems((prev) =>
        prev.map((it) => {
          if (it.description === editingServiceName) {
            return { ...it, description: name };
          }
          return it;
        })
      );
          toast.success("Service updated");
    } else {
          toast.error("Service not found");
        }
      } else {
        // Create new item in backend
        const newItem = await itemService.createItem({
          name: name,
          description: name,
          unitPrice: 0, // Default price, user can update
          unit: "unit",
        });
        
        // Reload items from API
        const updatedItems = await itemService.getItems();
        setApiItems(updatedItems);
        setServiceOptions(updatedItems.map(item => item.name));
        
        // If a target item was specified, set that item's description to the new name
      if (serviceModalTargetItemId) {
        handleItemChange(serviceModalTargetItemId, "description", name);
          // Also set the rate from the newly created item
          handleItemChange(serviceModalTargetItemId, "rate", newItem.unitPrice);
      }
      toast.success("Service added");
    }

    setShowServiceModal(false);
    setServiceFormName("");
    setServiceModalTargetItemId(null);
    setEditingServiceName(null);
    } catch (error: any) {
      console.error("Error saving service:", error);
      toast.error(error.message || "Failed to save service");
    }
  };

  // Editing service option inline from dropdown (rename) helper
  const handleInlineRenameService = (oldName: string) => {
    // Open edit modal for the service
    openEditServiceModal(oldName);
  };

  // Inline edit client helper
  const handleInlineEditClient = (clientId: string) => {
    openEditClientModal(clientId);
  };

  return (
    <>
      {(isSaving || downloadingPdf) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">{overlayMessage()}</p>
        </div>
      )}
      <AppShell>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit Invoice" : "Create Invoice"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  // Client selection will be cleared automatically by the useEffect
                  // if the selected client is not in the new project's client list
                }}
                disabled={disableProjectSelection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label>Client</Label>
              <div className="flex gap-2">
                <Select value={selectedClientId} onValueChange={(val) => {
                  setSelectedClientId(val);
                  // Note: projectId auto-selection removed - clients can belong to multiple projects
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients
                      .filter((client) => {
                        // Note: Project filtering is now handled by setting clients state
                        // Show active clients, or the currently selected client even if inactive
                        return client.isActive !== false || client.id.toString() === selectedClientId;
                      })
                      .map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {/* wrapper uses min-w-0 so truncate works predictably */}
                        <div className="w-full min-w-0 flex items-center justify-between">
                          <div className="truncate pr-2">{client.fullName}</div>
                          <div>
                            {/* use pointer events handler to prevent Radix Select from closing */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onPointerDown={(e: React.PointerEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleInlineEditClient(client.id.toString());
                              }}
                              title="Edit client"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={openAddClientModal}>
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-sm">Add New Client</span>
                </Button>
              </div>
              {/* Client Notes Display */}
              {selectedClientId && (
                <NoteDisplay
                  note={latestClientNote?.note || null}
                  onViewNotes={() => {
                    setShowNotesModal(true);
                    fetchAllClientNotes();
                  }}
                  entityType="Client"
                />
              )}
              {/* Project Context Display */}
              {selectedProjectId !== "none" && (() => {
                const projectIdNum = parseInt(selectedProjectId, 10);
                const project = projects.find((p) => p.id === projectIdNum);
                return project ? (
                  <Card className="p-3 bg-muted/50">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Project</span>
                        <span className="text-sm font-semibold">{project.name}</span>
                      </div>
                      {project.status && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Status</span>
                          <Badge variant={
                            project.status === 'active' ? 'default' :
                            project.status === 'completed' ? 'secondary' :
                            project.status === 'on-hold' ? 'outline' : 'destructive'
                          }>
                            {project.status}
                          </Badge>
                        </div>
                      )}
                      {project.budget && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Budget</span>
                          <span className="text-sm">{formatCurrency(project.budget, currency)}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : null;
              })()}
            </div>

            {/* Invoice Number */}
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const userCurrency = currentUser?.currency || 'INR';
                    const currencies = [
                      CURRENCY_INFO[userCurrency as Currency] || CURRENCY_INFO.INR,
                      CURRENCY_INFO.USD
                    ];
                    // Remove duplicate if user currency is already USD
                    const uniqueCurrencies = currencies.filter((curr, index, self) => 
                      index === self.findIndex(c => c.code === curr.code)
                    );
                    return uniqueCurrencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name} ({curr.symbol})
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label>Items</Label>
              {items.length === 0 && (
                <div className="text-sm text-muted-foreground p-2">
                  No items found. Loading...
                </div>
              )}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={item.description}
                          onValueChange={(val) => {
                            handleItemChange(item.id, "description", val);
                            // Auto-fill rate from API item if available
                            const selectedApiItem = apiItems.find(apiItem => apiItem.name === val);
                            if (selectedApiItem && selectedApiItem.unitPrice > 0) {
                              handleItemChange(item.id, "rate", selectedApiItem.unitPrice);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceOptions.length === 0 ? (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                No items available. Add an item first.
                              </div>
                            ) : (
                              serviceOptions.map((s) => {
                                if (!s || s.trim() === "") return null; // Skip empty strings
                                const apiItem = apiItems.find(item => item.name === s);
                                return (
                              <SelectItem key={s} value={s}>
                                <div className="w-full min-w-0 flex items-center justify-between">
                                      <div className="truncate pr-2">
                                        {s}
                                        {apiItem && apiItem.unitPrice > 0 && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            ({formatCurrency(apiItem.unitPrice, currency)})
                                          </span>
                                        )}
                                      </div>
                                  <div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onPointerDown={(e: React.PointerEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleInlineRenameService(s);
                                      }}
                                      title="Edit service name"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </SelectItem>
                                );
                              }).filter(Boolean)
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openAddServiceModalForItem(item.id)}
                          title="Add custom service"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={String(item.quantity)}
                        onChange={(e) => handleItemChange(item.id, "quantity", Number(e.target.value || 0))}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          {getCurrencySymbol(currency)}
                        </span>
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={String(item.rate)}
                          onChange={(e) => handleItemChange(item.id, "rate", Number(e.target.value || 0))}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
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

            {/* GST checkbox */}
            {allowGstFeatures && (
              <>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="inclusive-gst"
                    checked={inclusiveGST}
                    onCheckedChange={(v) => {
                      if (inclusiveDisabled) return;
                      setInclusiveGST(Boolean(v));
                    }}
                    disabled={inclusiveDisabled}
                  />
                  <Label htmlFor="inclusive-gst">Amount inclusive of GST?</Label>
                </div>
                <div className="text-sm text-muted-foreground">
                  Country/Timezone: <strong>{detectedCountry}</strong>.{" "}
                  {detectedCountry === "India" && <>GST rate set to 18%.</>}
                  {detectedCountry === "UK" && <>VAT rate set to 20%.</>}
                  {detectedCountry === "Australia" && <>GST rate set to 10%.</>}
                  {detectedCountry === "Other" && (
                    <>
                      For your location, we require you to enter the final amount (inclusive of any tax).
                    </>
                  )}
                </div>
              </>
            )}

            {/* Payment Terms */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Payment terms</Label>
              <RadioGroup
                value={paymentTerms}
                onValueChange={(value) => {
                  setPaymentTerms(value as 'full' | 'advance_balance');
                  if (value === 'full') {
                    setAdvanceAmount("");
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="payment-full" />
                  <Label htmlFor="payment-full" className="font-normal cursor-pointer">
                    Full payment
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="advance_balance" id="payment-advance" />
                  <Label htmlFor="payment-advance" className="font-normal cursor-pointer">
                    Advance + balance
                  </Label>
                </div>
              </RadioGroup>

              {paymentTerms === 'advance_balance' && (
                <div className="space-y-3 pl-6 border-l-2">
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <Input
                      value={formatCurrency(total, currency)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                        {advanceAmountType === 'amount' ? getCurrencySymbol(currency) : ''}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={advanceAmountType === 'amount' ? "0.00" : "0"}
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={advanceAmountType}
                        onValueChange={(value) => {
                          setAdvanceAmountType(value as 'amount' | 'percentage');
                          setAdvanceAmount("");
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="percentage">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {calculatedAdvanceAmount !== null && (
                      <p className="text-sm text-muted-foreground">
                        Advance: {formatCurrency(calculatedAdvanceAmount, currency)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Balance due:</Label>
                    <Input
                      value={
                        calculatedBalanceDue !== null
                          ? formatCurrency(calculatedBalanceDue, currency)
                          : formatCurrency(total, currency)
                      }
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Reminders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="payment-reminder-toggle" className="text-base font-medium">
                    Payment Reminders
                  </Label>
                  <Checkbox
                    id="payment-reminder-toggle"
                    checked={paymentReminderEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        // When checking, restore previous values if they exist
                        setPaymentReminderEnabled(true);
                        if (previousPaymentReminderRepetition.length > 0) {
                          setPaymentReminderRepetition([...previousPaymentReminderRepetition]);
                        }
                      } else {
                        // When unchecking, save current values before clearing
                        if (paymentReminderRepetition.length > 0) {
                          setPreviousPaymentReminderRepetition([...paymentReminderRepetition]);
                        }
                        setPaymentReminderEnabled(false);
                        setPaymentReminderRepetition([]);
                      }
                    }}
                  />
                </div>
                {paymentReminderEnabled && (
                  <span className="text-sm text-muted-foreground">On</span>
                )}
              </div>
              
              {paymentReminderEnabled && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Mudhro will remind your client about this invoice automatically.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={paymentReminderRepetition.includes("3") ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderType("3")}
                      disabled={reminderRestrictions.disableThreeDaysBefore}
                    >
                      3 days before due
                    </Button>
                    <Button
                      type="button"
                      variant={paymentReminderRepetition.includes("Only on Due date") ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderType("Only on Due date")}
                      disabled={reminderRestrictions.disableOnDueDate}
                    >
                      On due date
                    </Button>
                    <Button
                      type="button"
                      variant={paymentReminderRepetition.includes("7") ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderType("7")}
                      disabled={reminderRestrictions.disableSevenDaysAfter}
                    >
                      7 days after
                    </Button>
                    <Button
                      type="button"
                      variant={paymentReminderRepetition.includes("10") ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderType("10")}
                      disabled={reminderRestrictions.disableTenDaysAfter}
                    >
                      10 days after
                    </Button>
                    <Button
                      type="button"
                      variant={paymentReminderRepetition.includes("15") ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderType("15")}
                      disabled={reminderRestrictions.disableFifteenDaysAfter}
                    >
                      15 days after
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea placeholder="Thank you for your business." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  handleSave({
                    sendEmail: true,
                    mode: editId ? "update-send" : "create-send",
                    emailType: editId ? "update" : "invoice",
                  })
                }
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving && saveMode === "create-send" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : isSaving && saveMode === "update-send" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  editId ? "Update and Send" : "Save & Send"
                )}
              </Button>
              <Button
                variant="outline"
                className="min-w-[120px]"
                onClick={() =>
                  handleSave({
                    sendEmail: false,
                    mode: editId ? "update-save" : "create-save",
                  })
                }
                disabled={isSaving}
              >
                {isSaving &&
                ((editId && saveMode === "update-save") || (!editId && saveMode === "create-save")) ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  editId ? "Update" : "Save"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing...
                  </span>
                ) : (
                  "Download PDF"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div ref={previewRef}>
            <InvoicePreview
              invoiceNumber={invoiceNumber}
              issueDate={issueDate}
              dueDate={dueDate}
              client={clients.find((c) => c.id.toString() === selectedClientId)}
              items={items}
              subtotal={subtotal}
              tax={tax}
              total={total}
              currency={currency}
              notes={notes}
              inclusiveGST={applyInclusiveGst}
              detectedCountry={detectedCountry}
              taxRate={effectiveTaxRate}
              userLogoUrl={userLogoUrl}
              userGstin={currentUser?.gstin}
              userPan={currentUser?.pan}
              paymentTerms={paymentTerms}
              advanceAmount={calculatedAdvanceAmount}
              balanceDue={calculatedBalanceDue}
            />
          </div>
        </div>
      </div>

      {/* Client Add/Edit Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClientId ? "Edit Client" : "Add New Client"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Organization (optional)</Label>
              <Input
                value={clientForm.organization}
                onChange={(e) => setClientForm((p) => ({ ...p, organization: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label>Full name</Label>
              <Input
                value={clientForm.fullName}
                onChange={(e) => setClientForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                value={clientForm.phone}
                onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <Label>GSTIN (optional)</Label>
              <Input
                value={clientForm.gstin}
                onChange={(e) => setClientForm((p) => ({ ...p, gstin: e.target.value }))}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div>
              <Label>PAN Number (optional)</Label>
              <Input
                value={clientForm.pan}
                onChange={(e) => setClientForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClientModal(false)}>
                Cancel
              </Button>
              <Button onClick={saveClientFromModal}>{editingClientId ? "Save" : "Add Client"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Add/Edit Modal */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingServiceName ? "Edit Service Name" : "Add Service"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Item name</Label>
              <Input
                value={serviceFormName}
                onChange={(e) => setServiceFormName(e.target.value)}
                placeholder="e.g., Logo design"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setShowServiceModal(false)}>
                Cancel
              </Button>
              <Button onClick={saveServiceFromModal}>{editingServiceName ? "Save" : "Add Item"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Notes Modal */}
        {selectedClientId && (
          <NotesModal
            open={showNotesModal}
            onOpenChange={setShowNotesModal}
            title="Client"
            entityId={parseInt(selectedClientId, 10)}
            notes={allClientNotes.map((n) => ({
              id: n.id,
              note: n.note,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            }))}
            isLoading={isLoadingNotes}
            onRefresh={fetchAllClientNotes}
            onCreateNote={handleCreateClientNote}
            onUpdateNote={handleUpdateClientNote}
            onDeleteNote={handleDeleteClientNote}
          />
        )}
      </AppShell>
    </>
  );
};

export default CreateInvoice;
