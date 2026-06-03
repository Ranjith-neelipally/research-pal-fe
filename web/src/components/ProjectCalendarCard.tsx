import { Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ProjectCalendarCardProps {
  datesWithNotes: Date[];
  notesCount: number;
  onClick: () => void;
}

export const ProjectCalendarCard = ({
  datesWithNotes,
  notesCount,
  onClick,
}: ProjectCalendarCardProps) => {
  const latestDate = datesWithNotes.length > 0 
    ? datesWithNotes.sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full glass-card p-4 text-left hover:bg-secondary/50 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Notes Calendar
            </h3>
            <p className="text-xs text-muted-foreground">
              {notesCount} notes across {datesWithNotes.length} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latestDate && (
            <span className="text-xs text-muted-foreground">
              Latest: {format(latestDate, "MMM d")}
            </span>
          )}
          <ChevronRight 
            size={16} 
            className="text-muted-foreground group-hover:text-foreground transition-colors" 
          />
        </div>
      </div>
    </button>
  );
};
