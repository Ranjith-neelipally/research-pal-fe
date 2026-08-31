import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { Card } from '../../../../components/Card/styles';
import { MutedText } from '../../../../components/commonStyles/styles';
import { Project } from '../../../../store/Projects/Projects.store';
import {
  getPlotDisplayName,
  getTreatmentColor,
  Plot,
} from '../AddNewProject/Structure/helpers';
interface YourComponentProps {
  project: Project | undefined;
  grid: (Plot | null)[][];
  handlePlotPress: (plot: Plot | null) => () => void;
}

const lol = () => {};

const ProjectStructure: React.FC<YourComponentProps> = ({
  project,
  grid,
  handlePlotPress,
}) => {
  const MIN_CELL_WIDTH = 60;
  const GAP = 8;

  const [gridWidth, setGridWidth] = useState(0);

  const columnCount = Math.max(...grid.map(row => row.length));

  const cellWidth =
    gridWidth > 0
      ? Math.max(
          MIN_CELL_WIDTH,
          (gridWidth - GAP * (columnCount - 1)) / columnCount,
        )
      : MIN_CELL_WIDTH;
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
              <MutedText>T{index + 1}</MutedText>
            </View>
          ))}
        </View>
      </Card>
      <MutedText style={{ textAlign: 'center' }}>
        Tap any plot to view or add notes and images.
      </MutedText>
    </View>
  );
};

export default ProjectStructure;
