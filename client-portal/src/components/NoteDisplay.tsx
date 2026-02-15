import { Button } from "@/components/ui/button";

interface NoteDisplayProps {
  note: string | null;
  onViewNotes: () => void;
  entityType?: "Client" | "Vendor";
}

const NoteDisplay = ({ note, onViewNotes, entityType = "Client" }: NoteDisplayProps) => {
  if (!note) {
    return null;
  }

  return (
    <div className="text-sm text-muted-foreground space-y-1">
      <div className="flex items-start gap-2">
        <span className="font-medium">{entityType} context:</span>
        <span className="flex-1">Last note: {note}</span>
      </div>
      <Button
        variant="link"
        size="sm"
        onClick={onViewNotes}
        className="h-auto p-0 text-xs font-normal underline"
      >
        View notes
      </Button>
    </div>
  );
};

export default NoteDisplay;

