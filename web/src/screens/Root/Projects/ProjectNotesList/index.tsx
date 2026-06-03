import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Image as ImageIcon, Trash2, Edit2, FileText, Calendar } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PlotNote } from "@/types/plotNote";

// Mock plot notes - in production, fetch from database based on projectId
const initialPlotNotes: PlotNote[] = [
  {
    id: "1",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R1_T1",
    content: "Initial germination observed. 85% of seeds have sprouted. Healthy green color visible. Applied treatment as per schedule.",
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop",
    ],
    createdAt: new Date(),
    lastUpdated: new Date(),
  },
  {
    id: "2",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R2_T3",
    content: "Height measurements taken. Average height 12.5cm. Some variation in western corner of plot. Will monitor closely.",
    images: [],
    createdAt: new Date(),
    lastUpdated: new Date(),
  },
  {
    id: "3",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R1_T2",
    content: "Soil moisture at optimal levels after yesterday's rain. Weather conditions favorable for growth.",
    images: [
      "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=300&h=300&fit=crop",
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "4",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R3_T1",
    content: "Noted slight yellowing in R3 area - possible drainage issue. Will monitor closely over next week.",
    images: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    projectId: "1",
    projectName: "Wheat Drought Tolerance Study",
    plotId: "R2_T4",
    content: "Cross-pollination experiment results recorded. Initial findings suggest higher success rate than anticipated.",
    images: [
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=300&h=300&fit=crop",
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const ProjectNotesListPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? parseISO(dateParam) : new Date();
  
  const [plotNotes, setPlotNotes] = useState<PlotNote[]>(initialPlotNotes);

  // Filter notes for the selected date and project
  const notesForDate = useMemo(() => 
    plotNotes.filter((note) =>
      note.projectId === projectId && isSameDay(note.createdAt, selectedDate)
    ),
    [plotNotes, projectId, selectedDate]
  );

  const handleEditNote = (note: PlotNote) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    navigate(`/projects/${note.projectId}/plot/${note.plotId}/note/${note.id}?from=list`);
  };

  const handleDeleteNote = (noteId: string) => {
    setPlotNotes(prev => prev.filter(note => note.id !== noteId));
    toast({ title: "Note deleted" });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

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

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card flex items-center gap-3 p-4">
          <Calendar size={18} className="text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {format(selectedDate, "EEEE, MMM d")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {notesForDate.length} {notesForDate.length === 1 ? "note" : "notes"} across all plots
            </p>
          </div>
        </section>

        {/* Notes List */}
        <div className="space-y-3">
          {notesForDate.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">No notes for this date</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select another date from the calendar
              </p>
            </div>
          ) : (
            notesForDate.map((note, idx) => {
              const treatment = getTreatmentFromPlotId(note.plotId);
              const colorClass = plotColors[treatment] || "bg-plot-1";

              return (
                <div
                  key={note.id}
                  className="glass-card p-4 space-y-3 stagger-item"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Note Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-xs font-bold text-white">
                          {note.plotId}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {note.projectName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Text indicator */}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText size={10} />
                            📝
                          </span>
                          {/* Photo indicator */}
                          {note.images.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              <ImageIcon size={10} />
                              📷 {note.images.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(note.lastUpdated, "h:mm a")}
                    </span>
                  </div>

                  {/* Note Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {truncateContent(note.content)}
                  </p>

                  {/* Photo Thumbnails */}
                  {note.images.length > 0 && (
                    <div className="flex gap-1.5">
                      {note.images.slice(0, 4).map((img, imgIdx) => (
                        <div
                          key={imgIdx}
                          className="w-12 h-12 rounded-lg bg-secondary overflow-hidden"
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {note.images.length > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                          +{note.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => handleEditNote(note)}
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectNotesListPage;
