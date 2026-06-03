import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image as ImageIcon, Plus, Calendar, FileText, Trash2, Edit2 } from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import type { PlotNote, NotesByDate } from "@/types/plotNote";
import { useToast } from "@/hooks/use-toast";

// Mock data - multiple notes per plot, grouped by date
const mockPlotNotes: PlotNote[] = [
  {
    id: "1",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R1_T1",
    content: `• Initial germination observed
• 85% of seeds have sprouted
• Healthy green color visible

• Applied treatment as per schedule
• Weather conditions favorable
• Soil moisture at 45%`,
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=300&h=300&fit=crop",
    ],
    createdAt: new Date(),
    lastUpdated: new Date(),
  },
  {
    id: "2",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R1_T1",
    content: `• Second observation for today
• Noticed minor pest activity on leaves
• Applied organic pesticide as preventive measure`,
    images: [],
    createdAt: new Date(),
    lastUpdated: new Date(),
  },
  {
    id: "3",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R1_T1",
    content: `• Height measurements taken
• Average height 12.5cm
• Some variation in western corner of plot`,
    images: [
      "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=300&h=300&fit=crop",
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R1_T1",
    content: `• Initial soil preparation completed
• pH levels measured at 6.8
• Ready for planting`,
    images: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const PlotNotesPage = () => {
  const navigate = useNavigate();
  const { projectId, plotId } = useParams();
  const { toast } = useToast();

  // Filter notes for this specific plot
  const [plotNotes, setPlotNotes] = useState<PlotNote[]>(
    mockPlotNotes.filter((note) => note.plotId === plotId)
  );

  // Group notes by date (latest first)
  const notesByDate = useMemo<NotesByDate[]>(() => {
    const grouped = new Map<number, PlotNote[]>();

    plotNotes.forEach((note) => {
      const dayStart = startOfDay(note.createdAt).getTime();
      const existing = grouped.get(dayStart) || [];
      grouped.set(dayStart, [...existing, note]);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b - a)
      .map(([timestamp, notes]) => ({
        date: new Date(timestamp),
        notes: notes.sort(
          (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
        ),
      }));
  }, [plotNotes]);

  const plotColors: Record<string, string> = {
    T1: "bg-plot-1",
    T2: "bg-plot-2",
    T3: "bg-plot-3",
    T4: "bg-plot-4",
    T5: "bg-plot-5",
    T6: "bg-plot-6",
  };

  const getTreatmentFromPlotId = (id: string) => {
    const match = id.match(/T(\d+)/);
    return match ? `T${match[1]}` : "T1";
  };

  const treatment = getTreatmentFromPlotId(plotId || "");
  const colorClass = plotColors[treatment] || "bg-plot-1";

  const handleAddNote = () => {
    navigate(`/projects/${projectId}/plot/${plotId}/note/new`);
  };

  const handleEditNote = (noteId: string) => {
    navigate(`/projects/${projectId}/plot/${plotId}/note/${noteId}?from=plot`);
  };

  const handleDeleteNote = (noteId: string) => {
    setPlotNotes((prev) => prev.filter((note) => note.id !== noteId));
    toast({ title: "Note deleted" });
  };

  const formatDateHeader = (date: Date) => {
    const today = startOfDay(new Date());
    const noteDate = startOfDay(date);

    if (isSameDay(today, noteDate)) {
      return "Today";
    }
    if (isSameDay(new Date(today.getTime() - 86400000), noteDate)) {
      return "Yesterday";
    }
    return format(date, "EEEE, MMM d");
  };

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center`}>
              <span className="text-xs font-bold text-white">{plotId}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Plot {plotId}</h2>
              <p className="text-xs text-muted-foreground">
                {plotNotes.length} {plotNotes.length === 1 ? "note" : "notes"}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={16} />
            Add Note
          </button>
        </section>

        {/* Notes grouped by date */}
        {notesByDate.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">No notes for this plot</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap "Add Note" to create your first observation
            </p>
          </div>
        ) : (
          notesByDate.map((group, groupIdx) => (
            <section key={group.date.getTime()} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80">
                  <Calendar size={12} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    {formatDateHeader(group.date)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {group.notes.length}{" "}
                    {group.notes.length === 1 ? "note" : "notes"}
                  </span>
                </div>
              </div>

              {/* Notes for this date */}
              {group.notes.map((note, idx) => (
                <div
                  key={note.id}
                  className="glass-card p-4 space-y-3 stagger-item"
                  style={{ animationDelay: `${(groupIdx * 3 + idx) * 50}ms` }}
                >
                  {/* Note Header with Indicators */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(note.lastUpdated, "h:mm a")}
                      </span>
                      {note.images.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <ImageIcon size={10} />
                          {note.images.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Note Content Preview */}
                  <div
                    onClick={() => handleEditNote(note.id)}
                    className="cursor-pointer hover:bg-secondary/30 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {truncateContent(note.content)}
                    </p>
                  </div>

                  {/* Photos */}
                  {note.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {note.images.slice(0, 4).map((img, imgIdx) => (
                        <div
                          key={imgIdx}
                          className="aspect-square rounded-lg bg-secondary overflow-hidden"
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {note.images.length > 4 && (
                        <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                          +{note.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => handleEditNote(note.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      <Edit2 size={14} />
                      Edit Note
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default PlotNotesPage;
