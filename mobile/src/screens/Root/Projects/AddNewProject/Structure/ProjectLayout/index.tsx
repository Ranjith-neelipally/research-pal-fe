import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useLayoutEffect, useState } from 'react';
import {
  buildGrid,
  getDefaultPlotName,
  getPlotCustomName,
  getPlotDisplayName,
  getPlotId,
  getTreatmentColor,
  generatePlots,
  Plot,
} from '../helpers';
import MyModal from '../../../../../../components/modal';
import { Theme } from '../../../../../../components/theme';
import {
  MutedText,
  SmallH3,
} from '../../../../../../components/commonStyles/styles';
import Input from '../../../../../../components/Input';
import Button from '../../../../../../components/Button';
import { useAddNewProjectStore } from '../../../../../../store/Projects/AddNewProject.store';
import { useStackScreenStore } from '../../../../../../services/StackScreen/stackScreen.store';

interface ProjectLayoutInputProps {
  replications: number;
  treatments: number;
  setselectedTreatmentAndReplication?: React.Dispatch<
    React.SetStateAction<{ treatment: number; replication: number }>
  >;
  onPlotsChange: (plots: Plot[]) => void;
}

interface PlotData {
  name?: string;
  replication: number;
  treatment: number;
  plotIndex: [number, number];
}

const ProjectLayout = ({
  replications,
  treatments,
  setselectedTreatmentAndReplication,
  onPlotsChange,
}: ProjectLayoutInputProps) => {
  const [plots, setPlots] = useState<Plot[]>([]);
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
  const [selectedPlot, setselectedPlot] = useState<[number, number] | null>(
    null,
  );

  const [selectedPlotData, setselectedPlotData] = useState<PlotData | null>(
    null,
  );

  const grid = buildGrid(plots, replications, treatments);

  React.useEffect(() => {
    setPlots(prev => {
      const next = generatePlots(replications, treatments);

      return next.map(p => {
        const existing = prev.find(
          x =>
            x.plotIndex[0] === p.plotIndex[0] &&
            x.plotIndex[1] === p.plotIndex[1],
        );

        return existing
          ? {
              ...existing,
              id: getPlotId(existing.plotIndex[0], existing.plotIndex[1]),
              customName: getPlotCustomName(existing),
              title: getPlotDisplayName(existing),
              color: getTreatmentColor(existing.treatment),
            }
          : p;
      });
    });
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

  React.useEffect(() => {
    onPlotsChange(plots);
  }, [onPlotsChange, plots]);

  const getSelectedPlotObject = () => {
    if (!selectedPlot) {
      return null;
    }

    return plots.find(
      plot =>
        plot.plotIndex[0] === selectedPlot[0] &&
        plot.plotIndex[1] === selectedPlot[1],
    );
  };

  const handleOnSave = () => {
    if (!selectedPlot || !selectedPlotData) return;
    setPlots(prev =>
      prev.map(plot => {
        const isSelected =
          plot.plotIndex[0] === selectedPlot[0] &&
          plot.plotIndex[1] === selectedPlot[1];

        if (!isSelected) return plot;

        const newReplication = selectedPlotData.replication;
        const newTreatment = selectedPlotData.treatment;
        const customName = selectedPlotData.name?.trim() || undefined;

        return {
          ...plot,
          id: getPlotId(plot.plotIndex[0], plot.plotIndex[1]),
          replication: newReplication,
          treatment: newTreatment,
          title: customName || getDefaultPlotName(newReplication, newTreatment),
          customName,
          color: getTreatmentColor(newTreatment),
        };
      }),
    );

    setselectedPlot(null);
    setselectedPlotData(null);
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
                  plotIndex: selectedPlotData.plotIndex,
                  replication: newIndex[0],
                  treatment: newIndex[1],
                  name: selectedPlotData.name,
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


  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <MyModal
        modalHeader="Configure Plot"
        visible={selectedPlot !== null}
        onClose={() => {
          setselectedPlot(null);
          setselectedPlotData(null);
        }}
      >
        <View>
          <Input
            label="Plot Name (optional)"
            placeholder={
              getSelectedPlotObject()
                ? getDefaultPlotName(
                    getSelectedPlotObject()!.replication,
                    getSelectedPlotObject()!.treatment,
                  )
                : ''
            }
            value={selectedPlotData?.name ?? ''}
            onChangeText={text =>
              setselectedPlotData(prev =>
                prev ? { ...prev, name: text } : prev,
              )
            }
          />
          <MutedText style={{ marginTop: 8 }}>
            Default{' '}
            {getSelectedPlotObject()
              ? getDefaultPlotName(
                  getSelectedPlotObject()!.replication,
                  getSelectedPlotObject()!.treatment,
                )
              : ''}
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
      <View>
        {grid.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={{ flexDirection: 'row', marginBottom: 8 }}
          >
            {row.map((cell, colIndex) => (
              <TouchableOpacity
                key={
                  cell?.id ??
                  `empty-${cell && cell.replication + 1}-${colIndex + 1}`
                }
                onPress={() => {
                  if (!cell) return;

                  setselectedPlot(cell.plotIndex);
                  setselectedPlotData({
                    name: getPlotCustomName(cell) ?? '',
                    replication: cell.replication,
                    treatment: cell.treatment,
                    plotIndex: cell.plotIndex,
                  });
                }}
                style={{
                  width: 60,
                  height: 60,
                  marginRight: 8,
                  backgroundColor: cell?.color ?? '#E5E7EB',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 6,
                }}
              >
                {cell && (
                  <Text style={{ color: '#fff', fontSize: 12 }}>
                    {getPlotDisplayName(cell)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ProjectLayout;
