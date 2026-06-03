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

export const PlotGrid = ({ projectId, replications, treatments, plots: providedPlots }: PlotGridProps) => {
  const navigate = useNavigate();
  
  const plots = providedPlots && providedPlots.length > 0 ? providedPlots : [];
  if (plots.length === 0) {
    for (let r = 1; r <= replications; r++) {
      for (let t = 1; t <= treatments; t++) {
        plots.push({
          id: `R${r}_T${t}`,
          title: `R${r}_T${t}`,
          replication: r,
          treatment: t,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{replications} Replications</span>
        <span>{treatments} Treatments</span>
      </div>
      
      <div 
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${treatments}, minmax(0, 1fr))`,
        }}
      >
        {plots.map((plot) => {
          const colorClass = plotColors[(plot.treatment - 1) % plotColors.length];
          
          return (
            <button
              key={plot.id}
              onClick={() =>
                navigate(`/projects/${projectId}/plot/${plot.id}?plotTitle=${encodeURIComponent(plot.title)}`)
              }
              className={`plot-cell border-2 ${colorClass}`}
              style={
                plot.color
                  ? {
                      backgroundColor: `hsl(${plot.color} / 0.2)`,
                      borderColor: `hsl(${plot.color} / 0.5)`,
                      color: `hsl(${plot.color})`,
                    }
                  : undefined
              }
            >
              {plot.title}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4">
        {Array.from({ length: treatments }, (_, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className={`w-3 h-3 rounded-sm ${plotColors[i % plotColors.length].split(" ")[0]}`} />
            <span className="text-muted-foreground">T{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
