import { useState } from "react";
import { BookOpen, Calendar } from "lucide-react";
import { IdeaCard } from "@/components/IdeaCard";
import type { Idea } from "@/components/IdeaCard";
import { FloatingAdd } from "@/components/FloatingAdd";
import { CreateIdeaModal } from "@/components/CreateIdeaModal";
import { EmptyState } from "@/components/EmptyState";
import { format, isToday, isYesterday, startOfDay } from "date-fns";

// Mock data with diary entries
const mockEntries: Idea[] = [
  {
    id: "1",
    content: "Morning field visit completed. All plots showing healthy growth. Noted slight yellowing in R3 area - possible drainage issue. Will monitor closely.",
    createdAt: new Date(),
    images: [
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=200&h=200&fit=crop",
    ],
  },
  {
    id: "2",
    content: "Data collection for week 6 completed. All measurements recorded. Preparing summary report for team meeting tomorrow.",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: "3",
    content: "Irrigation system maintenance. Replaced two drip lines in Section B. System pressure now optimal at 15 PSI.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop",
    ],
  },
  {
    id: "4",
    content: "Weather station calibration complete. Temperature sensors reading accurately. Humidity sensor replaced.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    content: "Team meeting notes: Discussed preliminary results. Decision to extend observation period by 2 weeks due to delayed germination in control group.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const DiaryPage = () => {
  const [entries, setEntries] = useState<Idea[]>(mockEntries);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateEntry = (content: string) => {
    const newEntry: Idea = {
      id: Date.now().toString(),
      content,
      createdAt: new Date(),
    };
    setEntries([newEntry, ...entries]);
  };

  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    const dateKey = startOfDay(entry.createdAt).getTime();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(entry);
    return groups;
  }, {} as Record<number, Idea[]>);

  const getDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMM d");
  };

  const sortedDates = Object.keys(groupedEntries)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="mobile-container bg-background">
      <div className="safe-bottom px-4 py-6 space-y-6">
        {/* Entries List */}
        {entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No diary entries"
            description="Document your daily research activities, observations, and progress here."
            action={{
              label: "Add Entry",
              onClick: () => setIsCreateModalOpen(true),
            }}
          />
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey, groupIdx) => (
              <section 
                key={dateKey} 
                className="stagger-item"
                style={{ animationDelay: `${groupIdx * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {getDateLabel(dateKey)}
                  </h3>
                </div>
                <div className="space-y-3 pl-5 border-l-2 border-border">
                  {groupedEntries[dateKey].map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="stagger-item"
                      style={{ animationDelay: `${(groupIdx * 100) + (idx * 50)}ms` }}
                    >
                      <IdeaCard idea={entry} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <FloatingAdd onClick={() => setIsCreateModalOpen(true)} label="Add diary entry" />

      {/* Create Modal */}
      <CreateIdeaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEntry}
        maxWords={200}
      />
    </div>
  );
};

export default DiaryPage;
