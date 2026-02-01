import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { vendorService, Vendor } from "@/lib/services/vendorService";
import { vendorDocumentService, VendorDocument } from "@/lib/services/vendorDocumentService";
import { vendorNoteService } from "@/lib/services/vendorNoteService";
import { VendorNote } from "@/lib/types/vendorNote";
import { Plus, Edit2, Upload, X, FileText, Download, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NotesModal from "@/components/NotesModal";

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    organization: "",
    fullName: "",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
    isActive: "active",
  });
  
  // Document upload state
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState<File[]>([]);
  const [documentsToDelete, setDocumentsToDelete] = useState<number[]>([]); // Track documents marked for deletion
  const [saving, setSaving] = useState(false); // Loading state for save button
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedVendorForNotes, setSelectedVendorForNotes] = useState<number | null>(null);
  const [allVendorNotes, setAllVendorNotes] = useState<VendorNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const notesFetchRef = useRef<{ vendorId: number | null; isFetching: boolean }>({ vendorId: null, isFetching: false });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const list = await vendorService.getVendors();
      setVendors(list ?? []);
    } catch (err: any) {
      console.error("Failed to load vendors", err);
      toast.error(err.message || "Failed to load vendors");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const openNotesModal = (vendorId: number) => {
    setSelectedVendorForNotes(vendorId);
    setShowNotesModal(true);
    // Notes will be fetched by NotesModal's useEffect via onRefresh callback
  };

  const fetchAllVendorNotes = useCallback(async (vendorId: number) => {
    // Prevent duplicate simultaneous calls for the same vendor
    if (notesFetchRef.current.isFetching && notesFetchRef.current.vendorId === vendorId) {
      console.log("Already fetching notes for vendor:", vendorId);
      return;
    }

    try {
      notesFetchRef.current = { vendorId, isFetching: true };
      setIsLoadingNotes(true);
      const notes = await vendorNoteService.getVendorNotes(vendorId);
      setAllVendorNotes(notes);
    } catch (error: any) {
      console.error("Error fetching vendor notes:", error);
      toast.error(error.message || "Failed to fetch notes");
      setAllVendorNotes([]);
    } finally {
      setIsLoadingNotes(false);
      notesFetchRef.current = { vendorId: null, isFetching: false };
    }
  }, []);

  const handleRefreshVendorNotes = useCallback(() => {
    if (selectedVendorForNotes) {
      fetchAllVendorNotes(selectedVendorForNotes);
    }
  }, [selectedVendorForNotes, fetchAllVendorNotes]);

  const handleCreateVendorNote = async (note: string) => {
    if (!selectedVendorForNotes) {
      throw new Error("No vendor selected");
    }
    await vendorNoteService.createVendorNote(selectedVendorForNotes, { note });
  };

  const handleUpdateVendorNote = async (noteId: number, note: string) => {
    if (!selectedVendorForNotes) {
      throw new Error("No vendor selected");
    }
    await vendorNoteService.updateVendorNote(selectedVendorForNotes, noteId, { note });
  };

  const handleDeleteVendorNote = async (noteId: number) => {
    if (!selectedVendorForNotes) {
      throw new Error("No vendor selected");
    }
    await vendorNoteService.deleteVendorNote(selectedVendorForNotes, noteId);
  };


  const openEdit = async (v: Vendor) => {
    setEditingId(v.id.toString());
    setForm({
      id: v.id.toString(),
      organization: v.organization ?? "",
      fullName: v.fullName ?? "",
      email: v.email ?? "",
      phone: v.mobileNumber ?? "",
      gstin: v.gstin ?? "",
      pan: v.pan ?? "",
      isActive: v.isActive !== false ? "active" : "inactive",
    });
    setUploadingDocuments([]);
    setDocumentsToDelete([]); // Reset deletion list
    try {
      const docs = await vendorDocumentService.getVendorDocuments(v.id);
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
      setDocuments([]);
    }
    setShowModal(true);
  };
  
  const openAdd = () => {
    setEditingId(null);
    setForm({
      id: "",
      organization: "",
      fullName: "",
      email: "",
      phone: "",
      gstin: "",
      pan: "",
      isActive: "active",
    });
    setDocuments([]);
    setUploadingDocuments([]);
    setDocumentsToDelete([]); // Reset deletion list
    setShowModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalDocs = documents.length + uploadingDocuments.length + files.length;
    
    if (totalDocs > 5) {
      toast.error("Maximum 5 documents allowed per vendor");
      return;
    }
    
    setUploadingDocuments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeUploadingDocument = (index: number) => {
    setUploadingDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadDocument = async (doc: VendorDocument) => {
    if (!editingId) return;
    try {
      const vendorId = parseInt(editingId, 10);
      await vendorDocumentService.downloadVendorDocument(vendorId, doc.id, doc.fileName);
      toast.success("Document downloaded");
    } catch (error: any) {
      console.error("Failed to download document:", error);
      toast.error(error.message || "Failed to download document");
    }
  };

  const removeDocument = (documentId: number) => {
    // Mark document for deletion (asynchronous - will delete on Save)
    setDocumentsToDelete((prev) => [...prev, documentId]);
    // Remove from UI immediately
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    toast.success("Document marked for deletion. Click Save to confirm.");
  };

  const save = async () => {
    setSaving(true);
    try {
      let vendorId: number;
      
      if (editingId) {
        // Update existing vendor
        vendorId = parseInt(editingId, 10);
        const updatedVendor = await vendorService.updateVendor(vendorId, {
          organization: form.organization || undefined,
          fullName: form.fullName,
          email: form.email || undefined,
          mobileNumber: form.phone || undefined,
          gstin: form.gstin || undefined,
          pan: form.pan || undefined,
          isActive: form.isActive === "active",
        });
        setVendors((prev) => prev.map((p) => (p.id === vendorId ? updatedVendor : p)));
        toast.success("Vendor updated");
      } else {
        // Create new vendor
        const newVendor = await vendorService.createVendor({
          organization: form.organization || undefined,
          fullName: form.fullName,
          email: form.email || undefined,
          mobileNumber: form.phone || undefined,
          gstin: form.gstin || undefined,
          pan: form.pan || undefined,
          isActive: form.isActive === "active",
        });
        vendorId = newVendor.id;
        setVendors((prev) => [...prev, newVendor]);
        toast.success("Vendor added");
      }
      
      // Delete documents marked for deletion
      if (documentsToDelete.length > 0) {
        try {
          for (const documentId of documentsToDelete) {
            await vendorDocumentService.deleteVendorDocument(vendorId, documentId);
          }
          toast.success(`${documentsToDelete.length} document(s) deleted`);
        } catch (error: any) {
          console.error("Failed to delete documents:", error);
          toast.error(error.message || "Failed to delete some documents");
        }
      }
      
      // Upload documents
      if (uploadingDocuments.length > 0) {
        try {
          for (const file of uploadingDocuments) {
            await vendorDocumentService.uploadVendorDocument(vendorId, file);
          }
          toast.success(`${uploadingDocuments.length} document(s) uploaded`);
        } catch (error: any) {
          console.error("Failed to upload documents:", error);
          toast.error(error.message || "Failed to upload some documents");
        }
      }
      
      setShowModal(false);
      setUploadingDocuments([]);
      setDocumentsToDelete([]);
    } catch (err: any) {
      console.error("Failed to save vendor", err);
      toast.error(err.message || "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold">Vendors</h2>
                <Button variant="outline" onClick={openAdd} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                </Button>
            </div>

            <Card>
                <CardHeader>
                <CardTitle className="text-base sm:text-lg">All vendors</CardTitle>
                </CardHeader>
                <CardContent>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : vendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vendors yet. Click "Add Vendor" to create one.</p>
                ) : (
                    <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-sm text-muted-foreground text-left border-b">
                            <th className="p-2">Organization</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Phone</th>
                            <th className="p-2">GSTIN</th>
                            <th className="p-2">PAN</th>
                            <th className="p-2 w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendors.map((v) => (
                            <tr key={v.id} className="border-t hover:bg-muted/50">
                              <td className="p-2 text-sm">{v.organization ?? "—"}</td>
                              <td className="p-2 text-sm">{v.fullName}</td>
                              <td className="p-2 text-sm">{v.email ?? "—"}</td>
                              <td className="p-2 text-sm">{v.mobileNumber ?? "—"}</td>
                              <td className="p-2 text-sm">{v.gstin ?? "—"}</td>
                              <td className="p-2 text-sm">{v.pan ?? "—"}</td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Edit" className="h-8 w-8">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openNotesModal(v.id)} title="Notes" className="h-8 w-8">
                                    <StickyNote className="h-4 w-4" />
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
                      {vendors.map((v) => (
                        <Card key={v.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Name</span>
                              <span className="text-sm font-semibold">{v.fullName}</span>
                            </div>
                            {v.organization && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Organization</span>
                                <span className="text-sm">{v.organization}</span>
                              </div>
                            )}
                            {v.email && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Email</span>
                                <span className="text-sm break-all text-right">{v.email}</span>
                              </div>
                            )}
                            {v.mobileNumber && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Phone</span>
                                <span className="text-sm">{v.mobileNumber}</span>
                              </div>
                            )}
                            {v.gstin && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">GSTIN</span>
                                <span className="text-sm">{v.gstin}</span>
                              </div>
                            )}
                            {v.pan && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">PAN</span>
                                <span className="text-sm">{v.pan}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                              <Button variant="ghost" size="sm" onClick={() => openNotesModal(v.id)} className="h-9">
                                <StickyNote className="h-4 w-4 mr-2" />
                                Notes
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(v)} className="h-9">
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
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
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Horizontal grid layout for form fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Organization (optional)</Label>
                        <Input value={form.organization} onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))} placeholder="Acme Corp" />
                      </div>
                      <div>
                        <Label>Full name</Label>
                        <Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="John Doe" />
                      </div>
                      <div>
                        <Label>Email (optional)</Label>
                        <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                      </div>
                      <div>
                        <Label>Phone (optional)</Label>
                        <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
                      </div>
                      <div>
                        <Label>GSTIN (optional)</Label>
                        <Input value={form.gstin} onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
                      </div>
                      <div>
                        <Label>PAN Number (recommended)</Label>
                        <Input value={form.pan} onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} />
                      </div>
                      {editingId && (
                        <div>
                          <Label>Status</Label>
                          <Select
                            value={form.isActive}
                            onValueChange={(value) => setForm((p) => ({ ...p, isActive: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    {/* Documents Section */}
                    <div className="space-y-2">
                      <Label>Documents (up to 5)</Label>
                      <div className="space-y-2">
                        {/* Existing Documents */}
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{doc.fileName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadDocument(doc)}
                                className="h-6 w-6"
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDocument(doc.id)}
                                className="h-6 w-6"
                                title="Delete"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Uploading Documents */}
                        {uploadingDocuments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{file.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeUploadingDocument(index)}
                              className="h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Upload Button */}
                        {documents.length + uploadingDocuments.length < 5 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Document ({documents.length + uploadingDocuments.length}/5)
                          </Button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving} className="w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {editingId ? "Saving..." : "Adding..."}
                          </>
                        ) : (
                          editingId ? "Save" : "Add Vendor"
                        )}
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Notes Modal */}
            {selectedVendorForNotes && (
              <NotesModal
                open={showNotesModal}
                onOpenChange={(open) => {
                  setShowNotesModal(open);
                  if (!open) {
                    setSelectedVendorForNotes(null);
                    setAllVendorNotes([]);
                  }
                }}
                title="Vendor"
                entityId={selectedVendorForNotes}
                notes={allVendorNotes.map((n) => ({
                  id: n.id,
                  note: n.note,
                  createdAt: n.createdAt,
                  updatedAt: n.updatedAt,
                }))}
                isLoading={isLoadingNotes}
                onRefresh={handleRefreshVendorNotes}
                onCreateNote={handleCreateVendorNote}
                onUpdateNote={handleUpdateVendorNote}
                onDeleteNote={handleDeleteVendorNote}
              />
            )}
            </div>
    </AppShell>
  );
};

export default VendorsPage;

