import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
  datesWithNotes?: Date[];
}

export const CalendarModal = ({
  isOpen,
  onClose,
  onSelectDate,
  selectedDate,
  datesWithNotes = [],
}: CalendarModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with empty cells for proper grid alignment
  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const hasNotes = (date: Date) => 
    datesWithNotes.some(d => isSameDay(d, date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-5 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} className="text-muted-foreground" />
          </button>
          
          <h3 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronRight size={20} className="text-muted-foreground" />
          </button>
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div key={idx} className="text-center text-xs text-muted-foreground font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="aspect-square" />;
            }
            
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayHasNotes = hasNotes(day);
            const isDisabled = !dayHasNotes;
            
            return (
              <button
                key={idx}
                onClick={() => {
                  if (!isDisabled) {
                    onSelectDate(day);
                    onClose();
                  }
                }}
                disabled={isDisabled}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all duration-200 ${
                  isDisabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : isToday && dayHasNotes
                    ? "bg-secondary text-foreground"
                    : "hover:bg-secondary/50"
                }`}
              >
                <span className={isSelected ? "font-semibold" : ""}>
                  {format(day, "d")}
                </span>
                {dayHasNotes && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
