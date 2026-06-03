import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Image as ImageIcon, Save, X, Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { PlotNote } from "@/types/plotNote";
import { useToast } from "@/hooks/use-toast";

// Mock data - in production, fetch from database
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
];

const EditNotePage = () => {
  const navigate = useNavigate();
  const { projectId, plotId, noteId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNewNote = noteId === "new";
  const returnTo = searchParams.get("from") || "plot"; // "plot" or "list"

  // Find existing note or create empty one
  const existingNote = mockPlotNotes.find((n) => n.id === noteId);

  const [content, setContent] = useState(existingNote?.content || "");
  const [images, setImages] = useState<string[]>(existingNote?.images || []);
  const [noteDate] = useState(existingNote?.createdAt || new Date());

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > 5000;

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

  const handleGoBack = () => {
    if (returnTo === "list") {
      const dateStr = format(noteDate, "yyyy-MM-dd");
      navigate(`/projects/${projectId}/notes?date=${dateStr}`);
    } else {
      navigate(`/projects/${projectId}/plot/${plotId}`);
    }
  };

  const handleSave = () => {
    if (!content.trim()) {
      toast({ title: "Please add some content", variant: "destructive" });
      return;
    }
    if (isOverLimit) {
      toast({ title: "Content exceeds 5000 words", variant: "destructive" });
      return;
    }

    // In production, save to database
    toast({ title: isNewNote ? "Note created" : "Note updated" });
    handleGoBack();
  };

  const handleDelete = () => {
    // In production, delete from database
    toast({ title: "Note deleted" });
    handleGoBack();
  };

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In a real app, this would upload to storage
      const newImages = Array.from(files).map(
        () =>
          `https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=300&h=300&fit=crop`
      );
      setImages((prev) => [...prev, ...newImages]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center`}>
              <span className="text-xs font-bold text-white">{plotId}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isNewNote ? "New Note" : "Edit Note"}
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={10} />
                <span>{format(noteDate, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNewNote && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={20} className="text-destructive" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isOverLimit || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </section>

        {/* Note Content */}
        <section className="glass-card p-4 space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your observations here...

Use bullet points for easy reading:
• Observation 1
• Observation 2
• Measurement data"
            className="w-full min-h-[250px] bg-secondary/50 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {wordCount.toLocaleString()}/5,000 words
            </span>
          </div>
        </section>

        {/* Photos Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Photos ({images.length})
            </h2>
            <button
              onClick={handleAddPhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-sm"
            >
              <Plus size={14} />
              Add Photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl bg-secondary overflow-hidden group"
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  {/* Always visible delete indicator on mobile */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent md:hidden">
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-white"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={handleAddPhoto}
              className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <ImageIcon size={28} className="opacity-50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Add photos</p>
                <p className="text-xs mt-1">Tap to attach images to this note</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EditNotePage;
