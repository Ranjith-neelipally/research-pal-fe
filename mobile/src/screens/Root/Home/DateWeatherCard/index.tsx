import { View, Text } from 'react-native';
import React from 'react';
import {
  CardContainer,
  cardGradientColors,
  cardGradientStart,
  cardGradientEnd,
} from '../../../../components/Card/styles';
import { Calendar } from 'lucide-react-native';
import { Theme } from '../../../../components/theme';
import { useDateStore } from '../../../../store/date.store';
import WeatherModal from '../WeatherModal';
import { H1, MutedText } from '../../../../components/commonStyles/styles';

const DateWeatherCard = () => {
  const { currentDay, currentDayNumber, currentMonth, currentYear } =
    useDateStore();
  return (
    <View>
      <CardContainer
        colors={cardGradientColors}
        start={cardGradientStart}
        end={cardGradientEnd}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Calendar size={14} color={Theme.colors.mutedForeground} />
              <MutedText>{currentDay}</MutedText>
            </View>
            <H1>
              {currentMonth} {currentDayNumber}
            </H1>
            <MutedText>{currentYear}</MutedText>
          </View>
          <View>
            <WeatherModal />
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <MutedText>Tap to view calendar</MutedText>
        </View>
      </CardContainer>
    </View>
  );
};

export default DateWeatherCard;
