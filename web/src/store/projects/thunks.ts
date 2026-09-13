import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createPlotsService,
  createProjectService,
  deleteProjectService,
  getProjectsService,
  checkProjectTitleExistsService,
  updateProjectService,
  type PlotPayload,
} from "@/services/projects";
import { mapProject } from "@/store/projects/mappers";
import type { ProjectEntity } from "@/store/projects/types";
import type { RootState } from "@/store";

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const fetchProjects = createAsyncThunk<ProjectEntity[], void, { rejectValue: string; state: RootState }>(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      return (await getProjectsService()).map(mapProject);
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = getState().projects.status;
      return status !== "loading" && status !== "succeeded";
    },
  },
);

export const createProjectWithPlots = createAsyncThunk<
  ProjectEntity,
  {
    title: string;
    location: string;
    replications: number;
    treatments: number;
    plots: PlotPayload[];
  },
  { rejectValue: string }
>("projects/createProjectWithPlots", async (payload, { rejectWithValue }) => {
  try {
    const titleCheck = await checkProjectTitleExistsService(payload.title);
    if (titleCheck.exists) {
      return rejectWithValue("Project title already exists.");
    }

    const validationError = validatePlots(payload.plots, payload.replications, payload.treatments);
    if (validationError) {
      return rejectWithValue(validationError);
    }

    const project = await createProjectService({
      title: payload.title,
      location: payload.location,
      replications: payload.replications,
      treatments: payload.treatments,
      plotsCount: payload.plots.length,
    });

    try {
      await createPlotsService({ projectId: project._id, plots: payload.plots });
    } catch (error) {
      await deleteProjectService(project._id);
      throw error;
    }

    return mapProject(project);
  } catch (error) {
    return rejectWithValue(message(error));
  }
});

export const updateProject = createAsyncThunk<
  ProjectEntity,
  { id: string; title: string; location: string; replications: number; treatments: number },
  { rejectValue: string }
>("projects/updateProject", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return mapProject(await updateProjectService({ _id: id, ...payload }));
  } catch (error) {
    return rejectWithValue(message(error));
  }
});

export const removeProject = createAsyncThunk<string, string, { rejectValue: string }>(
  "projects/removeProject",
  async (id, { rejectWithValue }) => {
    try {
      return await deleteProjectService(id);
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);

function validatePlots(plots: PlotPayload[], replicationsLimit: number, treatmentsLimit: number) {
  if (!Array.isArray(plots) || plots.length === 0) return "Please configure plots before creating project.";
  if (plots.length < 4) return "At least 4 plots are required.";

  const titles = new Set<string>();
  const indexes = new Set<string>();
  const replicationTreatments = new Set<string>();

  for (const plot of plots) {
    const title = plot.title.trim();
    const indexKey = JSON.stringify(plot.plotIndex);
    const replicationTreatmentKey = `${plot.replication}-${plot.treatment}`;

    if (!title) return "Every plot needs a title.";
    if (title.length > 100) return `Plot title is too long: ${title}`;
    if (titles.has(title)) return `Duplicate plot title in request: ${title}`;
    if (indexes.has(indexKey)) return `Duplicate plotIndex in request: [${plot.plotIndex}]`;
    if (replicationTreatments.has(replicationTreatmentKey)) {
      return `Duplicate replication/treatment combination in request: R${plot.replication}-T${plot.treatment}`;
    }
    if (
      replicationsLimit < plot.replication ||
      treatmentsLimit < plot.treatment ||
      plot.replication < 1 ||
      plot.treatment < 1
    ) {
      return `Invalid ${replicationsLimit < plot.replication ? "replication" : "treatment"} number for plot: ${title}`;
    }

    titles.add(title);
    indexes.add(indexKey);
    replicationTreatments.add(replicationTreatmentKey);
  }

  return null;
}
