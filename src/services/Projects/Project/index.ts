import {
  Project,
  useProjectsStore,
} from '../../../store/Projects/Projects.store';
import api from '../../api';
import { normalizeApiError } from '../../apiError';

export async function getAllProjectsService(userId: string) {
  try {
    const res = await api.get('/projects', {
      params: { userId },
    });
    const projects = (res.data.projects || res.data.data || []) as Project[];
    useProjectsStore.getState().setProjectsData(projects);
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
}

// "data": {
//     "title": "Nice",
//     "location": "Okey",
//     "replicationsCount": 0,
//     "treatmentsCount": 0,
//     "userId": "695a6260fca75ddcba9e9b44",
//     "plotsCount": 0,
//     "_id": "69628e97a6f35765e532ef0d",
//     "createdAt": "2026-01-10T17:38:31.381Z",
//     "updatedAt": "2026-01-10T17:38:31.381Z",
//     "__v": 0
// }

export async function createProjectService(projectData: Partial<Project>) {
  try {
    const res = await api.post('/projects', projectData);

    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
}

export async function deleteProjectService(
  projectId: string,
  userId?: string,
) {
  try {
    const res = await api.delete('/projects', {
      data: {
        _id: projectId,
        userId,
      },
    });

    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
}

export async function checkProjectTitleExistsService(title: string) {
  try {
    const res = await api.get('/projects/title-exists', {
      params: { title },
    });

    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
}

export async function getProjectDetailsService(
  projectId: string,
  userId: string,
) {
  try {
    const res = await api.get(`/projects/plot`, {
      params: { projectId, userId },
    });

    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
}
