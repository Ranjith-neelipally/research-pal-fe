import ProjectTitle from '../../screens/Root/Projects/AddNewProject/ProjectTitle';
import ProjectStructure from '../../screens/Root/Projects/AddNewProject/Structure';
import ProjectLocation from '../../screens/Root/Projects/AddNewProject/Location/ProjectLocation';
type Screen = {
  name: string;
  component: React.ComponentType;
};

export const Screens: Record<string, Screen> = {
  ProjectTitle: {
    name: 'ProjectTitle',
    component: ProjectTitle,
  },
  ProjectLocation: {
    name: 'ProjectLocation',
    component: ProjectLocation,
  },
  ProjectStructure: {
    name: 'ProjectStructure',
    component: ProjectStructure,
  },
};
