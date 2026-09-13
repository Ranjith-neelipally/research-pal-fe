import { useEffect, useState } from "react";
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
import {
  createIdea,
  editIdea,
  fetchIdeas,
  removeIdea,
  selectIdeaDates,
  selectIdeas,
  selectIdeasStatus,
} from "@/store/ideas";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { validateRequiredMaxLength } from "@/utils/apiValidation";

const HomePage = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const ideaEntities = useAppSelector(selectIdeas);
  const availableDates = useAppSelector(selectIdeaDates);
  const ideasStatus = useAppSelector(selectIdeasStatus);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDateNoteOpen, setIsDateNoteOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateNote, setDateNote] = useState("");
  const [selectedIdeaDate, setSelectedIdeaDate] = useState<string | null>(null);
  const [dateNoteError, setDateNoteError] = useState("");
  const today = selectedDate;
  const ideas: Idea[] = ideaEntities.map((idea) => ({
    id: idea.id,
    content: idea.content,
    createdAt: new Date(idea.createdAt),
  }));

  useEffect(() => {
    dispatch(fetchIdeas({ limit: 100 }));
  }, [dispatch]);

  const selectIdeaDate = (date: string) => {
    setSelectedIdeaDate(date);
    dispatch(fetchIdeas({ date, limit: 100 }));
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await dispatch(removeIdea(id)).unwrap();
      toast({ title: "Idea deleted" });
    } catch (error) {
      toast({
        title: "Idea deletion failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleCreateIdea = async (content: string) => {
    try {
      if (editingIdea) {
        await dispatch(editIdea({ id: editingIdea.id, content })).unwrap();
        toast({ title: "Idea updated" });
        setEditingIdea(null);
        return;
      }

      await dispatch(createIdea({ content, date: new Date().toISOString() })).unwrap();
      toast({ title: "Idea saved" });
    } catch (error) {
      toast({
        title: editingIdea ? "Idea update failed" : "Idea save failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingIdea(null);
  };

  const handleSaveDateNote = async () => {
    const trimmedNote = dateNote.trim();
    const validationError = validateRequiredMaxLength(trimmedNote, 1000, "Idea content");

    if (validationError) {
      setDateNoteError(validationError);
      return;
    }

    const createdAt = new Date(selectedDate);
    const now = new Date();
    createdAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    try {
      await dispatch(createIdea({ content: trimmedNote, date: createdAt.toISOString() })).unwrap();
      setDateNote("");
      setDateNoteError("");
      setIsDateNoteOpen(false);
      toast({ title: "Idea saved" });
    } catch (error) {
      toast({
        title: "Idea save failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
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
          <div className="flex flex-wrap gap-2">
            {availableDates.length === 0 ? (
              <span className="text-sm text-muted-foreground">No idea dates available.</span>
            ) : availableDates.map((date) => (
              <button
                key={date}
                onClick={() => selectIdeaDate(date)}
                className={[
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  selectedIdeaDate === date
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {format(new Date(`${date}T00:00:00`), "MMM d, yyyy")}
              </button>
            ))}
          </div>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent ideas
            {selectedIdeaDate
              ? ` - ${format(new Date(`${selectedIdeaDate}T00:00:00`), "MMM d, yyyy")}`
              : ""}
          </h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {!selectedIdeaDate ? (
              <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Select a date to view its ideas.
              </div>
            ) : ideasStatus === "loading" ? (
              <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Loading ideas...
              </div>
            ) : ideas.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
                No ideas exist for this date.
              </div>
            ) : ideas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => {
                  setEditingIdea(idea);
                  setIsCreateModalOpen(true);
                }}
                className="cursor-pointer rounded-3xl border border-border bg-card p-5 text-left transition-colors hover:bg-surface-elevated"
              >
                <div className="text-xs text-muted-foreground">
                  {format(idea.createdAt, "MMM d · h:mm a")}
                </div>
                <p className="mt-4 text-sm font-medium leading-6 text-foreground">{idea.content}</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteIdea(idea.id);
                  }}
                  className="mt-4 text-xs font-medium text-destructive"
                >
                  Delete
                </button>
              </div>
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
                onChange={(event) => {
                  setDateNote(event.target.value);
                  if (dateNoteError) setDateNoteError("");
                }}
                placeholder="Write a quick observation for this date..."
                className="min-h-40 resize-none rounded-2xl"
              />
              {dateNoteError && <p className="text-sm text-destructive">{dateNoteError}</p>}
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
