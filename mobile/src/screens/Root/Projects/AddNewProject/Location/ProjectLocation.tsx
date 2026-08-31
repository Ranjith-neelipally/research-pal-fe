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

type Coordinates = {
  latitude: number;
  longitude: number;
};

const getCurrentPosition = (
  options: {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
  },
): Promise<Coordinates> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      reject,
      options,
    );
  });

const ProjectLocation = () => {
  const router = useNavigation<NavigationProp<any>>();
  const setHeader = useStackScreenStore(state => state.setHeader);
  const resetHeader = useStackScreenStore(state => state.resetHeader);

  const [location, setLocation] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');
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
    setLocationError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            'User-Agent': 'ResearchPal/1.0 (research-pal)',
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
    } catch {
      setSearchResults([]);
      const message = 'Unable to search location right now.';
      setLocationError(message);
      Alert.alert('Location search failed', message);
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
    if (Platform.OS !== 'android') {
      return true;
    }

    const coarsePermission = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
    const hasLocation = await PermissionsAndroid.check(coarsePermission);
    if (hasLocation) {
      return true;
    }

    const granted = await PermissionsAndroid.request(coarsePermission, {
      title: 'Location Permission',
      message:
        'ResearchPal needs access to your location to mark the project location.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
      buttonNeutral: 'Ask Me Later',
    });

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const reverseGeocode = async ({ latitude, longitude }: Coordinates) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'ResearchPal/1.0 (research-pal)',
          Accept: 'application/json',
        },
      },
    );

    const geo = await res.json();
    if (typeof geo?.display_name === 'string' && geo.display_name.trim()) {
      return geo.display_name.trim();
    }

    throw new Error('Unable to resolve place name from coordinates.');
  };

  const fetchReliableCoordinates = async () => {
    try {
      return await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 25000,
        maximumAge: 0,
      });
    } catch (firstError: any) {
      if (firstError?.code !== 3) {
        throw firstError;
      }

      return getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 15000,
      });
    }
  };

  const handleCurrentLocation = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      setLocationError('Location permission was not granted.');
      Alert.alert('Permission denied', 'Location permission was not granted.');
      return;
    }

    setLoadingLocation(true);
    setLocationError('');

    try {
      const coordinates = await fetchReliableCoordinates();
      const place = await reverseGeocode(coordinates);
      setLocation(place);
      setShowSuggestions(false);
      setSearchResults([]);
    } catch (error: any) {
      const message = error?.message || 'Unable to get current location.';
      setLocationError(message);
      Alert.alert('Location error', message);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleContinue = () => {
    if (!location.trim()) {
      const message = 'Location is required to continue.';
      setLocationError(message);
      Alert.alert('Location required', message);
      return;
    }

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
        setLocationError('');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              setLocationError('');
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
            error={locationError || undefined}
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
                {loadingLocation
                  ? 'Getting current location...'
                  : 'Use current location'}
              </MutedText>
            </View>
          </TouchableOpacity>

          {!loadingLocation && !!locationError && (
            <TouchableOpacity onPress={handleCurrentLocation}>
              <MutedText style={{ marginTop: 8, color: Theme.colors.primary }}>
                Retry current location
              </MutedText>
            </TouchableOpacity>
          )}

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

          <Button
            disabled={loadingLocation || location.trim() === ''}
            onPress={handleContinue}
            style={{ marginTop: 16 }}
          >
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

export default ProjectLocation;
