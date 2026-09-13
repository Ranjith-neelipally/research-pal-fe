import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { Card } from '../../../../components/Card/styles';
import { MutedText } from '../../../../components/commonStyles/styles';
import { Project } from '../../../../store/Projects/Projects.store';
import {
  getPlotDisplayName,
  getReplicationDisplayName,
  getTreatmentDisplayName,
  getTreatmentColor,
  Plot,
} from '../AddNewProject/Structure/helpers';
import MyModal from '../../../../components/modal';
import Input from '../../../../components/Input';
import Button from '../../../../components/Button';
interface YourComponentProps {
  project: Project | undefined;
  grid: (Plot | null)[][];
  handlePlotPress: (plot: Plot | null) => () => void;
  onRenamePlot?: (plot: Plot, name: string) => Promise<void>;
  onRenameLabel?: (
    type: 'replication' | 'treatment',
    value: number,
    name: string,
  ) => Promise<void>;
}

const ProjectStructure: React.FC<YourComponentProps> = ({
  project,
  grid,
  handlePlotPress,
  onRenamePlot,
  onRenameLabel,
}) => {
  const MIN_CELL_WIDTH = 60;
  const GAP = 8;

  const [gridWidth, setGridWidth] = useState(0);
  const [renameTarget, setRenameTarget] = useState<{
    type: 'replication' | 'treatment';
    value: number;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [plotActionTarget, setPlotActionTarget] = useState<Plot | null>(null);
  const [renamePlotTarget, setRenamePlotTarget] = useState<Plot | null>(null);
  const [renamePlotValue, setRenamePlotValue] = useState('');

  const columnCount = Math.max(...grid.map(row => row.length));

  const cellWidth =
    gridWidth > 0
      ? Math.max(
          MIN_CELL_WIDTH,
          (gridWidth - GAP * (columnCount - 1)) / columnCount,
        )
      : MIN_CELL_WIDTH;
  const plots = grid.flat().filter((plot): plot is Plot => Boolean(plot));
  const replications = Array.from(new Set(plots.map(plot => plot.replication))).sort((a, b) => a - b);

  const labelFor = (type: 'replication' | 'treatment', value: number) => {
    const plot = plots.find(item => item[type] === value);
    if (!plot) return type === 'replication' ? `R${value}` : `T${value}`;
    return type === 'replication'
      ? getReplicationDisplayName(plot)
      : getTreatmentDisplayName(plot);
  };

  const openRenameLabel = (type: 'replication' | 'treatment', value: number) => {
    if (!onRenameLabel) return;
    setRenameTarget({ type, value });
    setRenameValue(labelFor(type, value));
  };

  const closeRenameLabel = () => {
    setRenameTarget(null);
    setRenameValue('');
  };

  const saveRenameLabel = async () => {
    if (!renameTarget || !onRenameLabel) return;
    await onRenameLabel(renameTarget.type, renameTarget.value, renameValue.trim());
    closeRenameLabel();
  };

  const openPlotActions = (plot: Plot | null) => {
    if (!plot) return;
    setPlotActionTarget(plot);
  };

  const closePlotActions = () => {
    setPlotActionTarget(null);
  };

  const openRenamePlot = () => {
    if (!plotActionTarget || !onRenamePlot) return;
    setRenamePlotTarget(plotActionTarget);
    setRenamePlotValue(getPlotDisplayName(plotActionTarget));
    closePlotActions();
  };

  const closeRenamePlot = () => {
    setRenamePlotTarget(null);
    setRenamePlotValue('');
  };

  const saveRenamePlot = async () => {
    if (!renamePlotTarget || !onRenamePlot) return;
    await onRenamePlot(renamePlotTarget, renamePlotValue);
    closeRenamePlot();
  };

  return (
    <View style={{ maxHeight: '72%', flex: 1, gap: 12 }}>
      <Card style={{ flex: 1, gap: 12 }}>
        <View
  style={{ flex: 1 }}
  onLayout={e => {
    setGridWidth(e.nativeEvent.layout.width);
  }}
>
  <ScrollView
    showsVerticalScrollIndicator={false}
    style={{ flex: 1, borderRadius: 4 }}
  >
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View>
        {grid.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={{
              flexDirection: 'row',
              marginBottom: 8,
            }}
          >
            {row.map((cell, colIndex) => (
              <TouchableOpacity
                key={
                  cell?.id ??
                  `empty-${rowIndex + 1}-${colIndex + 1}`
                }
                style={{
                  width: cellWidth,
                  height: cellWidth,

                  marginRight:
                    colIndex === row.length - 1 ? 0 : GAP,

                  backgroundColor: cell
                    ? `${getTreatmentColor(cell.treatment)}50`
                    : '#2b303b',

                  borderWidth: 2,
                  borderColor: cell
                    ? getTreatmentColor(cell.treatment)
                    : 'transparent',

                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
                onPress={handlePlotPress(cell)}
                onLongPress={() => openPlotActions(cell)}
              >
                {cell && (
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      textAlign: 'center',
                      paddingHorizontal: 4,
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
    </ScrollView>
  </ScrollView>
</View>
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          {(project?.plotColors || []).map((color, index) => (
            <View
              style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}
              key={color}
            >
              <View
                key={color}
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  borderRadius: 10,
                }}
              ></View>
              <TouchableOpacity onPress={() => openRenameLabel('treatment', index + 1)}>
                <MutedText>{labelFor('treatment', index + 1)}</MutedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {replications.map(replication => (
            <TouchableOpacity
              key={replication}
              onPress={() => openRenameLabel('replication', replication)}
            >
              <MutedText>{labelFor('replication', replication)}</MutedText>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
      <MyModal
        modalHeader={
          renameTarget?.type === 'replication'
            ? 'Rename Replication'
            : 'Rename Treatment'
        }
        visible={renameTarget !== null}
        onClose={closeRenameLabel}
        keyboardAware
      >
        <Input
          label="Display Name"
          placeholder={
            renameTarget
              ? renameTarget.type === 'replication'
                ? `R${renameTarget.value}`
                : `T${renameTarget.value}`
              : ''
          }
          value={renameValue}
          onChangeText={setRenameValue}
        />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Button style={{ flex: 1 }} variant="secondary" onPress={closeRenameLabel}>
            Cancel
          </Button>
          <Button style={{ flex: 1 }} onPress={saveRenameLabel}>
            Save
          </Button>
        </View>
      </MyModal>
      <MyModal
        visible={plotActionTarget !== null}
        onClose={closePlotActions}
        placement="bottom"
        contentStyle={{ gap: 12 }}
      >
        <Text
          style={{
            color: '#e7ebef',
            fontSize: 16,
            fontWeight: '700',
          }}
        >
          {plotActionTarget ? getPlotDisplayName(plotActionTarget) : 'Plot'}
        </Text>
        <Button onPress={openRenamePlot}>Rename plot</Button>
        <Button variant="secondary" onPress={closePlotActions}>
          Cancel
        </Button>
      </MyModal>
      <MyModal
        modalHeader="Rename Plot"
        visible={renamePlotTarget !== null}
        onClose={closeRenamePlot}
        keyboardAware
      >
        <Input
          label="Display Name"
          placeholder={
            renamePlotTarget
              ? `R${renamePlotTarget.replication}-T${renamePlotTarget.treatment}`
              : ''
          }
          value={renamePlotValue}
          onChangeText={setRenamePlotValue}
          autoFocus
          maxLength={100}
        />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Button style={{ flex: 1 }} variant="secondary" onPress={closeRenamePlot}>
            Cancel
          </Button>
          <Button style={{ flex: 1 }} onPress={saveRenamePlot}>
            Save
          </Button>
        </View>
      </MyModal>
      <MutedText style={{ textAlign: 'center' }}>
        Tap any plot to view or add notes and images.
      </MutedText>
    </View>
  );
};

export default ProjectStructure;
