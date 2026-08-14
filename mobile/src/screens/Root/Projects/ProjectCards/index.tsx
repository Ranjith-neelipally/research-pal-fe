import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {
  deleteProjectService,
  getAllProjectsService,
  updateProjectService,
} from '../../../../services/Projects/Project';
import { useAuthStore } from '../../../../store/auth.store';
import {
  Project,
  useProjectsActionStore,
  useProjectsStore,
} from '../../../../store/Projects/Projects.store';
import { Card } from '../../../../components/Card/styles';
import { H3, SmallMutedText } from '../../../../components/commonStyles/styles';
import { MapPin, Calendar, EllipsisVertical, X } from 'lucide-react-native';
import { Theme } from '../../../../components/theme';
import { useAddNewButtonActionsStore } from '../../../../store/addNew.store';
import LoadingState from '../../../../components/LoadingState';
import MyModal from '../../../../components/modal';
import Input from '../../../../components/Input';
import Button from '../../../../components/Button';
import { cleanupProjectLocalData } from '../../../../localStorage';
import { TreatmentColors } from '../AddNewProject/Structure/helpers';

const MENU_WIDTH = 172;
const MENU_HEIGHT = 96;
const SCREEN_MARGIN = 12;

type MenuAnchor = {
  projectId: string;
  left: number;
  top: number;
};

const ProjectsData = () => {
  const navigation = useNavigation<NavigationProp<any>>();

  const userId = useAuthStore(state => state.user?._id || '');
  const allProjects = useProjectsStore(state => state.projectsData) || [];
  const updateProject = useProjectsStore(state => state.updateProject);
  const removeProject = useProjectsStore(state => state.removeProject);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const menuButtonRefs = useRef<Record<string, View | null>>({});
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
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<TextInput>(null);

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

  const openMenu = useCallback(
    (projectId: string) => {
      menuButtonRefs.current[projectId]?.measureInWindow(
        (x, y, width, height) => {
          const left = Math.min(
            Math.max(SCREEN_MARGIN, x + width - MENU_WIDTH),
            screenWidth - MENU_WIDTH - SCREEN_MARGIN,
          );
          const spaceBelow = screenHeight - (y + height) - SCREEN_MARGIN;
          const top =
            spaceBelow >= MENU_HEIGHT
              ? y + height
              : Math.max(SCREEN_MARGIN, y - MENU_HEIGHT);
          setMenuAnchor({ projectId, left, top });
        },
      );
    },
    [screenHeight, screenWidth],
  );

  const beginEdit = useCallback((project: Project) => {
    setMenuAnchor(null);
    setEditingProject(project);
    setProjectName(project.title);
    setInputError('');
  }, []);

  const saveProject = useCallback(async () => {
    const title = projectName.trim();
    if (!editingProject || !title || isSaving) {
      if (!title) setInputError('Project name is required.');
      return;
    }

    setIsSaving(true);
    const response = await updateProjectService({
      ...editingProject,
      title,
    });
    setIsSaving(false);

    if (response.status >= 200 && response.status < 300 && response.data) {
      updateProject({ ...editingProject, ...response.data, title });
      setEditingProject(null);
      Alert.alert('Project updated', 'The project name has been updated.');
      return;
    }

    Alert.alert(
      'Project update failed',
      response.message || 'Unable to update this project right now.',
    );
  }, [editingProject, isSaving, projectName, updateProject]);

  const deleteProject = useCallback(
    async (project: Project) => {
      const response = await deleteProjectService(project._id);
      if (response.status < 200 || response.status >= 300) {
        Alert.alert(
          'Project deletion failed',
          response.message || 'Unable to delete this project right now.',
        );
        return;
      }

      try {
        await cleanupProjectLocalData(project._id);
      } catch (error) {
        console.warn('Project local cleanup failed', error);
      }
      removeProject(project._id);
      Alert.alert(
        'Project deleted',
        'The project and its local data were deleted.',
      );
    },
    [removeProject],
  );

  const confirmDelete = useCallback(
    (project: Project) => {
      setMenuAnchor(null);
      Alert.alert(
        'Delete Project?',
        'This will permanently delete this project and all associated data.\n\nThis includes:\n• Project\n• Plots\n• Notes\n• Photos stored locally\n• Project metadata\n• Offline cached project data\n\nThis action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteProject(project),
          },
        ],
      );
    },
    [deleteProject],
  );

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
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <H3 style={{ flex: 1, paddingRight: 8 }}>
                        {project.title}
                      </H3>
                      <Pressable
                        ref={ref => {
                          menuButtonRefs.current[project._id] = ref;
                        }}
                        hitSlop={10}
                        onPress={event => {
                          event.stopPropagation();
                          openMenu(project._id);
                        }}
                        style={{ padding: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Actions for ${project.title}`}
                      >
                        <EllipsisVertical
                          size={20}
                          color={Theme.colors.mutedForeground}
                        />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 4,
                          flex: 1,
                        }}
                      >
                        <MapPin
                          size={12}
                          color={Theme.colors.mutedForeground}
                          style={{ marginTop: 3 }}
                        />
                        <SmallMutedText style={{ flex: 1 }}>
                          {project.location}
                        </SmallMutedText>
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
                    <View
                      style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}
                    >
                      {(project.plotColors?.length
                        ? project.plotColors
                        : TreatmentColors.slice(0, project.treatmentsCount)
                      ).map((color, index) => (
                        <View
                          key={`${color}-${index}`}
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
      <Modal
        visible={menuAnchor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAnchor(null)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setMenuAnchor(null)}>
          {menuAnchor && (
            <View
              style={{
                position: 'absolute',
                left: menuAnchor.left,
                top: menuAnchor.top,
                width: MENU_WIDTH,
                backgroundColor: Theme.colors.backgroundSecondary,
                borderRadius: 8,
                paddingVertical: 4,
                elevation: 12,
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              {(() => {
                const project = allProjects.find(
                  item => item._id === menuAnchor.projectId,
                );
                if (!project) return null;
                return (
                  <>
                    <Pressable
                      onPress={() => beginEdit(project)}
                      style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                    >
                      <Text style={{ color: Theme.colors.fontSecondary }}>
                        Edit Project
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(project)}
                      style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                    >
                      <Text style={{ color: '#ef5350' }}>Delete Project</Text>
                    </Pressable>
                  </>
                );
              })()}
            </View>
          )}
        </Pressable>
      </Modal>
      <MyModal
        visible={editingProject !== null}
        onClose={() => !isSaving && setEditingProject(null)}
        placement="bottom"
        modalHeader="Edit Project"
      >
        <View style={{ gap: 16 }}>
          <Input
            ref={inputRef}
            value={projectName}
            onChangeText={value => {
              setProjectName(value);
              if (inputError) setInputError('');
            }}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={saveProject}
            label="Project name"
            error={inputError || undefined}
          />
          <Button
            disabled={!projectName.trim() || isSaving}
            onPress={saveProject}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </View>
      </MyModal>
    </View>
  );
};

export default ProjectsData;
