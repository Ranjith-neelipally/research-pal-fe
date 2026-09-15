import { Alert, TouchableOpacity, View } from 'react-native';
import { useProjectsStore } from '../../../../store/Projects/Projects.store';
import {
  deleteProjectService,
  getProjectDetailsService,
} from '../../../../services/Projects/Project';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  H1,
  Screen,
  SmallMutedText,
} from '../../../../components/commonStyles/styles';
import { useStackScreenStore } from '../../../../services/StackScreen/stackScreen.store';
import { Card } from '../../../../components/Card/styles';
import { Calendar } from 'lucide-react-native';
import { useAddNewButtonActionsStore } from '../../../../store/addNew.store';
import {
  buildGrid,
  getPlotDisplayName,
  getTreatmentColor,
  Plot,
} from '../AddNewProject/Structure/helpers';
import { updatePlotDisplayMetadataService } from '../../../../services/Projects/Plot';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import ProjectStructure from './ProjectStructure';
import MyModal from '../../../../components/modal';
import CustomCalendar from '../../../../components/Calender';
import LoadingState from '../../../../components/LoadingState';
import QuickObservationModal from '../Observations/QuickObservationModal';
import AddNew from '../../../../components/AddNew';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useObservationsStore } from '../../../../store/observations.store';
import { Theme } from '../../../../components/theme';
import { useNoteEventsStore } from '../../../../store/noteEvents.store';

function ProjectDetails({ route }: any) {
  const { projectId } = route.params;
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const Projects = useProjectsStore(state => state.projectsData);
  const removeProject = useProjectsStore(state => state.removeProject);

  const project = Projects.find(proj => proj._id === projectId);
  const setHeader = useStackScreenStore(state => state.setHeader);
  const resetHeader = useStackScreenStore(state => state.resetHeader);
  const setAddNewButtonActionsVisible = useAddNewButtonActionsStore(
    state => state.setAddNewButtonActionsVisible,
  );
  const fetchObservationTypes = useObservationsStore(state => state.fetchObservationTypes);
  const lastCreatedNote = useNoteEventsStore(state => state.lastCreatedNote);
  const appliedNoteEventIds = useRef<Set<number>>(new Set());

  const [plotsData, setplotsData] = useState<Plot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isCalenderVisable, setisCalenderVisable] = useState(false);
  const [isLoadingProjectDetails, setIsLoadingProjectDetails] = useState(true);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isQuickObservationVisible, setIsQuickObservationVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<{
    year: number;
    month: number;
  }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-indexed
  });

  const loadProjectDetails = useCallback(async () => {
    setIsLoadingProjectDetails(true);
    const plotData = await getProjectDetailsService(
      projectId,
      project?.userId!,
    );
    if (plotData && plotData.status === 200) {
      const payload = plotData.data as any;
      const normalizedPlots = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];
      const normalizedDates = Array.isArray(payload?.dates) ? payload.dates : [];

      setplotsData(normalizedPlots);
      setAvailableDates(normalizedDates);
    } else {
      setplotsData([]);
      setAvailableDates([]);
      const message =
        (plotData as any)?.message ||
        'Unable to load plots for this project right now.';
      Alert.alert('Failed to load project details', message);
    }
    setIsLoadingProjectDetails(false);
  }, [projectId, project?.userId]);

  React.useEffect(() => {
    loadProjectDetails();
    fetchObservationTypes(projectId).catch(() => undefined);
  }, [fetchObservationTypes, loadProjectDetails, projectId]);

  React.useEffect(() => {
    const projectsTabNavigation = navigation.getParent();

    setAddNewButtonActionsVisible(false);
    const unsubscribeFocus = projectsTabNavigation?.addListener('focus', () => {
      setAddNewButtonActionsVisible(false);
    });
    const unsubscribeBlur = projectsTabNavigation?.addListener('blur', () => {
      setAddNewButtonActionsVisible(true);
    });

    return () => {
      unsubscribeFocus?.();
      unsubscribeBlur?.();
      setAddNewButtonActionsVisible(true);
    };
  }, [navigation, setAddNewButtonActionsVisible]);

  const deleteProject = useCallback(async () => {
    if (!project || isDeletingProject) return;
    setIsDeletingProject(true);
    const response = await deleteProjectService(project._id, project.userId);
    if (response.status === 200) {
      removeProject(project._id);
      navigation.goBack();
      return;
    }
    setIsDeletingProject(false);
    Alert.alert(
      'Project deletion failed',
      (response as any)?.message || 'Unable to delete this project right now.',
    );
  }, [isDeletingProject, navigation, project, removeProject]);

  const confirmDeleteProject = useCallback(() => {
    if (isDeletingProject) return;
    Alert.alert(
      'Delete project?',
      'Deleting this project is permanent and cannot be undone. All project data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Project', style: 'destructive', onPress: deleteProject },
      ],
    );
  }, [deleteProject, isDeletingProject]);

  useLayoutEffect(() => {
    setHeader({
      screenTitle: project?.title,
      headerSubtitle: project?.location,
      showProgressBar: false,
      headerSubIcon: 'location',
      showActionsMenu: false,
      actionButtons: [
        {
          icon: 'edit',
          title: 'Edit',
          onPress: () => {
            console.log('Edit button pressed');
          },
          varient: 'primary',
        },
        {
          icon: 'delete',
          title: 'Delete',
          onPress: confirmDeleteProject,
          varient: 'secondary',
        },
      ],
    });
    return () => {
      resetHeader();
    };
  }, [
    project?.location,
    project?.title,
    confirmDeleteProject,
    resetHeader,
    setHeader,
  ]);

  const grid = buildGrid(
    Array.isArray(plotsData) ? plotsData : [],
    project?.replicationsCount || 0,
    project?.treatmentsCount || 0,
  );
  const totalNotes = plotsData.reduce(
    (sum, plot) => sum + (plot.notesCount ?? 0),
    0,
  );

  useEffect(() => {
    if (!lastCreatedNote || lastCreatedNote.projectId !== projectId) return;
    if (appliedNoteEventIds.current.has(lastCreatedNote.id)) return;

    appliedNoteEventIds.current.add(lastCreatedNote.id);
    setplotsData(current =>
      current.map(plot =>
        plot._id === lastCreatedNote.plotId
          ? { ...plot, notesCount: (plot.notesCount ?? 0) + 1 }
          : plot,
      ),
    );
    setAvailableDates(current =>
      current.includes(lastCreatedNote.date)
        ? current
        : [...current, lastCreatedNote.date].sort((a, b) => b.localeCompare(a)),
    );
  }, [lastCreatedNote, projectId]);

  const handlePlotPress = (plot: Plot | null) => () => {
    if (!plot) return;
    navigation.navigate('PlotNotesDetails', {
      projectId: projectId,
      plotId: plot._id,
      userId: project?.userId,
      plotColor: getTreatmentColor(plot.treatment),
      plotName: getPlotDisplayName(plot),
      plotIndex: plot.plotIndex,
    });
    console.log(plot);
  };

  const updatePlotLabels = useCallback(
    async (
      type: 'replication' | 'treatment',
      value: number,
      name: string,
    ) => {
      const fields =
        type === 'replication'
          ? { replicationName: name }
          : { treatmentName: name };
      const affectedPlots = plotsData.filter(plot => plot[type] === value && plot._id);

      setplotsData(current =>
        current.map(plot =>
          plot[type] === value
            ? { ...plot, ...fields }
            : plot,
        ),
      );

      const results = await Promise.all(
        affectedPlots.map(plot =>
          updatePlotDisplayMetadataService(projectId, plot._id!, fields),
        ),
      );
      const failed = results.find(result => result.status < 200 || result.status >= 300);
      if (failed) {
        await loadProjectDetails();
        Alert.alert(
          'Rename failed',
          (failed as any).message || 'Unable to rename this label right now.',
        );
      }
    },
    [loadProjectDetails, plotsData, projectId],
  );

  const updatePlotName = useCallback(
    async (plot: Plot, name: string) => {
      const title = name.trim();
      if (!plot._id || !title) {
        Alert.alert('Rename failed', 'Enter a plot name before saving.');
        return;
      }

      setplotsData(current =>
        current.map(item =>
          item._id === plot._id ? { ...item, title } : item,
        ),
      );

      const result = await updatePlotDisplayMetadataService(projectId, plot._id, {
        title,
      });

      if (result.status < 200 || result.status >= 300) {
        await loadProjectDetails();
        Alert.alert(
          'Rename failed',
          (result as any).message || 'Unable to rename this plot right now.',
        );
      }
    },
    [loadProjectDetails, projectId],
  );

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};
    const year = calendarMonth.year;
    const month = calendarMonth.month;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        d,
      ).padStart(2, '0')}`;
      if (availableDates.includes(dateStr)) {
        marked[dateStr] = {
          marked: true,
          dotColor: Theme.colors.primary,
          disabled: false,
          disableTouchEvent: false,
        };
      } else {
        marked[dateStr] = { disabled: true, disableTouchEvent: true };
      }
    }
    return marked;
  };

  const handleMonthChange = (date: { year: number; month: number }) => {
    setCalendarMonth({ year: date.year, month: date.month - 1 }); // month is 1-indexed from calendar
  };

  const handleDateSelect = useCallback(
    (date: string) => {
      setisCalenderVisable(false);
      navigation.navigate('PlotNotesDetails', {
        projectId,
        userId: project?.userId,
        date,
        plotsData,
        plotName: project?.title,
      });
    },
    [navigation, plotsData, project?.title, project?.userId, projectId],
  );

  return (
    <Screen>
      {isLoadingProjectDetails ? (
        <LoadingState label="Loading project details..." fullScreen />
      ) : (
        <>
      <View
        style={{
          flexDirection: 'row',
          gap: 16,
          width: '100%',
        }}
      >
        <Card style={{ alignItems: 'center', flex: 1, maxWidth: '100%' }}>
          <H1>{project?.plotsCount || plotsData.length}</H1>
          <SmallMutedText>Plots</SmallMutedText>
        </Card>
        <Card style={{ alignItems: 'center', flex: 1, maxWidth: '100%' }}>
          <H1>{totalNotes}</H1>
          <SmallMutedText>Notes</SmallMutedText>
        </Card>
        <TouchableOpacity onPress={() => setisCalenderVisable(true)}>
          <Card
            style={{
              alignItems: 'center',
              flex: 1,
              maxWidth: '100%',
              justifyContent: 'space-between',
            }}
          >
            <Calendar size={24} color="#30a65b" />
            <SmallMutedText>View Notes</SmallMutedText>
          </Card>
        </TouchableOpacity>
      </View>
      <ProjectStructure
        project={project}
        grid={grid}
        handlePlotPress={handlePlotPress}
        onRenameLabel={updatePlotLabels}
        onRenamePlot={updatePlotName}
      />
      <AddNew
        floating
        bottomOffset={112 + insets.bottom}
        onPress={() => setIsQuickObservationVisible(true)}
      />
      <QuickObservationModal
        visible={isQuickObservationVisible}
        projectId={projectId}
        plots={plotsData}
        onClose={() => setIsQuickObservationVisible(false)}
        onSaved={loadProjectDetails}
        onViewObservation={type => {
          setIsQuickObservationVisible(false);
          navigation.navigate('ObservationDetails', { projectId, observationType: type });
        }}
      />
      <MyModal
        visible={isCalenderVisable}
        onClose={() => {
          setisCalenderVisable(false);
        }}
      >
        <CustomCalendar
          markingType="dot"
          onDayPress={day => {
            if (getMarkedDates()[day.dateString]?.disabled) return;
            handleDateSelect(day.dateString);
          }}
          markedDates={getMarkedDates()}
          onMonthChange={handleMonthChange}
        />
      </MyModal>
        </>
      )}
    </Screen>
  );
}

export default ProjectDetails;
