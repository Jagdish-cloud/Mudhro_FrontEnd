import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { projectService, Project } from "@/lib/services/projectService";
import { clientService, Client } from "@/lib/services/clientService";
import { Plus, Edit2, Trash2, Users, Calendar, DollarSign, Loader2, X, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { formatCurrency, Currency } from "@/lib/currency";
import { authService } from "@/lib/auth";
import AgreementModal from "@/components/AgreementModal";
import { agreementService } from "@/lib/services/agreementService";
import { encodeId } from "@/lib/urlEncoder";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "active" as "active" | "completed" | "on-hold" | "cancelled",
    budget: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [selectedProjectClients, setSelectedProjectClients] = useState<Client[]>([]);
  const [selectedProjectForClients, setSelectedProjectForClients] = useState<Project | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [removingClientId, setRemovingClientId] = useState<number | null>(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementProjectId, setAgreementProjectId] = useState<number | null>(null);
  const [existingAgreement, setExistingAgreement] = useState<any>(null);
  const [projectAgreements, setProjectAgreements] = useState<Map<number, any>>(new Map());
  const [projectDataForAgreement, setProjectDataForAgreement] = useState<{ budget?: number; startDate?: string; endDate?: string } | null>(null);

  const user = authService.getCurrentUser();
  const userCurrency = (user?.currency as Currency) || 'INR';

  useEffect(() => {
    loadProjects();
    loadAllClients();
  }, []);

  // Reload clients when modal opens to get latest project assignments
  useEffect(() => {
    if (showModal) {
      loadAllClients();
    }
  }, [showModal]);

  const loadAllClients = async () => {
    try {
      const clients = await clientService.getClients();
      setAllClients(clients || []);
    } catch (err: any) {
      console.error("Failed to load clients", err);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await projectService.getProjects();
      setProjects(list ?? []);
      
      // Load agreements for all projects
      const agreementsMap = new Map<number, any>();
      for (const project of list || []) {
        try {
          const agreement = await agreementService.getAgreementByProjectId(project.id);
          if (agreement) {
            agreementsMap.set(project.id, agreement);
          }
        } catch (error) {
          // Agreement doesn't exist for this project, skip
        }
      }
      setProjectAgreements(agreementsMap);
    } catch (err: any) {
      console.error("Failed to load projects", err);
      toast.error(err.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = async () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "active",
      budget: "",
    });
    setSelectedClientIds([]);
    setExistingAgreement(null);
    setAgreementProjectId(null);
    setShowModal(true);
  };

  const openEdit = async (p: Project) => {
    setEditingId(p.id);
    setForm({
      name: p.name ?? "",
      description: p.description ?? "",
      startDate: p.startDate ? (typeof p.startDate === 'string' ? p.startDate.split('T')[0] : new Date(p.startDate).toISOString().split('T')[0]) : "",
      endDate: p.endDate ? (typeof p.endDate === 'string' ? p.endDate.split('T')[0] : new Date(p.endDate).toISOString().split('T')[0]) : "",
      status: p.status ?? "active",
      budget: p.budget?.toString() ?? "",
    });
    // Load clients for this project
    try {
      const projectClients = await projectService.getClientsByProjectId(p.id);
      setSelectedClientIds(projectClients.map(c => c.id.toString()));
    } catch (err: any) {
      console.error("Failed to load project clients", err);
      setSelectedClientIds([]);
    }
    // Load existing agreement for this project
    try {
      const agreement = await agreementService.getAgreementByProjectId(p.id);
      setExistingAgreement(agreement);
      setAgreementProjectId(p.id);
    } catch (err: any) {
      // Agreement doesn't exist for this project
      setExistingAgreement(null);
      setAgreementProjectId(null);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project? Clients will remain but will no longer be associated with this project.")) {
      return;
    }

    setDeletingId(id);
    try {
      await projectService.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch (err: any) {
      console.error("Failed to delete project", err);
      toast.error(err.message || "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  const save = async (): Promise<number | null> => {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return null;
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        toast.error("End date must be after start date");
        return null;
      }
    }

    setSaving(true);
    try {
      const projectData = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        ...(editingId ? { status: form.status } : {}), // Only include status when editing
        budget: form.budget ? parseFloat(form.budget) : undefined,
      };

      let projectId: number;
      if (editingId) {
        const updated = await projectService.updateProject(editingId, projectData);
        setProjects((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        projectId = editingId;
        toast.success("Project updated");
      } else {
        // Set default status to 'active' for new projects
        const projectDataWithStatus = { ...projectData, status: 'active' as const };
        const newProject = await projectService.createProject(projectDataWithStatus);
        setProjects((prev) => [newProject, ...prev]);
        projectId = newProject.id;
        toast.success("Project created");
      }

      // Assign selected clients to project using bulk assignment
      try {
        const clientIds = selectedClientIds.map(id => parseInt(id, 10));
        await projectService.assignClientsToProject(projectId, clientIds);
      } catch (err: any) {
        console.error("Failed to assign clients to project", err);
        toast.error("Project saved but failed to assign clients");
      }

      setShowModal(false);
      // Reload projects to refresh client counts
      await loadProjects();
      return projectId;
    } catch (err: any) {
      console.error("Failed to save project", err);
      toast.error(err.message || "Failed to save project");
      return null;
    } finally {
      setSaving(false);
    }
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

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return "—";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const handleViewClients = async (project: Project) => {
    setSelectedProjectForClients(project);
    setLoadingClients(true);
    setShowClientsModal(true);
    try {
      const clients = await projectService.getClientsByProjectId(project.id);
      setSelectedProjectClients(clients);
    } catch (err: any) {
      console.error("Failed to load clients for project", err);
      toast.error(err.message || "Failed to load clients");
      setSelectedProjectClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const filteredProjects = statusFilter === "all" 
    ? projects 
    : projects.filter((p) => p.status === statusFilter);

  // Show all clients - clients can be assigned to multiple projects
  const availableClients = allClients;

  return (
    <AppShell>
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Projects</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={openAdd} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {statusFilter === "all" 
                  ? "No projects yet. Click 'Add Project' to create one."
                  : `No ${statusFilter} projects found.`}
              </p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-muted-foreground text-left border-b">
                        <th className="p-2">Name</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Start Date</th>
                        <th className="p-2">End Date</th>
                        <th className="p-2">Budget</th>
                        <th className="p-2">Clients</th>
                        <th className="p-2">Agreement</th>
                        <th className="p-2 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((p) => (
                        <tr 
                          key={p.id} 
                          className="border-t hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/projects/${encodeId(p.id)}`)}
                        >
                          <td className="p-2 text-sm font-medium">{p.name}</td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {p.description ? (p.description.length > 50 ? p.description.substring(0, 50) + "..." : p.description) : "—"}
                          </td>
                          <td className="p-2">
                            <Badge variant={getStatusBadgeVariant(p.status)}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm">{formatDate(p.startDate)}</td>
                          <td className="p-2 text-sm">{formatDate(p.endDate)}</td>
                          <td className="p-2 text-sm">
                            {p.budget ? formatCurrency(p.budget, userCurrency) : "—"}
                          </td>
                          <td className="p-2 text-sm">{p.clientCount ?? 0}</td>
                          <td className="p-2 text-sm">
                            {(() => {
                              const agreement = projectAgreements.get(p.id);
                              if (!agreement) return <span className="text-muted-foreground">—</span>;
                              
                              const clientSignatures = agreement.signatures.filter((s: any) => s.signerType === 'client');
                              const signedCount = clientSignatures.length;
                              const totalClients = p.clientCount || 0;
                              
                              if (signedCount === 0) {
                                return <Badge variant="outline">Pending</Badge>;
                              } else if (signedCount === totalClients) {
                                return <Badge variant="default" className="bg-green-600">All Signed</Badge>;
                              } else {
                                return <Badge variant="secondary">{signedCount}/{totalClients} Signed</Badge>;
                              }
                            })()}
                          </td>
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewClients(p)}
                                title="View Clients"
                                className="h-8 w-8"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(p)}
                                title="Edit"
                                className="h-8 w-8"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(p.id)}
                                title="Delete"
                                className="h-8 w-8"
                                disabled={deletingId === p.id}
                              >
                                {deletingId === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredProjects.map((p) => (
                    <Card 
                      key={p.id} 
                      className="p-4 cursor-pointer"
                      onClick={() => navigate(`/projects/${encodeId(p.id)}`)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Name</span>
                          <span className="text-sm font-semibold">{p.name}</span>
                        </div>
                        {p.description && (
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Description</span>
                            <span className="text-sm text-right flex-1 ml-2">{p.description}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Status</span>
                          <Badge variant={getStatusBadgeVariant(p.status)}>
                            {p.status}
                          </Badge>
                        </div>
                        {p.startDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Start Date</span>
                            <span className="text-sm">{formatDate(p.startDate)}</span>
                          </div>
                        )}
                        {p.endDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">End Date</span>
                            <span className="text-sm">{formatDate(p.endDate)}</span>
                          </div>
                        )}
                        {p.budget && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Budget</span>
                            <span className="text-sm">{formatCurrency(p.budget, userCurrency)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Clients</span>
                          <span className="text-sm">{p.clientCount ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClients(p)}
                            className="h-9"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            View Clients
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(p)}
                            className="h-9"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                            className="h-9"
                            disabled={deletingId === p.id}
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit dialog */}
        <Dialog open={showModal} onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            // Clear agreement state when modal closes
            setExistingAgreement(null);
            setAgreementProjectId(null);
          }
        }}>
          <TooltipProvider delayDuration={200} skipDelayDuration={0}>
            <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Project" : "Add Project"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="My Project"
                  />
                </div>
                {editingId && (
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value: any) => setForm((p) => ({ ...p, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Budget</Label>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="z-[100]">
                        <p className="max-w-xs">
                          The total allocated budget for this project. This amount can be used to track project costs, 
                          set payment milestones in agreements, and monitor financial performance.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Project description..."
                    rows={4}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Clients (optional)</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    {availableClients.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No clients available
                      </p>
                    ) : (
                      availableClients.map((client) => (
                        <div key={client.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`client-${client.id}`}
                            checked={selectedClientIds.includes(client.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClientIds([...selectedClientIds, client.id.toString()]);
                              } else {
                                setSelectedClientIds(selectedClientIds.filter(id => id !== client.id.toString()));
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={`client-${client.id}`} className="text-sm cursor-pointer flex-1">
                            {client.fullName}
                            {client.organization && (
                              <span className="text-muted-foreground ml-2">({client.organization})</span>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedClientIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedClientIds.length} client(s) selected
                    </p>
                  )}
                  {(selectedClientIds.length > 0 || existingAgreement) && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Use the current project ID (editingId) or 0 for new projects
                          const tempProjectId = editingId || 0;
                          
                          setAgreementProjectId(tempProjectId);
                          
                          // Set project data for agreement modal (budget, dates)
                          setProjectDataForAgreement({
                            budget: form.budget ? parseFloat(form.budget) : undefined,
                            startDate: form.startDate || undefined,
                            endDate: form.endDate || undefined,
                          });
                          
                          // If we don't have existingAgreement loaded yet, try to load it
                          if (tempProjectId > 0 && !existingAgreement) {
                            try {
                              const existing = await agreementService.getAgreementByProjectId(tempProjectId);
                              setExistingAgreement(existing);
                            } catch (error) {
                              setExistingAgreement(null);
                            }
                          }
                          setShowAgreementModal(true);
                        }}
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {existingAgreement ? 'Edit Agreement' : 'Add Agreement'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingId ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  editingId ? "Save" : "Add Project"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
          </TooltipProvider>
        </Dialog>

        {/* View Clients Modal */}
        <Dialog open={showClientsModal} onOpenChange={setShowClientsModal}>
          <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Clients in "{selectedProjectForClients?.name}"
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {loadingClients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading clients...</span>
                </div>
              ) : selectedProjectClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No clients assigned to this project.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedProjectClients.map((client) => (
                    <Card key={client.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{client.fullName}</p>
                          {client.organization && (
                            <p className="text-xs text-muted-foreground">{client.organization}</p>
                          )}
                          {client.email && (
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {client.mobileNumber && (
                            <p className="text-sm text-muted-foreground">{client.mobileNumber}</p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (!confirm(`Remove ${client.fullName} from this project?`)) {
                                return;
                              }
                              setRemovingClientId(client.id);
                              try {
                                if (!selectedProjectForClients) return;
                                await projectService.removeClientFromProject(selectedProjectForClients.id, client.id);
                                setSelectedProjectClients(prev => prev.filter(c => c.id !== client.id));
                                toast.success("Client removed from project");
                                // Reload all clients to refresh the list
                                await loadAllClients();
                                // Reload projects to refresh client counts
                                await loadProjects();
                              } catch (err: any) {
                                console.error("Failed to remove client from project", err);
                                toast.error(err.message || "Failed to remove client from project");
                              } finally {
                                setRemovingClientId(null);
                              }
                            }}
                            disabled={removingClientId === client.id}
                            className="h-8"
                          >
                            {removingClientId === client.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClientsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Agreement Modal */}
        {agreementProjectId !== null && (
          <AgreementModal
            open={showAgreementModal}
            onOpenChange={(open) => {
              setShowAgreementModal(open);
              if (!open) {
                setAgreementProjectId(null);
                setExistingAgreement(null);
              }
            }}
            projectId={agreementProjectId || 0}
            selectedClientIds={selectedClientIds.map(id => parseInt(id, 10))}
            existingAgreement={existingAgreement}
            projectData={projectDataForAgreement}
            onSaveProject={agreementProjectId <= 0 ? save : undefined}
            onComplete={async () => {
              // Reload projects after agreement is saved and emails are sent
              await loadProjects();
            }}
          />
        )}
      </div>
    </AppShell>
  );
};

export default ProjectsPage;
