import React from 'react';
import { Screen } from '../../../components/commonStyles/styles';
import ProjectsData from './ProjectCards';
import ScreenHeader from '../../../components/ScreenHeader';

const Projects = () => {
  return (
    <Screen>
      <ScreenHeader
        title="Projects"
        subtitle="Manage your research experiments"
      />
      <ProjectsData />
    </Screen>
  );
};

export default Projects;
