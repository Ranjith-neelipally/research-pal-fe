import { useState } from "react";
import { CalendarDays, CloudSun } from "lucide-react";
import { format } from "date-fns";
import { FloatingAdd } from "@/components/FloatingAdd";
import { CreateIdeaModal } from "@/components/CreateIdeaModal";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Idea } from "@/components/IdeaCard";
import { useToast } from "@/hooks/use-toast";

const mockIdeas: Idea[] = [
  {
    id: "1",
    content:
      "Wheat tillers appear denser on north-facing rows. Consider light angle as a factor next cycle.",
    createdAt: new Date(2026, 5, 1, 9, 37),
  },
  {
    id: "2",
    content: "Soil moisture meter reads 22% near plot R2_T3 after morning irrigation.",
    createdAt: new Date(2026, 4, 31, 10, 37),
  },
];

const HomePage = () => {
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>(mockIdeas);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDateNoteOpen, setIsDateNoteOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateNote, setDateNote] = useState("");
  const today = selectedDate;

  const handleCreateIdea = (content: string) => {
    if (editingIdea) {
      setIdeas((currentIdeas) =>
        currentIdeas.map((idea) => (idea.id === editingIdea.id ? { ...idea, content } : idea)),
      );
      toast({ title: "Idea updated" });
      setEditingIdea(null);
      return;
    }

    setIdeas((currentIdeas) => [
      {
        id: Date.now().toString(),
        content,
        createdAt: new Date(),
      },
      ...currentIdeas,
    ]);
    toast({ title: "Idea saved" });
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingIdea(null);
  };

  const handleSaveDateNote = () => {
    const trimmedNote = dateNote.trim();

    if (!trimmedNote) {
      toast({ title: "Add a note before saving", variant: "destructive" });
      return;
    }

    const createdAt = new Date(selectedDate);
    const now = new Date();
    createdAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    setIdeas((currentIdeas) => [
      {
        id: Date.now().toString(),
        content: trimmedNote,
        createdAt,
      },
      ...currentIdeas,
    ]);
    setDateNote("");
    setIsDateNoteOpen(false);
    toast({ title: "Idea saved" });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-10 px-6 py-10 md:px-10">
        <section className="grid gap-6 xl:grid-cols-[minmax(320px,512px)_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(today, "EEEE")}
                </div>
                <div className="mt-6">
                  <div className="text-5xl font-semibold leading-none tracking-tight">
                    {format(today, "d")}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {format(today, "MMMM yyyy")}
                  </div>
                </div>
              </div>

              <div className="flex min-h-28 flex-col items-end justify-between text-right">
                <CloudSun className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-3xl font-light text-foreground">22°</div>
                  <div className="mt-1 text-xs text-muted-foreground">Partly cloudy · Davis, CA</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsDateNoteOpen(true)}
              className="mt-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Tap to browse a date →
            </button>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Quick capture
                </div>
                <h2 className="mt-2 text-lg font-semibold text-foreground">
                  A small idea, in 200 words
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
              >
                New idea
              </button>
            </div>
            <p className="mt-6 max-w-5xl text-sm leading-7 text-muted-foreground">
              Short. Specific. Searchable. Use this for fleeting thoughts during fieldwork:
              hypotheses, anomalies, things to revisit. Longer write-ups belong inside a project's
              plot notes.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent ideas
          </h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {ideas.map((idea) => (
              <button
                key={idea.id}
                onClick={() => {
                  setEditingIdea(idea);
                  setIsCreateModalOpen(true);
                }}
                className="rounded-3xl border border-border bg-card p-5 text-left transition-colors hover:bg-surface-elevated"
              >
                <div className="text-xs text-muted-foreground">
                  {format(idea.createdAt, "MMM d · h:mm a")}
                </div>
                <p className="mt-4 text-sm font-medium leading-6 text-foreground">{idea.content}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <FloatingAdd onClick={() => setIsCreateModalOpen(true)} label="Add idea" />

      <CreateIdeaModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateIdea}
        maxWords={200}
        editingIdea={editingIdea}
      />

      <Dialog open={isDateNoteOpen} onOpenChange={setIsDateNoteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Add note for a date</DialogTitle>
            <DialogDescription>
              Pick a fieldwork date, add a short note, and save it to Recent ideas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border border-border bg-card">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                className="rounded-2xl"
              />
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Selected date
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {format(selectedDate, "EEEE, MMM d, yyyy")}
                </div>
              </div>
              <Textarea
                value={dateNote}
                onChange={(event) => setDateNote(event.target.value)}
                placeholder="Write a quick observation for this date..."
                className="min-h-40 resize-none rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDateNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDateNote}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
