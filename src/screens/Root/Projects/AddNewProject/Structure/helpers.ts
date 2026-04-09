export interface Plot {
  id: string;
  plotIndex: [number, number];
  treatment: number;
  replication: number;
  title: string;
  color?: string;
  _id?: string;
}

export interface ProjectLayoutPayload {
  projectId?: string; // optional ✅
  userId?: string;
  plots: Plot[];
}

export type PlotGrid = Plot[][];

export const TreatmentColors = [
  '#30a65b',
  '#1aa5e6',
  '#7a47d1',
  '#dd3c8c',
  '#f4c025',
  '#ee5f2b',
  '#1ad5e6',
  '#425bd7',
  '#80c322',
  '#ca42d7',
];

export const getTreatmentColor = (treatment: number) =>
  TreatmentColors[(treatment - 1) % TreatmentColors.length];

export const getDefaultPlotName = (
  replication: number,
  treatment: number,
) => `R${replication}-T${treatment}`;

export const getPlotDisplayName = (
  plot: Pick<Plot, 'replication' | 'treatment' | 'title'>,
) => plot.title.trim() || getDefaultPlotName(plot.replication, plot.treatment);

export const hasCustomPlotTitle = (
  plot: Pick<Plot, 'replication' | 'treatment' | 'title'>,
) => plot.title.trim() !== getDefaultPlotName(plot.replication, plot.treatment);

export const createPlot = (
  replication: number,
  column: number,
  existing?: Partial<Plot>,
): Plot => {
  const treatment = existing?.treatment ?? column;

  return {
    id: `plot-${replication}-${column}`,
    plotIndex: [replication, column] as [number, number],
    replication,
    treatment,
    title: existing?.title?.trim() || getDefaultPlotName(replication, treatment),
    _id: existing?._id,
  };
};

export const generatePlotGrid = (
  replications: number,
  treatments: number,
  previousGrid?: PlotGrid,
): PlotGrid =>
  Array.from({ length: replications }, (_, rowIndex) =>
    Array.from({ length: treatments }, (_, colIndex) =>
      createPlot(
        rowIndex + 1,
        colIndex + 1,
        previousGrid?.[rowIndex]?.[colIndex],
      ),
    ),
  );

export const flattenPlotGrid = (grid: PlotGrid): Plot[] =>
  grid.reduce<Plot[]>((allPlots, row) => [...allPlots, ...row], []);

export const generatePlots = (
  replications: number,
  treatments: number,
): Plot[] => flattenPlotGrid(generatePlotGrid(replications, treatments));

export const buildGrid = (plots: Plot[], rows: number, cols: number) => {
  const grid: (Plot | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );

  plots.forEach(plot => {
    const [r, c] = plot.plotIndex;

    if (r < 1 || c < 1 || r > rows || c > cols) {
      return;
    }

    grid[r - 1][c - 1] = plot;
  });

  return grid;
};
