import { useState } from "react";
import { PlotConfigModal } from "./PlotConfigModal";
import { Palette, Lock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PlotData {
  id: string;
  customName: string;
  replication: number;
  treatment: number;
}

interface TreatmentColor {
  treatment: number;
  color: string;
}

interface CreatePlotGridProps {
  replications: number;
  treatments: number;
  plots: PlotData[];
  onPlotsChange: (plots: PlotData[]) => void;
  treatmentColors: TreatmentColor[];
  onTreatmentColorsChange: (colors: TreatmentColor[]) => void;
}

// 10 visually distinct colors for treatments - scientific-safe palette
const TREATMENT_COLORS = [
  { name: "Emerald", value: "142 55% 42%" },
  { name: "Ocean", value: "199 80% 50%" },
  { name: "Violet", value: "262 60% 55%" },
  { name: "Rose", value: "330 70% 55%" },
  { name: "Amber", value: "45 90% 55%" },
  { name: "Coral", value: "16 85% 55%" },
  { name: "Cyan", value: "185 80% 50%" },
  { name: "Indigo", value: "230 65% 55%" },
  { name: "Lime", value: "85 70% 45%" },
  { name: "Magenta", value: "295 65% 55%" },
];

// Default colors for treatments (all 10 unique)
const DEFAULT_TREATMENT_COLORS = TREATMENT_COLORS.map((c) => c.value);

export const CreatePlotGrid = ({
  replications,
  treatments,
  plots,
  onPlotsChange,
  treatmentColors,
  onTreatmentColorsChange,
}: CreatePlotGridProps) => {
  const [selectedPlot, setSelectedPlot] = useState<PlotData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlotClick = (plot: PlotData) => {
    setSelectedPlot(plot);
    setIsModalOpen(true);
  };

  const handlePlotSave = (updatedPlot: PlotData) => {
    const newPlots = plots.map((p) =>
      p.id === updatedPlot.id ? updatedPlot : p
    );
    onPlotsChange(newPlots);
  };

  const getTreatmentColor = (treatment: number) => {
    const colorConfig = treatmentColors.find((c) => c.treatment === treatment);
    return colorConfig?.color || DEFAULT_TREATMENT_COLORS[(treatment - 1) % DEFAULT_TREATMENT_COLORS.length];
  };

  // Get all currently used colors (excluding the treatment being edited)
  const getUsedColors = (excludeTreatment?: number) => {
    const usedColors: string[] = [];
    for (let t = 1; t <= treatments; t++) {
      if (t !== excludeTreatment) {
        usedColors.push(getTreatmentColor(t));
      }
    }
    return usedColors;
  };

  const handleColorChange = (treatment: number, color: string) => {
    // Prevent selecting already used color
    const usedColors = getUsedColors(treatment);
    if (usedColors.includes(color)) {
      return; // Color already in use
    }

    const existingIndex = treatmentColors.findIndex(
      (c) => c.treatment === treatment
    );

    if (existingIndex >= 0) {
      const newColors = [...treatmentColors];
      newColors[existingIndex] = { treatment, color };
      onTreatmentColorsChange(newColors);
    } else {
      onTreatmentColorsChange([...treatmentColors, { treatment, color }]);
    }
  };

  const isColorUsed = (color: string, currentTreatment: number) => {
    const usedColors = getUsedColors(currentTreatment);
    return usedColors.includes(color);
  };

  return (
    <div className="space-y-4">
      {/* Treatment Color Controls */}
      <div className="glass-card p-3">
        <p className="text-xs text-muted-foreground mb-2">Treatment Colors</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: treatments }, (_, i) => i + 1).map((t) => {
            const color = getTreatmentColor(t);
            return (
              <Popover key={t}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: `hsl(${color})` }}
                    />
                    <span className="text-xs text-foreground font-medium">T{t}</span>
                    <Palette size={12} className="text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-popover border-border" align="start">
                  <p className="text-xs text-muted-foreground mb-2">
                    Select color for T{t}
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TREATMENT_COLORS.map((c) => {
                      const isUsed = isColorUsed(c.value, t);
                      const isSelected = color === c.value;
                      return (
                        <button
                          key={c.value}
                          onClick={() => !isUsed && handleColorChange(t, c.value)}
                          disabled={isUsed}
                          className={`w-7 h-7 rounded-full transition-transform relative ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-popover"
                              : isUsed
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: `hsl(${c.value})` }}
                          title={isUsed ? `${c.name} (in use)` : c.name}
                        >
                          {isUsed && !isSelected && (
                            <Lock
                              size={10}
                              className="absolute inset-0 m-auto text-white drop-shadow-md"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Locked colors are used by other treatments
                  </p>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      {/* Grid Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{replications} Replications</span>
        <span>{treatments} Treatments</span>
      </div>

      {/* Interactive Plot Grid */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${treatments}, minmax(0, 1fr))`,
        }}
      >
        {plots.map((plot) => {
          const color = getTreatmentColor(plot.treatment);
          const displayName = plot.customName || plot.id;

          return (
            <button
              key={plot.id}
              onClick={() => handlePlotClick(plot)}
              className="plot-cell border-2 transition-all hover:scale-105"
              style={{
                backgroundColor: `hsl(${color} / 0.2)`,
                borderColor: `hsl(${color} / 0.5)`,
                color: `hsl(${color})`,
              }}
            >
              <span className="text-[10px] font-semibold truncate px-1">
                {displayName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4">
        {Array.from({ length: treatments }, (_, i) => i + 1).map((t) => {
          const color = getTreatmentColor(t);
          return (
            <div key={t} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `hsl(${color} / 0.5)` }}
              />
              <span className="text-muted-foreground">T{t}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tap any plot to configure
      </p>

      {/* Plot Config Modal */}
      <PlotConfigModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plot={selectedPlot}
        replications={replications}
        treatments={treatments}
        onSave={handlePlotSave}
      />
    </div>
  );
};
