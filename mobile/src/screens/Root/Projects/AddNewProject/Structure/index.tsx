import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import React, { useState } from 'react';
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
import { Plot, TreatmentColors as colors } from './helpers';
import { useAddNewProjectStore } from '../../../../../store/Projects/AddNewProject.store';
import { useAuthStore } from '../../../../../store/auth.store';
import {
  createProjectService,
  deleteProjectService,
} from '../../../../../services/Projects/Project';
import { createPlotsService } from '../../../../../services/Projects/Plot';
import {
  useNavigation,
  NavigationProp,
  CommonActions,
} from '@react-navigation/native';
import LoadingState from '../../../../../components/LoadingState';

type PlotPayload = {
  title: string;
  color: string;
  notesCount: number;
  replication: number;
  treatment: number;
  plotIndex: [number, number];
};

const preparePlotsPayload = (plots: Plot[]): PlotPayload[] =>
  plots.map(plot => {
    const replication = Number(plot.replication);
    const treatment = Number(plot.treatment);
    const trimmedTitle = plot.title?.trim();
    const physicalIndex: [number, number] = [plot.plotIndex[0], plot.plotIndex[1]];

    return {
      title: trimmedTitle || `R${replication}-T${treatment}`,
      color: plot.color,
      notesCount: 0,
      replication,
      treatment,
      plotIndex: physicalIndex,
    };
  });

const validatePlotsBeforeCreate = (
  plots: PlotPayload[],
  replicationsLimit: number,
  treatmentsLimit: number,
) => {
  if (!Array.isArray(plots) || plots.length === 0) {
    return 'No plots provided.';
  }

  if (plots.length < 4) {
    return 'At least 4 plots are required.';
  }

  const batchTitles = new Set<string>();
  const batchIndexes = new Set<string>();
  const batchReplicationTreatment = new Set<string>();

  for (const plot of plots) {
    const title = plot.title;
    const indexKey = JSON.stringify(plot.plotIndex);
    const replicationTreatmentKey = `${plot.replication}-${plot.treatment}`;

    if (batchTitles.has(title)) {
      return `Duplicate plot title in request: ${title}`;
    }
    if (batchIndexes.has(indexKey)) {
      return `Duplicate plotIndex in request: [${plot.plotIndex}]`;
    }
    if (batchReplicationTreatment.has(replicationTreatmentKey)) {
      return `Duplicate replication/treatment combination in request: R${plot.replication}-T${plot.treatment}`;
    }

    batchTitles.add(title);
    batchIndexes.add(indexKey);
    batchReplicationTreatment.add(replicationTreatmentKey);

    if (
      replicationsLimit < plot.replication ||
      treatmentsLimit < plot.treatment ||
      plot.replication < 1 ||
      plot.treatment < 1
    ) {
      return `Invalid ${
        replicationsLimit < plot.replication ? 'replication' : 'treatment'
      } number for plot: ${title}`;
    }
  }

  return null;
};

const ProjectStructure = () => {
  const replicationsAndTreatmentsMaxCount = 8;
  const [selectedTreatmentAndReplication, setselectedTreatmentAndReplication] =
    useState<{ treatment: number; replication: number }>({
      treatment: 3,
      replication: 2,
    });

  const [plots, setPlots] = useState<Plot[]>([]);
  const [creationError, setCreationError] = useState('');
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
    setCreationError('');
    const showCreationError = (message: string) => {
      setCreationError(message);
      Alert.alert('Project creation failed', message);
    };

    if (!userId) {
      showCreationError('User is not authenticated.');
      return;
    }

    if (!plots.length) {
      showCreationError('Please configure plots before creating project.');
      return;
    }

    const preparedPlots = preparePlotsPayload(plots);
    const plotValidationError = validatePlotsBeforeCreate(
      preparedPlots,
      selectedTreatmentAndReplication.replication,
      selectedTreatmentAndReplication.treatment,
    );

    if (plotValidationError) {
      showCreationError(plotValidationError);
      return;
    }

    setIsCreatingProject(true);
    const res = await createProjectService({ ...projectData, userId });

    if (res && res.status === 409) {
      const message = res.message || 'Project title already exists';
      useAddNewProjectStore
        .getState()
        .setErrorStatus(message);
      Alert.alert('Duplicate title', message);
      router.navigate('ProjectTitle');
      setIsCreatingProject(false);
      return;
    }

    const createdProjectId = (res as any)?.data?._id || (res as any)?.data?.data?._id;
    if (!createdProjectId) {
      const projectErrorMessage = 'message' in res ? res.message : undefined;
      showCreationError(projectErrorMessage || 'Project creation failed.');
      setIsCreatingProject(false);
      return;
    }

    const plotRes = await createPlotsService({
      projectId: createdProjectId,
      userId,
      plots: preparedPlots as any,
    });

    setIsCreatingProject(false);

    if (plotRes.status !== 201) {
      const rollbackRes = await deleteProjectService(createdProjectId, userId);
      const plotErrorMessage = 'message' in plotRes ? plotRes.message : undefined;
      const rollbackFailed = rollbackRes.status !== 200;
      const message =
        rollbackFailed
          ? `${plotErrorMessage || 'Plots creation failed.'} Rollback failed. Please delete project manually.`
          : plotErrorMessage || 'Plots creation failed. Project was rolled back.';
      showCreationError(message);
      return;
    }

    router.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            state: {
              index: 0,
              routes: [
                {
                  name: 'Projects',
                },
              ],
            },
          },
        ],
      }),
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
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
                onPlotsChange={setPlots}
              />
            </ScrollView>
            {isCreatingProject && (
              <LoadingState label="Creating project..." />
            )}
            {!!creationError && (
              <MutedText style={{ color: '#f87171' }}>{creationError}</MutedText>
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
