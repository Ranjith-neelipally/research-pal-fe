import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PermissionsAndroid,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import React, { useLayoutEffect, useState, useEffect, useRef } from 'react';
import {
  H3,
  MutedText,
  Screen,
} from '../../../../../components/commonStyles/styles';
import { MapPin } from 'lucide-react-native/icons';
import { Theme } from '../../../../../components/theme';
import Input from '../../../../../components/Input';
import Button from '../../../../../components/Button';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAddNewProjectStore } from '../../../../../store/Projects/AddNewProject.store';
import { useStackScreenStore } from '../../../../../services/StackScreen/stackScreen.store';

const ProjectLocation = () => {
  const router = useNavigation<NavigationProp<any>>();
  const setHeader = useStackScreenStore(state => state.setHeader);
  const resetHeader = useStackScreenStore(state => state.resetHeader);

  const [location, setLocation] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    setLoadingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            'User-Agent': 'ResearchPal/1.0 (ranjithkrn99@gmail.com)',
            Accept: 'application/json',
          },
        },
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setSearchResults([]);
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'ResearchPal needs access to your location to mark the project location.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask Me Later',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    // iOS permission flow handled by Geolocation API by Info.plist declaration
    return true;
  };

  const handleCurrentLocation = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Permission denied', 'Location permission was not granted.');
      return;
    }

    setLoadingLocation(true);
    Geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'ResearchPal/1.0 (ranjithkrn99@gmail.com)',
                Accept: 'application/json',
              },
            },
          );

          const text = await res.text();
          let geo;
          try {
            geo = JSON.parse(text);
          } catch (parseErr) {
            console.warn('Reverse geo parse failed, got:', text);
            throw parseErr;
          }

          const place = geo?.display_name || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`;
          setLocation(place);
        } catch (err) {
          console.error('Reverse geo error:', err);
          setLocation(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
        }

        setLoadingLocation(false);
      },
        (      error: { message: any; }) => {
        console.error('Location error:', error);
        Alert.alert('Location error', error.message || 'Unable to get location');
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };

  const handleContinue = () => {
    router.navigate('ProjectStructure');
  };

  const setAddNewProjectLocation = useAddNewProjectStore(
    state => state.setLocation,
  );

  React.useEffect(() => {
    setAddNewProjectLocation(location);
  }, [location, setAddNewProjectLocation]);

  useLayoutEffect(() => {
    setHeader({
      screenTitle: 'New Project',
      headerSubtitle: 'Step 2 of 3',
      showProgressBar: true,
      projectIndex: 2,
      numberOfSteps: 3,
    });

    return () => {
      resetHeader();
    };
  }, [setHeader, resetHeader]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => {
        setLocation(item.display_name);
        setSearchResults([]);
        setShowSuggestions(false);
      }}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#272c35',
      }}
    >
      <Text style={{ color: '#e7ebef', fontSize: 14, lineHeight: 20 }}>
        {item.display_name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'android' ? 180 : 0}
      >
        <View style={{ flex: 1, padding: 16 }}>
          <View
            style={{
              backgroundColor: '#30a65b1a',
              height: 56,
              width: 56,
              justifyContent: 'center',
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <MapPin height={32} width={32} color={Theme.colors.primary} />
          </View>
          <H3>Location</H3>
          <Input
            onChangeText={text => {
              setLocation(text);
              setShowSuggestions(!!text.trim());
              if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
              }
              debounceTimeout.current = setTimeout(() => {
                if (text.trim()) {
                  searchLocation(text);
                } else {
                  setSearchResults([]);
                }
              }, 700);
            }}
            value={location || ''}
            placeholder="e.g., Field Station A, Block 3"
            label="Where is this experiment taking place?"
          />
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
            }}
            onPress={handleCurrentLocation}
            disabled={loadingLocation}
          >
            <MapPin size={16} color={Theme.colors.primary} />
            <View
              style={{
                paddingLeft: 8,
                justifyContent: 'center',
              }}
            >
              <MutedText style={{ color: Theme.colors.primary }}>
                {loadingLocation ? 'Getting current location...' : 'Use current location'}
              </MutedText>
            </View>
          </TouchableOpacity>

          {showSuggestions && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: '#161b22',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#272c35',
                overflow: 'hidden',
                maxHeight: 220,
              }}
            >
              <FlatList
                data={searchResults}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                nestedScrollEnabled
                keyExtractor={item => item.place_id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={
                  !loadingLocation ? (
                    <Text style={{ color: '#7b899d', padding: 12 }}>
                      No suggestions found.
                    </Text>
                  ) : (
                    <Text style={{ color: '#7b899d', padding: 12 }}>
                      Searching locations...
                    </Text>
                  )
                }
              />
            </View>
          )}

          <Button disabled={location === ''} onPress={handleContinue} style={{ marginTop: 16 }}>
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

export default ProjectLocation;
