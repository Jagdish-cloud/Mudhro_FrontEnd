import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit2, Trash2, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";


interface Note {
  id: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  entityId: number;
  notes: Note[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateNote: (note: string) => Promise<void>;
  onUpdateNote: (noteId: number, note: string) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
}

const NotesModal = ({
  open,
  onOpenChange,
  title,
  entityId,
  notes,
  isLoading,
  onRefresh,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NotesModalProps) => {
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setNewNote("");
      setEditingId(null);
      setEditingNote("");
      // Only fetch on initial open, not on every render
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        onRefresh();
      }
    } else {
      // Reset flag when modal closes
      hasFetchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only run when modal opens/closes, not when onRefresh changes

  const handleCreateNote = async () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    if (newNote.trim().length > 1000) {
      toast.error("Note must be 1000 characters or less");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateNote(newNote.trim());
      setNewNote("");
      toast.success("Note added successfully");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingNote(note.note);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNote("");
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editingNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    if (editingNote.trim().length > 1000) {
      toast.error("Note must be 1000 characters or less");
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateNote(noteId, editingNote.trim());
      setEditingId(null);
      setEditingNote("");
      toast.success("Note updated successfully");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    setDeletingId(noteId);
    try {
      await onDeleteNote(noteId);
      toast.success("Note deleted successfully");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title} Notes</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 py-4">
          {/* Add New Note */}
          <div className="space-y-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a new note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                maxLength={1000}
                className="resize-none"
              />

            </div>
            <Button
                onClick={handleCreateNote}
                disabled={isSubmitting || !newNote.trim()}
                size="icon"
                className="h-auto w-100"
                >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-auto w-100"/>
                  </>

               )}
              </Button>
            <p className="text-xs text-muted-foreground">
              {newNote.length}/1000 characters
            </p>
          </div>

          {/* Notes List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No notes yet. Add your first note above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-lg p-3 space-y-2 bg-card"
                >
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingNote}
                        onChange={(e) => setEditingNote(e.target.value)}
                        rows={2}
                        maxLength={1000}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {editingNote.length}/1000 characters
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={isSubmitting || !editingNote.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-lg text-muted-foreground">•</span>
                        <p className="flex-1 text-sm whitespace-pre-wrap">{note.note}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()} at{" "}
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(note)}
                            disabled={isSubmitting || deletingId !== null}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={isSubmitting || deletingId === note.id}
                          >
                            {deletingId === note.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;

