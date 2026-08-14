import React, { useState } from 'react';
import DateWeatherCard from './DateWeatherCard';
import Ideas from './Ideas';
import { Screen } from '../../../components/commonStyles/styles';
import ScreenHeader from '../../../components/ScreenHeader';
import { useDateStore } from '../../../store/date.store';
import MyModal from '../../../components/modal';
import CustomCalendar from '../../../components/Calender';

const Home = () => {
  const today = useDateStore(state => state.currentDate);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setCalendarVisible(false);
  };

  return (
    <Screen>
      <ScreenHeader subtitle="Quick capture & field notes" />
      <DateWeatherCard
        selectedDate={selectedDate}
        onOpenCalendar={() => setCalendarVisible(true)}
      />
      <Ideas selectedDate={selectedDate} onSelectedDateChange={setSelectedDate} />
      <MyModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        modalHeader="Select date"
      >
        <CustomCalendar
          selectedDate={selectedDate}
          current={selectedDate}
          onSelectDate={selectDate}
        />
      </MyModal>
    </Screen>
  );
};

export default Home;
