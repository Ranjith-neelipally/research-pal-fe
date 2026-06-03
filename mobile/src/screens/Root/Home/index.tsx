import { View, Text } from 'react-native';
import React from 'react';
import DateWeatherCard from './DateWeatherCard';
import Ideas from './Ideas';
import { H1, MutedText, Screen } from '../../../components/commonStyles/styles';
import ScreenHeader from '../../../components/ScreenHeader';

const Home = () => {
  return (
    <Screen>
      <ScreenHeader subtitle="Quick capture & field notes" />
      <DateWeatherCard />
      <Ideas />
    </Screen>
  );
};

export default Home;
