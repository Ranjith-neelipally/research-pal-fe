import { useEffect, useMemo, useState } from "react";
import { BookOpen, Calendar } from "lucide-react";
import { IdeaCard } from "@/components/IdeaCard";
import type { Idea } from "@/components/IdeaCard";
import { FloatingAdd } from "@/components/FloatingAdd";
import { CreateIdeaModal } from "@/components/CreateIdeaModal";
import { EmptyState } from "@/components/EmptyState";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { createIdea, fetchIdeas, selectIdeas, selectIdeasStatus } from "@/store/ideas";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";

const DiaryPage = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const ideaEntities = useAppSelector(selectIdeas);
  const status = useAppSelector(selectIdeasStatus);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const entries = useMemo<Idea[]>(
    () =>
      ideaEntities.map((idea) => ({
        id: idea.id,
        content: idea.content,
        createdAt: new Date(idea.createdAt),
      })),
    [ideaEntities],
  );

  useEffect(() => {
    dispatch(fetchIdeas({ limit: 100 }));
  }, [dispatch]);

  const handleCreateEntry = async (content: string) => {
    try {
      await dispatch(createIdea({ content, date: new Date().toISOString() })).unwrap();
      toast({ title: "Idea saved" });
    } catch (error) {
      toast({
        title: "Idea save failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
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
        {status === "loading" ? (
          <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading ideas...
          </div>
        ) : entries.length === 0 ? (
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
