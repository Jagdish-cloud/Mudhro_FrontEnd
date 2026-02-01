import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AppShell from "@/components/AppShell";
import { projectService, Project } from "@/lib/services/projectService";
import { agreementService, Agreement } from "@/lib/services/agreementService";
import { invoiceService, Invoice } from "@/lib/services/invoiceService";
import { clientService, Client } from "@/lib/services/clientService";
import { formatCurrency, Currency } from "@/lib/currency";
import { authService } from "@/lib/auth";
import { toast } from "sonner";
import { decodeId, encodeId } from "@/lib/urlEncoder";
import { getFileUrl } from "@/lib/services/fileStorageService";
import { API_BASE_URL } from "@/lib/api";
import { 
  Loader2, 
  Download, 
  CheckCircle2, 
  FileText, 
  Clock,
  FolderKanban,
  Plus,
  MoreVertical,
  ChevronLeft
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: 'project_created' | 'agreement_created' | 'agreement_signed' | 'milestone_created' | 'invoice_created';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("milestones");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [signatureUrls, setSignatureUrls] = useState<Map<number, string>>(new Map());

  const user = authService.getCurrentUser();
  const userCurrency = (user?.currency as Currency) || 'INR';

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const loadProjectData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const projectId = decodeId(id);
      if (!projectId) {
        toast.error("Invalid project ID");
        navigate("/projects");
        return;
      }

      // Load project
      const projectData = await projectService.getProjectById(projectId);
      setProject(projectData);

      // Load agreement
      let agreementData: Agreement | null = null;
      try {
        agreementData = await agreementService.getAgreementByProjectId(projectId);
        setAgreement(agreementData);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error("Failed to load agreement", error);
        }
        setAgreement(null);
      }

      // Load invoices and filter by projectId
      try {
        const allInvoices = await invoiceService.getInvoices();
        
        // Filter invoices by projectId, handling null/undefined and type conversion
        const projectInvoices = allInvoices.filter(inv => {
          // Handle null, undefined, or empty values
          if (inv.projectId === null || inv.projectId === undefined) {
            return false;
          }
          
          // Convert both to numbers for comparison (handles string/number mismatches)
          const invProjectId = Number(inv.projectId);
          const targetProjectId = Number(projectId);
          
          // Check if both are valid numbers and match
          const matches = !isNaN(invProjectId) && !isNaN(targetProjectId) && invProjectId === targetProjectId;
          
          // Debug logging (can be removed later)
          if (process.env.NODE_ENV === 'development') {
            if (matches) {
              console.log(`[ProjectDetails] Matched invoice ${inv.invoiceNumber}: projectId=${inv.projectId} === ${projectId}`);
            }
          }
          
          return matches;
        });
        
        setInvoices(projectInvoices);
      } catch (error) {
        console.error("Failed to load invoices", error);
        toast.error("Failed to load invoices");
        setInvoices([]);
      }

      // Load clients for project
      try {
        const projectClients = await projectService.getClientsByProjectId(projectId);
        setClients(projectClients);
      } catch (error) {
        console.error("Failed to load clients", error);
        setClients([]);
      }

      // Load signature images if agreement exists
      if (agreementData) {
        await loadSignatureImages(agreementData);
      }

    } catch (error: any) {
      console.error("Failed to load project data", error);
      toast.error(error.message || "Failed to load project");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project && agreement && invoices) {
      constructTimeline();
    }
  }, [project, agreement, invoices]);

  const constructTimeline = () => {
    if (!project || !agreement) return;

    const events: TimelineEvent[] = [];

    // Project created
    if (project.createdAt) {
      events.push({
        id: 'project_created',
        type: 'project_created',
        title: 'Project created',
        description: `Project "${project.name}" was created`,
        timestamp: new Date(project.createdAt),
        icon: <FolderKanban className="h-4 w-4" />,
        color: 'green'
      });
    }

    // Agreement created
    if (agreement.createdAt) {
      events.push({
        id: 'agreement_created',
        type: 'agreement_created',
        title: 'Agreement created',
        description: 'Agreement was created',
        timestamp: new Date(agreement.createdAt),
        icon: <FileText className="h-4 w-4" />,
        color: 'green'
      });
    }

    // Agreement signed
    if (agreement.signatures && agreement.signatures.length > 0) {
      agreement.signatures.forEach((sig, idx) => {
        events.push({
          id: `agreement_signed_${idx}`,
          type: 'agreement_signed',
          title: 'Agreement signed',
          description: `Agreement signed by ${sig.signerName}`,
          timestamp: new Date(sig.timestamp),
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'green'
        });
      });
    }

    // Milestones created
    if (agreement.paymentTerms?.milestones) {
      agreement.paymentTerms.milestones.forEach((milestone, idx) => {
        // Use createdAt timestamp from agreement_payment_milestones table if available
        // Otherwise fall back to milestone date or agreement creation date
        const milestoneTimestamp = milestone.createdAt 
          ? new Date(milestone.createdAt)
          : milestone.date 
            ? new Date(milestone.date)
            : new Date(agreement.createdAt);
        
        events.push({
          id: `milestone_created_${milestone.id || idx}`,
          type: 'milestone_created',
          title: 'Milestone created',
          description: `Milestone: ${milestone.description}`,
          timestamp: milestoneTimestamp,
          icon: <FileText className="h-4 w-4" />,
          color: 'green'
        });
      });
    }

    // Invoices created - match with milestones if applicable
    invoices.forEach((invoice) => {
      // Try to match invoice with a milestone
      let milestoneDescription: string | null = null;
      
      if (agreement.paymentTerms?.milestones) {
        // Try to match invoice with milestone
        // Match by: amount matches (date is optional - invoices can be created before/after milestone dates)
        // This handles cases where GST might have been added and manual invoice creation
        const matchingMilestone = agreement.paymentTerms.milestones.find(milestone => {
          // Match amount - check both totalAmount and subTotalAmount (in case GST was added)
          const milestoneAmount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : (milestone.amount || 0);
          const invoiceTotal = invoice.totalAmount || 0;
          const invoiceSubTotal = invoice.subTotalAmount || 0;
          
          // Allow small tolerance for rounding (0.01)
          const totalMatches = Math.abs(milestoneAmount - invoiceTotal) < 0.01;
          const subTotalMatches = Math.abs(milestoneAmount - invoiceSubTotal) < 0.01;
          
          return totalMatches || subTotalMatches;
        });
        
        if (matchingMilestone) {
          milestoneDescription = matchingMilestone.description;
        }
      }
      
      // Set title with milestone description if available, otherwise just "Invoice created"
      const title = milestoneDescription 
        ? `Invoice created for ${milestoneDescription}`
        : 'Invoice created';
      
      // Description is just the invoice number
      const description = `Invoice ${invoice.invoiceNumber}`;
      
      events.push({
        id: `invoice_created_${invoice.id}`,
        type: 'invoice_created',
        title,
        description,
        timestamp: new Date(invoice.createdAt),
        icon: <FileText className="h-4 w-4" />,
        color: 'green'
      });
    });

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTimelineEvents(events);
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return "—";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (date: string | Date | undefined): string => {
    if (!date) return "—";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "on-hold":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getNextAction = () => {
    if (!agreement?.paymentTerms?.milestones) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pendingMilestones = agreement.paymentTerms.milestones.filter(m => {
      if (m.status === 'created') return false;
      if (!m.date) return true;
      const dueDate = new Date(m.date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today;
    });
    
    if (pendingMilestones.length > 0) {
      return pendingMilestones[0];
    }
    
    return null;
  };


  const loadSignatureImages = async (agreementData: Agreement) => {
    const urls = new Map<number, string>();
    
    for (const signature of agreementData.signatures) {
      if (signature.signatureImagePath) {
        try {
          const url = await getFileUrl('Signatures', agreementData.projectId, {
            signaturePath: signature.signatureImagePath,
            expiresInMinutes: 60,
          });
          urls.set(signature.id, url);
        } catch (error) {
          console.error(`Failed to load signature ${signature.id}:`, error);
        }
      }
    }
    
    setSignatureUrls(urls);
  };

  const handleDownloadAgreementPdf = async () => {
    if (!agreement) return;
    
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem("accessToken");
      const encodedId = encodeId(agreement.id);
      
      const response = await fetch(`${API_BASE_URL}/api/agreements/${encodedId}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText || "Failed to download agreement PDF";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text as is
        }
        
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      
      if (blob.type !== 'application/pdf' && blob.size === 0) {
        throw new Error("Received empty or invalid PDF file");
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Agreement-${agreement.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("Agreement PDF downloaded successfully");
    } catch (error: any) {
      console.error("Failed to download agreement PDF", error);
      toast.error(error.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const computeInvoiceStatus = (invoice: Invoice): 'paid' | 'pending' | 'overdue' => {
    // Use status from API if available
    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'overdue') return 'overdue';
    if (invoice.status === 'pending') return 'pending';
    
    // Otherwise compute from due date
    const due = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    if (due < today) {
      return 'overdue';
    }
    return 'pending';
  };

  const handleDownloadInvoicePdf = async (invoiceId: number, invoiceNumber?: string | null) => {
    try {
      setDownloadingInvoiceId(invoiceId);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/api/invoices/${encodeId(invoiceId)}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText || "Failed to download invoice PDF";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text as is
        }
        
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      
      if (blob.type !== 'application/pdf' && blob.size === 0) {
        throw new Error("Received empty or invalid PDF file");
      }
      
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
      setDownloadingInvoiceId(null);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </AppShell>
    );
  }

  const nextAction = getNextAction();
  const milestones = agreement?.paymentTerms?.milestones || [];
  const hasMilestones = agreement?.paymentTerms?.paymentStructure === 'milestone-based' && milestones.length > 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/projects")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {project.budget ? formatCurrency(project.budget, userCurrency) : "—"}
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="agreement">Agreement</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            {!agreement ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No agreement created yet</p>
                </CardContent>
              </Card>
            ) : !hasMilestones ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No milestones added in agreement yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Milestones</h2>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
                <div className="space-y-4">
                  {milestones.map((milestone, idx) => (
                    <Card key={milestone.id || idx}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{idx + 1}. {milestone.description}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatCurrency(parseFloat(milestone.amount.toString()), userCurrency)}</span>
                              {milestone.date && (
                                <>
                                  <span>•</span>
                                  <span>Due {formatDate(milestone.date)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={milestone.status === 'created' ? 'default' : 'secondary'}
                              className={(!milestone.status || milestone.status === 'pending') ? 'bg-yellow-100 text-yellow-800' : ''}
                            >
                              {milestone.status === 'created' ? 'Created' : 'Pending'}
                            </Badge>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Showing {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}</p>
              </>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <h2 className="text-xl font-semibold">Timeline</h2>
            
            {nextAction && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900">Next Action</h3>
                      <p className="text-sm text-yellow-800">
                        Develop {nextAction.description} and submit milestone.
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">Last updated a few seconds ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-6">
              {timelineEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No timeline events yet</p>
                  </CardContent>
                </Card>
              ) : (
                timelineEvents.map((event, idx) => {
                  const isToday = event.timestamp.toDateString() === new Date().toDateString();
                  const isYesterday = event.timestamp.toDateString() === new Date(Date.now() - 86400000).toDateString();
                  
                  // Format date with time for header
                  let dateLabel = formatDateTime(event.timestamp);
                  if (isToday) {
                    const timeStr = event.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    dateLabel = `Today, ${timeStr}`;
                  } else if (isYesterday) {
                    const timeStr = event.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    dateLabel = `Yesterday, ${timeStr}`;
                  }

                  // Show date header if it's the first event or if the date changed
                  const showDateHeader = idx === 0 || 
                    timelineEvents[idx - 1].timestamp.toDateString() !== event.timestamp.toDateString();

                  return (
                    <div key={event.id}>
                      {showDateHeader && (
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{dateLabel}</h3>
                      )}
                      <div className="flex gap-3">
                        <div className={`mt-1 ${event.color === 'green' ? 'text-green-600' : 'text-gray-400'}`}>
                          {event.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          {/* Show full date and time for each event */}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {timelineEvents.length > 0 && (
              <p className="text-sm text-muted-foreground">Showing up to 20 recent events</p>
            )}
          </TabsContent>

          {/* Agreement Tab */}
          <TabsContent value="agreement" className="space-y-4">
            {!agreement ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No agreement created yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Agreement Header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">Agreement between</p>
                          <p className="text-sm text-muted-foreground">
                            Created on {formatDate(agreement.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const clientSignatures = agreement.signatures.filter(s => s.signerType === 'client');
                          const allSigned = clientSignatures.length > 0 && clientSignatures.length === clients.length;
                          return (
                            <Badge variant="outline" className={allSigned ? "bg-green-50 text-green-700 border-green-200" : ""}>
                              {allSigned ? "Signed (Locked)" : "Pending"}
                            </Badge>
                          );
                        })()}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadAgreementPdf}
                          disabled={downloadingPdf}
                        >
                          {downloadingPdf ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Complete Agreement Content */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Service Agreement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-6 text-sm leading-relaxed">
                      {/* Introduction */}
                      <div>
                        <p className="mb-4">
                          This Agreement is entered into between <strong>{agreement.serviceProviderName}</strong> ("Service Provider") 
                          and <strong>{clients.map(c => c.fullName).join(', ')}</strong> ("Client") on <strong>{formatDate(agreement.agreementDate)}</strong>.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 1. Scope of Work */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">1. Scope of Work</h3>
                        <p className="mb-3">
                          The Service Provider agrees to design and/or develop a website as per the following scope:
                        </p>
                        <div className="space-y-2 ml-4">
                          <p>
                            <strong>Service Type:</strong><br />
                            {agreement.serviceType}
                          </p>
                          {agreement.deliverables.length > 0 && (
                            <div>
                              <strong>Deliverables Include:</strong>
                              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                {agreement.deliverables.map((d, i) => (
                                  <li key={i}>{d.description}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 italic text-muted-foreground">
                          Any additional features, integrations, or changes not explicitly listed above are outside the scope of this Agreement 
                          and may require a separate quotation or amendment.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 2. Timeline & Milestones */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">2. Timeline & Milestones</h3>
                        <ul className="space-y-1 ml-4">
                          {agreement.startDate && (
                            <li>Project Start Date: <strong>{formatDate(agreement.startDate)}</strong></li>
                          )}
                          {agreement.endDate && (
                            <li>Estimated Completion Date: <strong>{formatDate(agreement.endDate)}</strong></li>
                          )}
                          {agreement.duration && (
                            <li>Total Duration: <strong>
                              {agreement.duration} {agreement.durationUnit === 'weeks' ? 'Weeks' : 
                                                     agreement.durationUnit === 'months' ? 'Months' : 'Days'}
                            </strong></li>
                          )}
                        </ul>
                        <p className="mt-3 italic text-muted-foreground">
                          Timelines are dependent on timely feedback, approvals, and content provided by the Client. 
                          Delays caused by the Client may extend the project timeline accordingly.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 3. Payment Terms */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">3. Payment Terms</h3>
                        <p className="mb-3">
                          The Client agrees to pay the Service Provider as per the selected payment structure:
                        </p>
                        <ul className="space-y-1 ml-4">
                          <li className={agreement.paymentTerms.paymentStructure === '50-50' ? 'font-semibold' : ''}>
                            {agreement.paymentTerms.paymentStructure === '50-50' ? '☑' : '☐'} 50% Upfront & 50% Upon Completion
                          </li>
                          <li className={agreement.paymentTerms.paymentStructure === '100-upfront' ? 'font-semibold' : ''}>
                            {agreement.paymentTerms.paymentStructure === '100-upfront' ? '☑' : '☐'} 100% Upfront
                          </li>
                          <li className={agreement.paymentTerms.paymentStructure === '100-completion' ? 'font-semibold' : ''}>
                            {agreement.paymentTerms.paymentStructure === '100-completion' ? '☑' : '☐'} 100% Upon Completion
                          </li>
                          {agreement.paymentTerms.paymentStructure === 'milestone-based' && agreement.paymentTerms.milestones && (
                            <li className="font-semibold">
                              ☑ Milestone-Based Payments:
                              <ul className="list-disc list-inside ml-4 mt-1">
                                {agreement.paymentTerms.milestones.map((m, i) => (
                                  <li key={i}>
                                    {m.description} – {formatCurrency(parseFloat(m.amount.toString()), userCurrency)}
                                    {m.date && ` (Due: ${formatDate(m.date)})`}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          )}
                        </ul>
                        {agreement.paymentTerms.paymentMethod && (
                          <p className="mt-3">
                            Payments must be made via: <strong>{agreement.paymentTerms.paymentMethod}</strong>
                          </p>
                        )}
                        <p className="mt-3 italic text-muted-foreground">
                          Work will commence only after receipt of any applicable upfront payment. 
                          Late payments may result in work being paused until payment is received.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 4. Revisions */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">4. Revisions</h3>
                        <p className="mb-3">
                          The Agreement includes up to <strong>{agreement.numberOfRevisions}</strong> revisions.
                        </p>
                        <p className="italic text-muted-foreground">
                          A "revision" refers to minor design or content adjustments within the agreed scope. 
                          Major changes, redesigns, or scope expansions will be treated as additional work and billed separately.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 5. Client Responsibilities */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">5. Client Responsibilities</h3>
                        <p className="mb-3">The Client agrees to:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Provide all required content, assets, and feedback in a timely manner</li>
                          <li>Review and approve deliverables within a reasonable timeframe</li>
                          <li>Ensure that any provided content does not infringe third-party rights</li>
                        </ul>
                        <p className="mt-3 italic text-muted-foreground">
                          Delays in client input may affect delivery timelines.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 6. Ownership & Usage Rights */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">6. Ownership & Usage Rights</h3>
                        <p className="mb-3">
                          Upon full payment, the Client will receive ownership rights to the final approved deliverables.
                        </p>
                        <p className="italic text-muted-foreground">
                          The Service Provider retains the right to showcase the work in portfolios, case studies, or marketing materials 
                          unless otherwise agreed in writing.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 7. Confidentiality */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">7. Confidentiality</h3>
                        <p className="italic text-muted-foreground">
                          Both parties agree to keep any confidential or sensitive information shared during the project strictly confidential 
                          and not disclose it to third parties without prior consent.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 8. Termination */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">8. Termination</h3>
                        <p className="mb-3">
                          Either party may terminate this Agreement with written notice.
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Payments already made are non-refundable for work completed up to the termination date.</li>
                          <li>Any completed work up to termination will be handed over to the Client upon settlement of dues.</li>
                        </ul>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 9. Limitation of Liability */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">9. Limitation of Liability</h3>
                        <p className="mb-3">The Service Provider shall not be liable for:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Loss of business, revenue, or profits</li>
                          <li>Issues arising from third-party tools, hosting providers, or platforms</li>
                          <li>Delays caused by client actions or external dependencies</li>
                        </ul>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 10. Governing Law */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">10. Governing Law</h3>
                        <p className="italic text-muted-foreground">
                          This Agreement shall be governed by and interpreted in accordance with the laws applicable in{' '}
                          <strong>{agreement.jurisdiction || '[Jurisdiction / Country]'}</strong>, unless otherwise agreed.
                        </p>
                        <div className="border-t border-muted-foreground/25 my-4"></div>
                      </div>

                      {/* 11. Acceptance & E-Signature */}
                      <div>
                        <h3 className="font-semibold text-base mb-3">11. Acceptance & E-Signature</h3>
                        <p className="mb-4 italic text-muted-foreground">
                          By proceeding, both parties confirm that they have read, understood, and agreed to the terms of this Agreement.
                        </p>
                        
                        <div className="space-y-4">
                          {/* Client Signatures */}
                          {clients.map((client) => {
                            const signature = agreement.signatures.find(s => s.clientId === client.id);
                            return (
                              <div key={client.id}>
                                <p className="mb-2"><strong>Client Signature ({client.fullName}):</strong></p>
                                {signature ? (
                                  <div className="mt-2 space-y-2">
                                    {signatureUrls.get(signature.id) && (
                                      <div className="border border-muted-foreground/25 rounded p-2 bg-white inline-block">
                                        <img
                                          src={signatureUrls.get(signature.id)}
                                          alt={`${client.fullName} Signature`}
                                          className="max-w-[200px] max-h-[100px] object-contain"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">
                                        Signed by: {signature.signerName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Date: {formatDate(signature.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-muted-foreground">________</p>
                                    <p className="text-muted-foreground mt-2">Date: ________</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Service Provider Signature */}
                          <div>
                            <p className="mb-2"><strong>Service Provider Signature:</strong></p>
                            {agreement.signatures.find(s => s.signerType === 'service_provider') ? (
                              <div className="mt-2 space-y-2">
                                {(() => {
                                  const spSig = agreement.signatures.find(s => s.signerType === 'service_provider');
                                  return spSig && signatureUrls.get(spSig.id) ? (
                                    <div className="border border-muted-foreground/25 rounded p-2 bg-white inline-block">
                                      <img
                                        src={signatureUrls.get(spSig.id)!}
                                        alt="Service Provider Signature"
                                        className="max-w-[200px] max-h-[100px] object-contain"
                                      />
                                    </div>
                                  ) : null;
                                })()}
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Signed by: {agreement.signatures.find(s => s.signerType === 'service_provider')?.signerName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Date: {formatDate(agreement.signatures.find(s => s.signerType === 'service_provider')?.timestamp)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-muted-foreground">________</p>
                                <p className="text-muted-foreground mt-2">Date: ________</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Invoices</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Invoices are auto-generated on milestone approval.
                </p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No invoices found for this project</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => {
                  const status = computeInvoiceStatus(invoice);
                  const isDownloading = downloadingInvoiceId === invoice.id;
                  return (
                    <Card key={invoice.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}>
                                {status === 'paid' ? '✓ Paid' : status === 'overdue' ? 'Overdue' : 'Invoice'}
                              </Badge>
                              <span className="font-semibold">#{invoice.invoiceNumber}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {formatCurrency(invoice.totalAmount, userCurrency)}
                              {status === 'paid' && ' paid via Razorpay'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Prepared by {user?.fullName || 'User'} for {clients.find(c => c.id === invoice.clientId)?.fullName || 'Client'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Issued: {formatDate(invoice.invoiceDate)}</span>
                              <span>Due: {formatDate(invoice.dueDate)}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoicePdf(invoice.id, invoice.invoiceNumber)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <p className="text-sm text-muted-foreground">Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </AppShell>
  );
};

export default ProjectDetails;
