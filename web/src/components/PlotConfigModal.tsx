import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface PlotData {
  id: string;
  customName: string;
  replication: number;
  treatment: number;
}

interface PlotConfigModalProps {
  open: boolean;
  onClose: () => void;
  plot: PlotData | null;
  replications: number;
  treatments: number;
  onSave: (plot: PlotData) => void;
}

export const PlotConfigModal = ({
  open,
  onClose,
  plot,
  replications,
  treatments,
  onSave,
}: PlotConfigModalProps) => {
  const [customName, setCustomName] = useState("");
  const [selectedReplication, setSelectedReplication] = useState(1);
  const [selectedTreatment, setSelectedTreatment] = useState(1);

  useEffect(() => {
    if (plot) {
      setCustomName(plot.customName);
      setSelectedReplication(plot.replication);
      setSelectedTreatment(plot.treatment);
    }
  }, [plot]);

  const handleSave = () => {
    if (!plot) return;
    onSave({
      id: plot.id,
      customName,
      replication: selectedReplication,
      treatment: selectedTreatment,
    });
    onClose();
  };

  if (!plot) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-4 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Configure Plot</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Plot Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Plot Name (optional)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={plot.id}
              className="w-full bg-secondary/50 rounded-xl p-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: {plot.id}
            </p>
          </div>

          {/* Replication Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Replication
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: replications }, (_, i) => i + 1).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReplication(r)}
                  className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedReplication === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  R{r}
                </button>
              ))}
            </div>
          </div>

          {/* Treatment Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Treatment
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: treatments }, (_, i) => i + 1).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTreatment(t)}
                  className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedTreatment === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 rounded-xl">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
