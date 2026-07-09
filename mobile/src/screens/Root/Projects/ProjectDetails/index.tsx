import { Alert, TouchableOpacity, View } from 'react-native';
import { useProjectsStore } from '../../../../store/Projects/Projects.store';
import {
  deleteProjectService,
  getProjectDetailsService,
} from '../../../../services/Projects/Project';
import React, { useCallback, useLayoutEffect, useState } from 'react';
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
import { NavigationProp, useNavigation } from '@react-navigation/native';
import ProjectStructure from './ProjectStructure';
import MyModal from '../../../../components/modal';
import CustomCalendar from '../../../../components/Calender';
import LoadingState from '../../../../components/LoadingState';

function ProjectDetails({ route }: any) {
  const { projectId } = route.params;
  const navigation = useNavigation<NavigationProp<any>>();
  const Projects = useProjectsStore(state => state.projectsData);
  const removeProject = useProjectsStore(state => state.removeProject);

  const project = Projects.find(proj => proj._id === projectId);
  const setHeader = useStackScreenStore(state => state.setHeader);
  const resetHeader = useStackScreenStore(state => state.resetHeader);
  const setAddNewButtonActionsVisible = useAddNewButtonActionsStore(
    state => state.setAddNewButtonActionsVisible,
  );

  const [plotsData, setplotsData] = useState<Plot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isCalenderVisable, setisCalenderVisable] = useState(false);
  const [isLoadingProjectDetails, setIsLoadingProjectDetails] = useState(true);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
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
  }, [loadProjectDetails]);

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
    setAddNewButtonActionsVisible(false);

    return () => {
      resetHeader();
    };
  }, [
    project?.location,
    project?.title,
    confirmDeleteProject,
    resetHeader,
    setAddNewButtonActionsVisible,
    setHeader,
  ]);

  const grid = buildGrid(
    Array.isArray(plotsData) ? plotsData : [],
    project?.replicationsCount || 0,
    project?.treatmentsCount || 0,
  );

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
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: '#30a65b',
              borderRadius: 8,
            },
            text: {
              color: '#101318',
              fontWeight: '700',
            },
          },
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
          <H1>{project?.notesCount || 0}</H1>
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
      />
      <MyModal
        visible={isCalenderVisable}
        onClose={() => {
          setisCalenderVisable(false);
        }}
      >
        <CustomCalendar
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
