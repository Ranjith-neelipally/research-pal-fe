import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  H2,
  MutedText as Text,
} from '../../../../components/commonStyles/styles';
import { Droplets } from 'lucide-react-native';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudFog,
  Zap,
} from 'lucide-react-native';
import { Theme } from '../../../../components/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTO_WEATHER_KEY } from '../../../../services/settings';

type Units = {
  tempParam: 'celsius' | 'fahrenheit';
  windParam: 'kmh' | 'mph' | 'ms' | 'kn';
  precipParam: 'mm' | 'inch';
  tempLabel: '°C' | '°F';
  windLabel: 'km/h' | 'mph';
  precipLabel: 'mm' | 'in';
};

interface LocationInfo {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

interface WeatherData {
  currentTemp: number;
  high: number;
  low: number;
  precip2d: number;
  wind: number;
  code: number;
  is_day: number;
}

const pickUnitsByCountry = (cc: string): Units => {
  const upper = (cc || '').toUpperCase();
  const usesImperial =
    upper === 'US' ||
    upper === 'BS' ||
    upper === 'BZ' ||
    upper === 'KY' ||
    upper === 'PW' ||
    upper === 'LR';
  // UK uses mph for wind even though temp is °C
  if (upper === 'GB') {
    return {
      tempParam: 'celsius',
      windParam: 'mph',
      precipParam: 'mm',
      tempLabel: '°C',
      windLabel: 'mph',
      precipLabel: 'mm',
    };
  }
  if (usesImperial) {
    return {
      tempParam: 'fahrenheit',
      windParam: 'mph',
      precipParam: 'inch',
      tempLabel: '°F',
      windLabel: 'mph',
      precipLabel: 'in',
    };
  }
  return {
    tempParam: 'celsius',
    windParam: 'kmh',
    precipParam: 'mm',
    tempLabel: '°C',
    windLabel: 'km/h',
    precipLabel: 'mm',
  };
};

export const iconAndLabelForCode = (code: number, isDay: number) => {
  if ([0, 1].includes(code)) {
    return {
      icon:
        isDay === 1 ? (
          <Sun size={32} color="#FFD700" />
        ) : (
          <Moon size={32} color="#B0C4DE" />
        ),
      label: isDay === 1 ? 'Sunny' : 'Clear Night',
    };
  }
  if ([2, 3].includes(code)) {
    return {
      icon:
        isDay === 1 ? (
          <CloudSun size={32} color="#B0C4DE" />
        ) : (
          <CloudMoon size={32} color="#B0C4DE" />
        ),
      label: 'Cloudy',
    };
  }
  if ([45, 48].includes(code)) {
    return {
      icon: <CloudFog size={32} color="#B0C4DE" />,
      label: 'Fog',
    };
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return {
      icon: <CloudRain size={32} color="#1E90FF" />,
      label: 'Rain',
    };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      icon: <CloudSnow size={32} color="#ADD8E6" />,
      label: 'Snow',
    };
  }
  if ([95, 96, 99].includes(code)) {
    return {
      icon: <Zap size={32} color="#FFD700" />,
      label: 'Thunderstorm',
    };
  }
  return {
    icon: <Cloud size={32} color="#B0C4DE" />,
    label: 'Unknown',
  };
};

export default function WeatherModal() {
  const [loc, setLoc] = useState<LocationInfo | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoWeather, setAutoWeather] = useState<boolean | null>(null);

  const units = useMemo<Units>(
    () => pickUnitsByCountry(loc?.countryCode ?? 'US'),
    [loc?.countryCode],
  );

  useEffect(() => {
    AsyncStorage.getItem(AUTO_WEATHER_KEY).then(value => setAutoWeather(value !== 'false'));
  }, []);

  useEffect(() => {
    if (autoWeather === null) return;
    if (!autoWeather) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const locRes = await fetch('https://ipwho.is/');
        const l = await locRes.json();
        if (!l.success) throw new Error('Location lookup failed');

        const picked: LocationInfo = {
          city: l.city,
          country: l.country,
          countryCode: l.country_code,
          latitude: l.latitude,
          longitude: l.longitude,
        };
        setLoc(picked);

        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${picked.latitude}` +
          `&longitude=${picked.longitude}` +
          `&current_weather=true` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&temperature_unit=${units.tempParam}` +
          `&wind_speed_unit=${units.windParam}` +
          `&precipitation_unit=${units.precipParam}` +
          `&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.current_weather && data.daily) {
          const precipAvg =
            ((data.daily.precipitation_probability_max?.[0] ?? 0) +
              (data.daily.precipitation_probability_max?.[1] ?? 0)) /
            2;

          setWeather({
            currentTemp: data.current_weather.temperature,
            high: data.daily.temperature_2m_max?.[0],
            low: data.daily.temperature_2m_min?.[0],
            precip2d: Math.round(precipAvg),
            wind: data.current_weather.windspeed,
            code: data.current_weather.weathercode,
            is_day: data.current_weather.is_day,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [autoWeather, units.tempParam, units.windParam, units.precipParam]);

  console.log(weather, 'weather data');

  if (loading) {
    return (
      <View style={{ width: '100%', minWidth: 0, alignItems: 'flex-end' }}>
        <ActivityIndicator size="small" color="#B8E6B8" />
        <Text numberOfLines={1}>Loading weather…</Text>
      </View>
    );
  }

  if (!autoWeather) {
    return (
      <View style={{ width: '100%', minWidth: 0, alignItems: 'flex-end' }}>
        <Text numberOfLines={1}>Auto Weather off</Text>
      </View>
    );
  }

  if (!weather || !loc) {
    return (
      <View style={{ width: '100%', minWidth: 0, alignItems: 'flex-end' }}>
        <Text numberOfLines={1}>Weather unavailable</Text>
      </View>
    );
  }
  const { icon, label } = iconAndLabelForCode(weather.code, weather.is_day);

  return (
    <View style={{ width: '100%', minWidth: 0, alignItems: 'flex-end' }}>
      <View style={{ width: '100%', minWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
        {icon}
        <H2 style={{ flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {weather.currentTemp} °
        </H2>
      </View>
      <Text numberOfLines={1}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Droplets color={Theme.colors.mutedForeground} size={12} />

        <Text>{weather.precip2d} %</Text>
      </View>
    </View>
  );
}
