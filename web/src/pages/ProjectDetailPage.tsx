import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { PlotGrid } from "@/components/PlotGrid";
import { CalendarModal } from "@/components/CalendarModal";
import { format, startOfDay } from "date-fns";
import type { PlotNote } from "@/types/plotNote";

// Mock project data
const mockProject = {
  id: "1",
  name: "Wheat Drought Tolerance Study",
  location: "Field Station A, Block 3",
  replications: 4,
  treatments: 5,
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  notesCount: 23,
};

// Mock plot notes for this project
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

const ProjectDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project] = useState(mockProject);
  const [plotNotes] = useState<PlotNote[]>(initialPlotNotes);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date) => {
    // Navigate to the notes list page for this date
    const dateStr = format(date, "yyyy-MM-dd");
    navigate(`/projects/${id}/notes?date=${dateStr}`);
  };

  // Get unique dates that have plot notes for this project
  const datesWithNotes = [...new Set(
    plotNotes.map(note => startOfDay(note.createdAt).getTime())
  )].map(timestamp => new Date(timestamp));

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card p-4">
          <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} />
            <span>{project.location}</span>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 stagger-item" style={{ animationDelay: "50ms" }}>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {project.replications * project.treatments}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Plots</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{plotNotes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Notes</p>
          </div>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="glass-card p-3 text-center hover:bg-secondary/50 active:scale-95 transition-all group relative"
          >
            <div className="flex items-center justify-center">
              <Calendar size={24} className="text-primary group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">View Notes</p>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </button>
        </div>

        {/* Plot Grid */}
        <section className="stagger-item" style={{ animationDelay: "200ms" }}>
          <h2 className="text-base font-semibold text-foreground mb-4">
            Plot Layout
          </h2>
          <div className="glass-card p-4">
            <PlotGrid
              projectId={project.id}
              replications={project.replications}
              treatments={project.treatments}
            />
          </div>
        </section>

        {/* Instructions */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Tap any plot to view or add notes
          </p>
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelectDate={handleDateSelect}
        datesWithNotes={datesWithNotes}
      />
    </div>
  );
};

export default ProjectDetailPage;
