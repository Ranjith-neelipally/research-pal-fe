import { useNavigate } from "react-router-dom";

interface PlotGridProps {
  projectId: string;
  replications: number;
  treatments: number;
  plots?: Array<{
    id: string;
    title: string;
    color?: string;
    replication: number;
    treatment: number;
    plotIndex?: number[];
    persisted?: boolean;
  }>;
}

const plotColors = [
  "bg-plot-1/20 border-plot-1/50 text-plot-1",
  "bg-plot-2/20 border-plot-2/50 text-plot-2",
  "bg-plot-3/20 border-plot-3/50 text-plot-3",
  "bg-plot-4/20 border-plot-4/50 text-plot-4",
  "bg-plot-5/20 border-plot-5/50 text-plot-5",
  "bg-plot-6/20 border-plot-6/50 text-plot-6",
];

const isHexColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color);

const getPlotColorStyles = (color?: string) => {
  if (!color) return undefined;

  if (isHexColor(color)) {
    return {
      backgroundColor: `${color}50`,
      borderColor: color,
      color: "#fff",
    };
  }

  if (color.startsWith("hsl(") || color.startsWith("oklch(") || color.startsWith("rgb(")) {
    return {
      backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)`,
      borderColor: color,
      color,
    };
  }

  return {
    backgroundColor: `hsl(${color} / 0.2)`,
    borderColor: `hsl(${color} / 0.5)`,
    color: `hsl(${color})`,
  };
};

export const PlotGrid = ({ projectId, replications, treatments, plots: providedPlots }: PlotGridProps) => {
  const navigate = useNavigate();
  const columnCount = Math.max(1, treatments);
  
  const plots = providedPlots && providedPlots.length > 0 ? providedPlots : [];
  if (plots.length === 0) {
    for (let r = 1; r <= replications; r++) {
      for (let t = 1; t <= treatments; t++) {
        plots.push({
          id: `R${r}_T${t}`,
          title: `R${r}_T${t}`,
          replication: r,
          treatment: t,
          persisted: false,
        });
      }
    }
  }
  const indexedPlots = plots.some((plot) => Array.isArray(plot.plotIndex))
    ? Array.from({ length: Math.max(0, replications * treatments) }, (_, index) => {
        const row = Math.floor(index / columnCount) + 1;
        const col = (index % columnCount) + 1;
        return plots.find(
          (plot) => plot.plotIndex?.[0] === row && plot.plotIndex?.[1] === col,
        );
      }).filter((plot): plot is (typeof plots)[number] => Boolean(plot))
    : plots;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{replications} Replications</span>
        <span>{treatments} Treatments</span>
      </div>
      
      <div className="overflow-x-auto">
        <div 
          className="grid w-fit max-w-full gap-2"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, clamp(60px, 26vw, 88px))`,
          }}
        >
          {indexedPlots.map((plot) => {
            const colorClass = plotColors[(plot.treatment - 1) % plotColors.length];
            const canOpenNotes = plot.persisted !== false;
            const colorStyles = getPlotColorStyles(plot.color);

            return (
              <button
                key={plot.id}
                onClick={() => {
                  if (!canOpenNotes) return;
                  navigate(`/projects/${projectId}/plot/${plot.id}?plotTitle=${encodeURIComponent(plot.title)}`);
                }}
                disabled={!canOpenNotes}
                className={`plot-cell border-2 text-xs ${colorClass}`}
                style={colorStyles}
              >
                <span className="w-full truncate px-1 text-center">{plot.title}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {Array.from({ length: treatments }, (_, i) => {
          const treatment = i + 1;
          const plot = indexedPlots.find((item) => item.treatment === treatment);
          const legendColor = plot?.color;

          return (
            <div key={treatment} className="flex items-center gap-1.5 text-xs">
              <div
                className={`h-3 w-3 rounded-sm ${legendColor ? "" : plotColors[i % plotColors.length].split(" ")[0]}`}
                style={legendColor ? { backgroundColor: legendColor } : undefined}
              />
              <span className="text-muted-foreground">T{treatment}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
