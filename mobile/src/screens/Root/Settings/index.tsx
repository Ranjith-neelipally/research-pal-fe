import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  Pencil,
} from 'lucide-react-native';
import { Card } from '../../../components/Card/styles';
import {
  H1,
  H3,
  MutedText,
  TextSecondary,
} from '../../../components/commonStyles/styles';
import { Theme } from '../../../components/theme';
import { useAuthStore } from '../../../store/auth.store';
import { getAttachedPhotoStorageStats } from '../../../localStorage';
import { logoutService } from '../../../services/login';
import {
  AUTO_WEATHER_KEY,
  changePassword,
  getProfile,
  getSessions,
  revokeSession,
  updateProfile,
} from '../../../services/settings';
import { getAllProjectsService } from '../../../services/Projects/Project';
import { useProjectsStore } from '../../../store/Projects/Projects.store';

type Sheet = 'edit' | 'password' | 'sessions' | 'signout' | null;
type Session = {
  id: string;
  title: string;
  subtitle: string;
  current: boolean;
};

const bytes = (value: number) => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / Math.pow(1024, index)).toFixed(index > 2 ? 1 : 0)} ${
    units[index]
  }`;
};

const SettingRow = ({ icon, title, detail, onPress, danger = false }: any) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
  >
    <View style={styles.rowStart}>
      {icon}
      <View>
        <TextSecondary style={danger && styles.danger}>{title}</TextSecondary>
        {detail ? <MutedText>{detail}</MutedText> : null}
      </View>
    </View>
    <ChevronRight size={18} color={Theme.colors.mutedForeground} />
  </Pressable>
);

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const authUser = useAuthStore(state => state.user);
  const projects = useProjectsStore(state => state.projectsData);
  const [profile, setProfile] = useState<any>(authUser);
  const [footprint, setFootprint] = useState<{
    projects: number;
    photos: number;
    used: number;
    allowance: number | null;
  }>({ projects: 0, photos: 0, used: 0, allowance: null });
  const [autoWeather, setAutoWeather] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [name, setName] = useState(authUser?.username || '');
  const [profession, setProfession] = useState(authUser?.profession || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [, remoteProfile, weatherValue, photoStats] = await Promise.all([
      authUser?._id
        ? getAllProjectsService(authUser._id)
        : Promise.resolve(null),
      getProfile().catch(() => null),
      AsyncStorage.getItem(AUTO_WEATHER_KEY),
      getAttachedPhotoStorageStats(),
    ]);
    if (remoteProfile) {
      setProfile({
        ...authUser,
        username: remoteProfile.name,
        ...remoteProfile,
      });
      setName(remoteProfile.name || '');
      setProfession(remoteProfile.profession || '');
    }
    setAutoWeather(weatherValue !== 'false');
    setFootprint({
      projects: useProjectsStore.getState().projectsData.length,
      photos: photoStats.photoCount,
      used: photoStats.usedBytes,
      allowance: photoStats.allowanceBytes,
    });
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() =>
        Alert.alert(
          'Settings',
          'Some account information could not be loaded.',
        ),
      );
    }, [load]),
  );

  const toggleWeather = async (enabled: boolean) => {
    setAutoWeather(enabled);
    await AsyncStorage.setItem(AUTO_WEATHER_KEY, String(enabled));
  };

  const openSessions = async () => {
    setSheet('sessions');
    setLoadingSessions(true);
    try {
      setSessions(await getSessions());
    } catch {
      Alert.alert('Active sessions', 'Unable to load active sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const doProfileSave = async () => {
    if (!name.trim()) return Alert.alert('Edit profile', 'Name is required.');
    setSaving(true);
    try {
      const next = await updateProfile(name.trim(), profession.trim());
      setProfile({ ...profile, ...next, username: next.name });
      setSheet(null);
    } catch (error: any) {
      Alert.alert(
        'Edit profile',
        error?.message || 'Unable to update profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const doPasswordChange = async () => {
    if (newPassword.length < 8)
      return Alert.alert(
        'Change password',
        'New password must contain at least 8 characters.',
      );
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setSheet(null);
      Alert.alert(
        'Password changed',
        'Your password was updated successfully.',
      );
    } catch (error: any) {
      Alert.alert(
        'Change password',
        error?.message || 'Unable to change password.',
      );
    } finally {
      setSaving(false);
    }
  };

  const endSession = (session: Session) =>
    Alert.alert('Sign out device?', session.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeSession(session.id);
            setSessions(value => value.filter(item => item.id !== session.id));
          } catch {
            Alert.alert('Active sessions', 'Unable to sign out this device.');
          }
        },
      },
    ]);

  const signOut = async (all: boolean) => {
    setSheet(null);
    await logoutService(all);
  };

  const ratio = footprint.allowance
    ? Math.min(footprint.used / footprint.allowance, 1)
    : 0;
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <ArrowLeft color={Theme.colors.fontSecondary} size={22} />
        </Pressable>
        <View>
          <H1>Settings</H1>
          <MutedText>Account and preferences</MutedText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeading}>
            <H3>Profile</H3>
            <Pressable onPress={() => setSheet('edit')} style={styles.edit}>
              <Pencil size={15} color={Theme.colors.primary} />
              <TextSecondary style={styles.green}>Edit Profile</TextSecondary>
            </Pressable>
          </View>
          <TextSecondary style={styles.name}>
            {profile?.name || profile?.username || '—'}
          </TextSecondary>
          <MutedText>{profile?.profession || 'Profession not set'}</MutedText>
          <View style={styles.details}>
            <MutedText>Email</MutedText>
            <TextSecondary>{profile?.email || '—'}</TextSecondary>
            <MutedText>Member since</MutedText>
            <TextSecondary>{memberSince}</TextSecondary>
          </View>
        </Card>

        <Card style={styles.card}>
          <H3>Research Footprint</H3>
          <View style={styles.metrics}>
            {[
              ['Projects', projects.length],
              ['Photos', footprint.photos],
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.metric}>
                <H3>{value}</H3>
                <MutedText>{label}</MutedText>
              </View>
            ))}
          </View>
          <View style={styles.divider} />
          <TextSecondary>Photo storage</TextSecondary>
          {footprint.allowance !== null ? (
            <>
              <MutedText>
                {bytes(footprint.used)} of {bytes(footprint.allowance)} used
              </MutedText>
              <View style={styles.track}>
                <View style={[styles.progress, { width: `${ratio * 100}%` }]} />
              </View>
              <MutedText>
                Research Pal can use up to 20% of this device&apos;s storage.
              </MutedText>
            </>
          ) : (
            <MutedText>Storage information unavailable</MutedText>
          )}
        </Card>

        <Card style={styles.card}>
          <H3>Preferences</H3>
          <View style={styles.row}>
            <View>
              <TextSecondary>Auto Weather</TextSecondary>
              <MutedText>Update weather when the app opens</MutedText>
            </View>
            <Switch
              value={autoWeather}
              onValueChange={toggleWeather}
              trackColor={{ false: '#3b4350', true: '#247c44' }}
              thumbColor={autoWeather ? Theme.colors.primary : '#b5bdc8'}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <H3>Security</H3>
          <SettingRow
            icon={<KeyRound size={19} color={Theme.colors.mutedForeground} />}
            title="Change Password"
            onPress={() => setSheet('password')}
          />
          <SettingRow
            icon={
              <MonitorSmartphone
                size={19}
                color={Theme.colors.mutedForeground}
              />
            }
            title="Active Sessions"
            onPress={openSessions}
          />
          <SettingRow
            icon={<LogOut size={19} color="#e46d6d" />}
            title="Sign Out"
            danger
            onPress={() => setSheet('signout')}
          />
        </Card>
      </ScrollView>

      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {sheet === 'edit' && (
            <>
              <H3>Edit Profile</H3>
              <MutedText>
                Email is your account identity and cannot be changed here.
              </MutedText>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={Theme.colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Profession"
                placeholderTextColor={Theme.colors.mutedForeground}
                value={profession}
                onChangeText={setProfession}
              />
              <Pressable
                style={styles.primaryButton}
                onPress={doProfileSave}
                disabled={saving}
              >
                <TextSecondary>
                  {saving ? 'Saving…' : 'Save changes'}
                </TextSecondary>
              </Pressable>
            </>
          )}
          {sheet === 'password' && (
            <>
              <H3>Change Password</H3>
              <TextInput
                secureTextEntry
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor={Theme.colors.mutedForeground}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                secureTextEntry
                style={styles.input}
                placeholder="New password (8+ characters)"
                placeholderTextColor={Theme.colors.mutedForeground}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Pressable
                style={styles.primaryButton}
                onPress={doPasswordChange}
                disabled={saving}
              >
                <TextSecondary>
                  {saving ? 'Updating…' : 'Update password'}
                </TextSecondary>
              </Pressable>
            </>
          )}
          {sheet === 'sessions' && (
            <>
              <H3>Active Sessions</H3>
              {loadingSessions ? (
                <ActivityIndicator color={Theme.colors.primary} />
              ) : (
                sessions.map(session => (
                  <View key={session.id} style={styles.session}>
                    <View style={styles.flex}>
                      <TextSecondary>{session.title}</TextSecondary>
                      <MutedText>{session.subtitle}</MutedText>
                    </View>
                    {!session.current && (
                      <Pressable onPress={() => endSession(session)}>
                        <TextSecondary style={styles.danger}>
                          Sign out
                        </TextSecondary>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </>
          )}
          {sheet === 'signout' && (
            <>
              <H3>Sign Out</H3>
              <Pressable
                style={styles.sheetAction}
                onPress={() => signOut(false)}
              >
                <TextSecondary>Sign out from this device</TextSecondary>
              </Pressable>
              <Pressable
                style={styles.sheetAction}
                onPress={() => signOut(true)}
              >
                <TextSecondary style={styles.danger}>
                  Sign out from all devices
                </TextSecondary>
              </Pressable>
              <Pressable
                style={styles.sheetAction}
                onPress={() => setSheet(null)}
              >
                <MutedText>Cancel</MutedText>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  iconButton: { padding: 10, marginLeft: -10 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { gap: 12 },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  edit: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 6 },
  green: { color: Theme.colors.primary },
  name: { fontSize: 20, fontWeight: '700' },
  details: { gap: 5, marginTop: 8 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#161b23',
    padding: 12,
    borderRadius: 10,
  },
  divider: { height: 1, backgroundColor: '#303744' },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#343c49',
  },
  progress: { height: '100%', backgroundColor: Theme.colors.primary },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  danger: { color: '#e46d6d' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#1d2330',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#596476',
    alignSelf: 'center',
  },
  input: {
    backgroundColor: '#12161d',
    borderColor: '#343c49',
    borderWidth: 1,
    borderRadius: 10,
    color: Theme.colors.fontSecondary,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#303744',
  },
  flex: { flex: 1 },
  sheetAction: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#303744',
  },
});
