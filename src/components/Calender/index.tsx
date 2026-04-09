import { View } from 'react-native';
import React from 'react';
import { Calendar, CalendarProps } from 'react-native-calendars';
import { Theme } from '../theme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface CustomCalendarProps extends CalendarProps {
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

const CustomCalendar = ({
  selectedDate,
  onSelectDate,
  ...props
}: CustomCalendarProps) => {
  const today = new Date().toISOString().split('T')[0];

  const renderArrow = (direction: 'left' | 'right') => (
    <View style={{ padding: 4 }}>
      {direction === 'left' ? (
        <ChevronLeft size={16} color={Theme.colors.mutedForeground} />
      ) : (
        <ChevronRight size={16} color={Theme.colors.mutedForeground} />
      )}
    </View>
  );

  // Mark today and selectedDate, but avoid duplicate if both are same
  const markedDates: Record<string, any> = {};
  if (today === selectedDate) {
    markedDates[today] = {
      customStyles: {
        container: {
          backgroundColor: '#B8E6B8',
          borderRadius: 8,
        },
        text: {
          color: '#2D3748',
        },
      },
    };
  } else {
    markedDates[today] = {
      customStyles: {
        container: {
          backgroundColor: 'rgba(184,230,184,0.2)',
          borderRadius: 8,
        },
        text: {
          color: '#B8E6B8',
        },
      },
    };
    if (selectedDate) {
      markedDates[selectedDate] = {
        customStyles: {
          container: {
            backgroundColor: '#B8E6B8',
            borderRadius: 8,
          },
          text: {
            color: '#2D3748',
          },
        },
      };
    }
  }

  return (
    <View>
      <Calendar
        markingType="custom"
        markedDates={markedDates}
        onDayPress={day => onSelectDate && onSelectDate(day.dateString)}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          textDayFontSize: 14,
          textDayFontFamily: 'System',
          todayTextColor: '#B8E6B8',
          textDayFontWeight: '400',
          textMonthFontSize: 14,
          textMonthFontWeight: '600',
          dayTextColor: '#e7ebef',
          selectedDayTextColor: '#2D3748',
          monthTextColor: '#e7ebef',
          textDisabledColor: '#555',
          arrowColor: '#B8E6B8',
        }}
        renderArrow={renderArrow}
        {...props}
      />
    </View>
  );
};

export default CustomCalendar;
