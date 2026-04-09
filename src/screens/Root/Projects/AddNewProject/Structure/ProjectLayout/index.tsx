import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import {
  flattenPlotGrid,
  getDefaultPlotName,
  getPlotDisplayName,
  hasCustomPlotTitle,
  generatePlotGrid,
  getTreatmentColor,
  Plot,
  PlotGrid,
  ProjectLayoutPayload,
} from '../helpers';
import MyModal from '../../../../../../components/modal';
import { Theme } from '../../../../../../components/theme';
import {
  MutedText,
  SmallH3,
} from '../../../../../../components/commonStyles/styles';
import Input from '../../../../../../components/Input';
import Button from '../../../../../../components/Button';
import { useAuthStore } from '../../../../../../store/auth.store';
import { useAddNewProjectStore } from '../../../../../../store/Projects/AddNewProject.store';
import { createPlotsService } from '../../../../../../services/Projects/Plot';
import {
  useNavigation,
  NavigationProp,
  CommonActions,
} from '@react-navigation/native';
import { useStackScreenStore } from '../../../../../../services/StackScreen/stackScreen.store';
import LoadingState from '../../../../../../components/LoadingState';

interface ProjectLayoutInputProps {
  replications: number;
  treatments: number;
  setselectedTreatmentAndReplication?: React.Dispatch<
    React.SetStateAction<{ treatment: number; replication: number }>
  >;
  projectId: string;
}

interface PlotData {
  title: string;
  replication: number;
  treatment: number;
  plotIndex: [number, number];
}

const ProjectLayout = ({
  replications,
  treatments,
  setselectedTreatmentAndReplication,
  projectId,
}: ProjectLayoutInputProps) => {
  const [grid, setGrid] = useState<PlotGrid>([]);
  const setHeader = useStackScreenStore(state => state.setHeader);
  const resetHeader = useStackScreenStore(state => state.resetHeader);
  const setReplications = useAddNewProjectStore(state => state.setReplications);
  const setTreatments = useAddNewProjectStore(state => state.setTreatments);

  useLayoutEffect(() => {
    setHeader({
      screenTitle: 'New Project',
      headerSubtitle: 'Step 3 of 3',
      showProgressBar: true,
      projectIndex: 3,
      numberOfSteps: 3,
    });

    return () => {
      resetHeader();
    };
  }, [setHeader, resetHeader]);
  const navigation = useNavigation<NavigationProp<any>>();

  const userId = useAuthStore(state => state.user?._id);

  const [selectedPlot, setselectedPlot] = useState<[number, number] | null>(
    null,
  );

  const [selectedPlotData, setselectedPlotData] = useState<PlotData | null>(
    null,
  );
  const [isCreatingPlots, setIsCreatingPlots] = useState(false);
  const plots = flattenPlotGrid(grid);

  React.useEffect(() => {
    setGrid(prev => generatePlotGrid(replications, treatments, prev));
    setReplications(replications);
    setTreatments(treatments);
  }, [replications, setReplications, setTreatments, treatments]);

  React.useEffect(() => {
    if (!setselectedTreatmentAndReplication) return;

    setselectedTreatmentAndReplication({
      replication: replications,
      treatment: treatments,
    });
  }, [replications, setselectedTreatmentAndReplication, treatments]);

  const handleOnSave = () => {
    if (!selectedPlot || !selectedPlotData) return;

    setGrid(prevGrid => {
      const sourceIndex = selectedPlot;
      const targetIndex: [number, number] = [
        selectedPlotData.replication,
        selectedPlotData.treatment,
      ];
      const isValidTarget =
        targetIndex[0] >= 1 &&
        targetIndex[0] <= replications &&
        targetIndex[1] >= 1 &&
        targetIndex[1] <= treatments;

      if (!isValidTarget) {
        return prevGrid;
      }

      const sourceRow = sourceIndex[0] - 1;
      const sourceCol = sourceIndex[1] - 1;
      const targetRow = targetIndex[0] - 1;
      const targetCol = targetIndex[1] - 1;
      const sourcePlot = prevGrid[sourceRow]?.[sourceCol];
      const targetPlot = prevGrid[targetRow]?.[targetCol];

      if (!sourcePlot || !targetPlot) {
        return prevGrid;
      }

      if (
        sourceIndex[0] === targetIndex[0] &&
        sourceIndex[1] === targetIndex[1]
      ) {
        const nextTitle =
          selectedPlotData.title.trim() ||
          getDefaultPlotName(sourcePlot.replication, sourcePlot.treatment);

        return prevGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) =>
            rowIndex === sourceRow && colIndex === sourceCol
              ? {
                  ...cell,
                  title: nextTitle,
                }
              : cell,
          ),
        );
      }

      const nextGrid = prevGrid.map(row => row.map(cell => ({ ...cell })));
      const sourceTreatment = sourcePlot.treatment;
      const targetTreatment = targetPlot.treatment;
      const sourceNextTitle =
        selectedPlotData.title.trim() ||
        getDefaultPlotName(sourcePlot.replication, targetTreatment);
      const targetNextTitle = hasCustomPlotTitle(targetPlot)
        ? targetPlot.title
        : getDefaultPlotName(targetPlot.replication, sourceTreatment);

      nextGrid[sourceRow][sourceCol] = {
        ...nextGrid[sourceRow][sourceCol],
        treatment: targetTreatment,
        title: sourceNextTitle,
      };
      nextGrid[targetRow][targetCol] = {
        ...nextGrid[targetRow][targetCol],
        treatment: sourceTreatment,
        title: targetNextTitle,
      };

      return generatePlotGrid(replications, treatments, nextGrid);
    });
    setselectedPlot(null);
    setselectedPlotData(null);
  };

  const getSelectedDefaultName = () => {
    if (!selectedPlot || !selectedPlotData) {
      return '';
    }

    const sourceRow = selectedPlot[0] - 1;
    const sourceCol = selectedPlot[1] - 1;
    const targetRow = selectedPlotData.replication - 1;
    const targetCol = selectedPlotData.treatment - 1;
    const sourceTreatment = grid[sourceRow]?.[sourceCol]?.treatment;
    const targetTreatment = grid[targetRow]?.[targetCol]?.treatment;

    return getDefaultPlotName(
      selectedPlot[0],
      targetTreatment ?? sourceTreatment ?? selectedPlot[1],
    );
  };

  const generetetePlots = (
    number: number,
    plotType: 'replication' | 'treatment',
  ) => {
    return (
      <>
        {Array.from({ length: number }).map((_, idx) => (
          <View key={idx}>
            <TouchableOpacity
              style={{
                height: 40,
                width: 40,
                backgroundColor: `${
                  plotType === 'treatment'
                    ? selectedPlotData?.treatment === idx + 1
                      ? Theme.colors.primary
                      : Theme.colors.backgroundSecondary
                    : selectedPlotData?.replication === idx + 1
                    ? Theme.colors.primary
                    : Theme.colors.backgroundSecondary
                }`,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                if (!selectedPlotData) return;

                const newIndex: [number, number] =
                  plotType === 'replication'
                    ? [idx + 1, selectedPlotData.treatment]
                    : [selectedPlotData.replication, idx + 1];

                setselectedPlotData({
                  plotIndex: newIndex,
                  replication: newIndex[0],
                  treatment: newIndex[1],
                  title: selectedPlotData.title,
                });
              }}
            >
              <SmallH3
                style={{
                  color:
                    plotType === 'treatment'
                      ? selectedPlotData?.treatment === idx + 1
                        ? Theme.colors.backgroundSecondary
                        : '#7b899d'
                      : selectedPlotData?.replication === idx + 1
                      ? Theme.colors.backgroundSecondary
                      : '#7b899d',
                }}
              >
                {idx + 1}
              </SmallH3>
            </TouchableOpacity>
          </View>
        ))}
      </>
    );
  };

  const nextProcess = useCallback(async () => {
    if (!projectId) return;

    setIsCreatingPlots(true);
    const payload: ProjectLayoutPayload = {
      projectId,
      userId,
      plots: plots.map(plot => ({
        ...plot,
        title: getPlotDisplayName(plot),
        color: getTreatmentColor(plot.treatment),
      })),
    };
    const res = await createPlotsService(payload);
    if (res.status === 201) {
      console.log('Plots created successfully');

      navigation.dispatch(
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
    }

    console.log(payload, 'payload');
    setIsCreatingPlots(false);
  }, [navigation, plots, projectId, userId]);

  useEffect(() => {
    nextProcess();
  }, [nextProcess]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <MyModal
        modalHeader="Configure Plot"
        visible={selectedPlot !== null}
        onClose={() => setselectedPlot(null)}
      >
        <View>
          <Input
            label="Plot Name (optional)"
            placeholder={getSelectedDefaultName()}
            value={selectedPlotData?.title ?? ''}
            onChangeText={text =>
              setselectedPlotData(prev =>
                prev ? { ...prev, title: text } : prev,
              )
            }
          />
          <MutedText style={{ marginTop: 8 }}>
            Default {getSelectedDefaultName()}
          </MutedText>
        </View>

        <View>
          <SmallH3>Replications</SmallH3>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {generetetePlots(replications, 'replication')}
          </View>
          <SmallH3>Treatments</SmallH3>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {generetetePlots(treatments, 'treatment')}
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 16,
          }}
        >
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            onPress={() => setselectedPlot(null)}
          >
            Cancel
          </Button>
          <Button style={{ flex: 1 }} onPress={handleOnSave}>
            Save
          </Button>
        </View>
      </MyModal>
      {isCreatingPlots ? (
        <LoadingState label="Setting up plots..." />
      ) : (
        <View>
          {grid.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex + 1}`}
              style={{ flexDirection: 'row', marginBottom: 8 }}
            >
              {row.map((cell, colIndex) => (
                <TouchableOpacity
                  key={cell?.id ?? `empty-${rowIndex + 1}-${colIndex + 1}`}
                  onPress={() => {
                    if (!cell) return;

                    setselectedPlot(cell.plotIndex);
                    setselectedPlotData({
                      title: hasCustomPlotTitle(cell) ? cell.title : '',
                      replication: cell.replication,
                      treatment: cell.treatment,
                      plotIndex: cell.plotIndex,
                    });
                  }}
                  style={{
                    width: 60,
                    height: 60,
                    marginRight: 8,
                    backgroundColor: cell
                      ? getTreatmentColor(cell.treatment)
                      : '#E5E7EB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 6,
                  }}
                >
                  {cell && (
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 12,
                        textAlign: 'center',
                      }}
                    >
                      {getPlotDisplayName(cell)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default ProjectLayout;
