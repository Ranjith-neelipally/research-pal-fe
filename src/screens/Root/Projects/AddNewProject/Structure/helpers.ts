export interface Plot {
  id?: string;
  plotIndex: [number, number];
  treatment: number;
  replication: number;
  title: string;
  color: string;
  customName?: string;
  _id?: string;
}

export interface ProjectLayoutPayload {
  projectId?: string; // optional ✅
  userId?: string;
  plots: Plot[];
}

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

export const getPlotId = (replication: number, treatment: number) =>
  `plot-${replication}-${treatment}`;

export const getPlotDisplayName = (
  plot: Pick<Plot, 'replication' | 'treatment' | 'title' | 'customName'>,
) =>
  plot.customName?.trim() ||
  plot.title?.trim() ||
  getDefaultPlotName(plot.replication, plot.treatment);

export const getPlotCustomName = (
  plot: Pick<Plot, 'replication' | 'treatment' | 'title' | 'customName'>,
) => {
  const customName = plot.customName?.trim();

  if (customName) {
    return customName;
  }

  const title = plot.title?.trim();
  const defaultName = getDefaultPlotName(plot.replication, plot.treatment);

  return title && title !== defaultName ? title : undefined;
};

export const generatePlots = (
  replications: number,
  treatments: number,
): Plot[] => {
  const result: Plot[] = [];

  for (let r = 1; r <= replications; r++) {
    for (let t = 1; t <= treatments; t++) {
      result.push({
        id: getPlotId(r, t),
        plotIndex: [r, t] as [number, number],
        replication: r,
        treatment: t,
        title: getDefaultPlotName(r, t),
        color: getTreatmentColor(t),
        customName: undefined,
      });
    }
  }

  return result;
};

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
