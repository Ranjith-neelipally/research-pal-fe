import { Pressable, View } from 'react-native';
import React from 'react';
import {
  CardContainer,
  cardGradientColors,
  cardGradientStart,
  cardGradientEnd,
} from '../../../../components/Card/styles';
import { Calendar } from 'lucide-react-native';
import { Theme } from '../../../../components/theme';
import WeatherModal from '../WeatherModal';
import { H1, MutedText } from '../../../../components/commonStyles/styles';

interface DateWeatherCardProps {
  selectedDate: string;
  onOpenCalendar: () => void;
}

const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const DateWeatherCard = ({ selectedDate, onOpenCalendar }: DateWeatherCardProps) => {
  const date = parseLocalDate(selectedDate);
  const currentDay = date.toLocaleDateString(undefined, { weekday: 'long' });
  const currentMonth = date.toLocaleDateString(undefined, { month: 'long' });
  const currentDayNumber = String(date.getDate()).padStart(2, '0');
  const currentYear = String(date.getFullYear());
  return (
    <View>
      <CardContainer
        colors={cardGradientColors}
        start={cardGradientStart}
        end={cardGradientEnd}
      >
        <View style={{ minWidth: 0, gap: 4, padding: 20 }}>
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
        <View
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 108,
            minWidth: 0,
          }}
        >
          <WeatherModal />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenCalendar}
          style={{ alignItems: 'center', marginTop: 8, paddingVertical: 8 }}
        >
          <MutedText>Tap to view calendar</MutedText>
        </Pressable>
      </CardContainer>
    </View>
  );
};

export default DateWeatherCard;
