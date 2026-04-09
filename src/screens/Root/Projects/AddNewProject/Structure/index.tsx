import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  H3,
  MutedText,
  Screen,
  SmallH3,
  SmallMutedText,
} from '../../../../../components/commonStyles/styles';
import { Theme } from '../../../../../components/theme';
import { Layers, Palette } from 'lucide-react-native/icons';
import { Card } from '../../../../../components/Card/styles';
import Button from '../../../../../components/Button';
import { Check } from 'lucide-react-native';
import { ButtonText } from '../../../../../components/Button/styles';
import ProjectLayout from './ProjectLayout';
import { TreatmentColors as colors } from './helpers';
import { useAddNewProjectStore } from '../../../../../store/Projects/AddNewProject.store';
import { useAuthStore } from '../../../../../store/auth.store';
import { createProjectService } from '../../../../../services/Projects/Project';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Project } from '../../../../../store/Projects/Projects.store';
import LoadingState from '../../../../../components/LoadingState';

const ProjectStructure = () => {
  const replicationsAndTreatmentsMaxCount = 8;
  const [selectedTreatmentAndReplication, setselectedTreatmentAndReplication] =
    useState<{ treatment: number; replication: number }>({
      treatment: 3,
      replication: 2,
    });

  console.log(selectedTreatmentAndReplication, 'selected');

  const [newProject, setnewProject] = useState<Project>();
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const router = useNavigation<NavigationProp<any>>();

  const handleSelectedTreatmentAndReplication = (
    type: 'treatment' | 'replication',
    value: number,
  ) => {
    setselectedTreatmentAndReplication(prevState => ({
      ...prevState,
      [type]: value,
    }));
  };

  const handleCreateProject = async () => {
    const projectData = useAddNewProjectStore.getState().getProjectData();
    const userId = useAuthStore.getState().user?._id;
    console.log('Creating project with data:', {
      ...projectData,
      userId,
    });

    if (!userId) {
      console.error('User ID is missing. Cannot create project.');
      return;
    }

    setIsCreatingProject(true);
    const res = await createProjectService({ ...projectData, userId });

    if (res && res.status === 409) {
      useAddNewProjectStore.getState().setErrorStatus(res.message);
      router.navigate('ProjectTitle');
      setIsCreatingProject(false);
      return;
    }
    setnewProject(res?.data?.data);
    setIsCreatingProject(false);
  };

  useEffect(() => {
    console.log(newProject, 'newnewProject');
  }, [newProject]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, gap: 16 }}>
            <View
              style={{
                backgroundColor: '#30a65b1a',
                height: 56,
                width: 56,
                justifyContent: 'center',
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Layers height={32} width={32} color={Theme.colors.primary} />
            </View>
            <H3>Experiment Design</H3>
            <MutedText>Configure your replications and treatments</MutedText>
            <SmallH3>Replications</SmallH3>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {Array.from({ length: replicationsAndTreatmentsMaxCount }).map(
                (_, idx) => (
                  <View key={idx}>
                    <TouchableOpacity
                      onPress={() =>
                        handleSelectedTreatmentAndReplication(
                          'replication',
                          idx + 2,
                        )
                      }
                      style={{
                        height: 40,
                        width: 40,
                        backgroundColor: `${
                          selectedTreatmentAndReplication.replication ===
                          idx + 2
                            ? Theme.colors.primary
                            : Theme.colors.backgroundSecondary
                        }`,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <SmallH3
                        style={{
                          color:
                            selectedTreatmentAndReplication.replication ===
                            idx + 2
                              ? Theme.colors.backgroundSecondary
                              : '#7b899d',
                        }}
                      >
                        {idx + 2}
                      </SmallH3>
                    </TouchableOpacity>
                  </View>
                ),
              )}
            </View>
            <SmallH3>Treatments</SmallH3>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {Array.from({ length: replicationsAndTreatmentsMaxCount }).map(
                (_, idx) => (
                  <View key={idx}>
                    <TouchableOpacity
                      onPress={() =>
                        handleSelectedTreatmentAndReplication(
                          'treatment',
                          idx + 2,
                        )
                      }
                      style={{
                        height: 40,
                        width: 40,
                        backgroundColor: `${
                          selectedTreatmentAndReplication.treatment === idx + 2
                            ? Theme.colors.primary
                            : Theme.colors.backgroundSecondary
                        }`,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <SmallH3
                        style={{
                          color:
                            selectedTreatmentAndReplication.treatment ===
                            idx + 2
                              ? Theme.colors.backgroundSecondary
                              : '#7b899d',
                        }}
                      >
                        {idx + 2}
                      </SmallH3>
                    </TouchableOpacity>
                  </View>
                ),
              )}
            </View>
            <Card>
              <SmallMutedText>Treatment colors</SmallMutedText>
              {selectedTreatmentAndReplication.treatment > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    marginTop: 8,
                    flexWrap: 'wrap',
                    flex: 1,
                  }}
                >
                  {Array.from({
                    length: selectedTreatmentAndReplication.treatment,
                  }).map((_, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: '#272c35',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 15,
                          height: 15,
                          backgroundColor: colors[idx % colors.length],
                          borderRadius: 15,
                        }}
                      ></View>
                      <MutedText>T{idx + 1}</MutedText>
                      <Palette size={12} color={Theme.colors.mutedForeground} />
                    </View>
                  ))}
                </View>
              )}
            </Card>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <MutedText>
                {selectedTreatmentAndReplication.replication} Replications
              </MutedText>
              <MutedText>
                {selectedTreatmentAndReplication.treatment} Treatments
              </MutedText>
            </View>
            <ScrollView>
              <ProjectLayout
                setselectedTreatmentAndReplication={
                  setselectedTreatmentAndReplication
                }
                replications={selectedTreatmentAndReplication.replication}
                treatments={selectedTreatmentAndReplication.treatment}
                projectId={newProject?._id || ''}
              />
            </ScrollView>
            {isCreatingProject && (
              <LoadingState label="Creating project..." />
            )}
          </View>
        </ScrollView>
        <Button
          style={{
            alignItems: 'center',
          }}
          onPress={handleCreateProject}
          disabled={isCreatingProject}
        >
          <Check size={16} color={Theme.colors.background} />
          <View
            style={{
              paddingLeft: 4,
              marginTop: 6,
            }}
          >
            <ButtonText>
              {isCreatingProject ? ' Creating Project...' : ' Create Project'}
            </ButtonText>
          </View>
        </Button>
      </KeyboardAvoidingView>
    </Screen>
  );
};

export default ProjectStructure;
