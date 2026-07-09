import { View, TouchableOpacity, ScrollView } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { getAllProjectsService } from '../../../../services/Projects/Project';
import { useAuthStore } from '../../../../store/auth.store';
import {
  Project,
  useProjectsActionStore,
  useProjectsStore,
} from '../../../../store/Projects/Projects.store';
import { Card } from '../../../../components/Card/styles';
import { H3, SmallMutedText } from '../../../../components/commonStyles/styles';
import { MapPin, Calendar, X } from 'lucide-react-native';
import { Theme } from '../../../../components/theme';
import { useAddNewButtonActionsStore } from '../../../../store/addNew.store';
import LoadingState from '../../../../components/LoadingState';

const ProjectsData = () => {
  const navigation = useNavigation<NavigationProp<any>>();

  const userId = useAuthStore(state => state.user?._id || '');
  const allProjects = useProjectsStore(state => state.projectsData) || [];
  const setAddNewButtonVisible = useAddNewButtonActionsStore(
    state => state.setAddNewButtonActionsVisible,
  );
  const setAddNewButtonAction = useAddNewButtonActionsStore(
    state => state.setAddNewButtonAction,
  );

  const setIsProjectAdding = useProjectsActionStore(
    state => state.setIsProjectAdding,
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const handleProjectsFetch = useCallback(async () => {
    if (!userId) {
      setIsLoadingProjects(false);
      return;
    }

    setIsLoadingProjects(true);
    console.log('Fetching all projects...');
    const response = await getAllProjectsService(userId);
    if (response) {
      console.log('Projects fetched successfully:', response);
    } else {
      console.log('Failed to fetch projects.');
    }
    setIsLoadingProjects(false);
  }, [userId]);

  const handleAddNewProject = useCallback(() => {
    navigation.navigate('ProjectCreation');
    setIsProjectAdding(true);
  }, [navigation, setIsProjectAdding]);

  useEffect(() => {
    handleProjectsFetch();
  }, [handleProjectsFetch]);

  useFocusEffect(
    React.useCallback(() => {
      handleProjectsFetch();
    }, [handleProjectsFetch]),
  );

  useFocusEffect(() => {
    setAddNewButtonVisible(true);
  });

  useFocusEffect(
    React.useCallback(() => {
      setAddNewButtonAction(handleAddNewProject);
    }, [handleAddNewProject, setAddNewButtonAction]),
  );

  const handleProjectPress = async (project: Project) => {
    if (project._id) {
      navigation.navigate('ProjectDetails', { projectId: project._id });
    }
  };

  return (
    <View>
      {isLoadingProjects ? (
        <LoadingState label="Loading projects..." />
      ) : (
      <ScrollView>
        <View style={{ gap: 12, paddingBottom: 120 }}>
          {allProjects.length > 0 &&
            allProjects.map(project => (
              <TouchableOpacity
                key={project._id}
                onPress={() => handleProjectPress(project)}
              >
                <Card>
                  <H3>{project.title}</H3>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        gap: 4,
                      }}
                    >
                      <MapPin size={12} color={Theme.colors.mutedForeground} />
                      <SmallMutedText>{project.location}</SmallMutedText>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Calendar
                        size={12}
                        color={Theme.colors.mutedForeground}
                      />
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <SmallMutedText>
                          {project.replicationsCount}
                        </SmallMutedText>
                        <X size={12} color={Theme.colors.mutedForeground} />
                        <SmallMutedText>
                          {project.treatmentsCount}
                        </SmallMutedText>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {(project.plotColors || []).map(color => (
                      <View
                        key={color}
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: color,
                          borderRadius: 10,
                        }}
                      />
                    ))}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
      )}
    </View>
  );
};

export default ProjectsData;
