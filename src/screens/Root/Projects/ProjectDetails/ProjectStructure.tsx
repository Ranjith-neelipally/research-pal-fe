import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
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

const ProjectStructure: React.FC<YourComponentProps> = ({
  project,
  grid,
  handlePlotPress,
}) => {
  return (
    <View style={{ maxHeight: '72%', flex: 1, gap: 12 }}>
      <Card style={{ flex: 1, gap: 12 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, borderRadius: 4 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flex: 1 }}>
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
                      key={cell?.id ?? `empty-${rowIndex + 1}-${colIndex + 1}`}
                      style={{
                        minWidth: 60,
                        minHeight: 60,
                        height: '100%',
                        width: '100%',
                        flex: 1,
                        marginRight: 8,
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
                      }}
                      onPress={handlePlotPress(cell)}
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
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          {project?.plotColors.map((color, index) => (
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
        Tap any plot to view or add notes
      </MutedText>
    </View>
  );
};

export default ProjectStructure;
