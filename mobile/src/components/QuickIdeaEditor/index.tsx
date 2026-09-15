import React, { useEffect, useState } from 'react';
import { Alert, Keyboard, Linking, Pressable, ScrollView, Switch, TouchableWithoutFeedback, View } from 'react-native';
import { Check, ChevronDown, Clock, X } from 'lucide-react-native';
import MyModal from '../modal';
import CustomCalendar from '../Calender';
import Input from '../Input';
import Button from '../Button';
import { H3, MutedText, TextSecondary } from '../commonStyles/styles';
import { Theme } from '../theme';
import { QuickNote } from '../../store/notes.store';
import { useProjectsStore } from '../../store/Projects/Projects.store';
import { usePlotsStore } from '../../store/Projects/plots.store';
import { addQuickNoteService, updateQuickNotes } from '../../services/quickNotes';
import { canScheduleReminder, cancelIdeaReminders, isPastReminderDate, pickIdeaReminderTime, requestReminderPermission, scheduleIdeaReminders } from '../../services/ideaReminders';
import { getAllProjectsService, getProjectDetailsService } from '../../services/Projects/Project';
import { validateMaxLength, validateRequiredMaxLength } from '../../utils/apiValidation';

type Props = { visible: boolean; userId: string; initialDate: string; note?: QuickNote | null; onClose(): void; onSaved(note?: QuickNote): void };
type SelectOption = { label: string; value: string | null };

const SelectField = ({ label, value, options, open, onToggle, onChange }: { label: string; value: string | null; options: SelectOption[]; open: boolean; onToggle(): void; onChange(value: string | null): void }) => {
  const selected = options.find(option => option.value === value);
  return <View style={{ gap: 6 }}>
    <MutedText>{label}</MutedText>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label || 'None'}`} onPress={onToggle} style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#263244', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <TextSecondary>{selected?.label || 'None'}</TextSecondary><ChevronDown size={18} color={Theme.colors.mutedForeground} />
    </Pressable>
    {open && <View style={{ maxHeight: 190, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1d2736' }}><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {options.map(option => <Pressable key={option.value || 'none'} onPress={() => onChange(option.value)} style={{ minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#2e3b4d' }}>
        <TextSecondary>{option.label}</TextSecondary>{option.value === value && <Check size={16} color={Theme.colors.primary} />}
      </Pressable>)}
    </ScrollView></View>}
  </View>;
};

const formatTime = (value: string) => {
  if (!value) return 'Default · 7:00 AM';
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function QuickIdeaEditor({ visible, userId, initialDate, note, onClose, onSaved }: Props) {
  const projects = useProjectsStore(state => state.projectsData);
  const plots = usePlotsStore(state => state.plot);
  const [date, setDate] = useState(initialDate);
  const [draft, setDraft] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [plotId, setPlotId] = useState<string | null>(null);
  const [projectPlots, setProjectPlots] = useState<typeof plots>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [openSelector, setOpenSelector] = useState<'project' | 'plot' | null>(null);
  const reminderAllowed = canScheduleReminder(date, time);

  useEffect(() => {
    if (!visible) return;
    Keyboard.dismiss();
    setDate(note?.date || initialDate); setDraft(note?.idea || ''); setDraftError(''); setEnabled(note?.reminderEnabled ?? false);
    setTime(note?.reminderTime || ''); setProjectId(note?.projectId || null); setPlotId(note?.plotId || null); setOpenSelector(null);
  }, [visible, note, initialDate]);

  useEffect(() => {
    if (!visible || !projectId) { setProjectPlots([]); return; }
    getProjectDetailsService(projectId, userId).then(result => {
      const payload = result.data as any;
      setProjectPlots(Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
    });
  }, [projectId, userId, visible]);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoadingProjects(true);
    getAllProjectsService(userId).finally(() => setLoadingProjects(false));
  }, [userId, visible]);

  useEffect(() => {
    if (enabled && !reminderAllowed) {
      setEnabled(false);
      setTime('');
      setProjectId(null);
      setPlotId(null);
    }
  }, [enabled, reminderAllowed]);

  const toggleReminder = async (value: boolean) => {
    if (!value) { setEnabled(false); return; }
    if (!reminderAllowed) {
      Alert.alert(
        'Reminder unavailable',
        isPastReminderDate(date)
          ? 'Reminders cannot be set for past dates.'
          : 'Choose a future reminder time for today.',
      );
      return;
    }
    const granted = await requestReminderPermission();
    setEnabled(granted);
    if (!granted) Alert.alert(
      'Notifications are disabled',
      'Ideas still work without notifications. Enable notifications in system settings to receive reminders.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
    );
  };
  const save = async () => {
    const error = validateRequiredMaxLength(draft, 1000, 'Idea content');
    if (error) { setDraftError(error); return; }
    setSubmitting(true);
    try {
      if (note) await cancelIdeaReminders(note._id);
      const selectedTime = time;
      const shouldSaveReminder = enabled && canScheduleReminder(date, selectedTime);
      const fields = { date, reminderEnabled: shouldSaveReminder, reminderTime: shouldSaveReminder && selectedTime ? selectedTime : null, projectId: shouldSaveReminder ? projectId : null, plotId: shouldSaveReminder && projectId ? plotId : null, completed: shouldSaveReminder ? (note?.completed ?? false) : false, notificationIds: [] as number[] };
      const result = note ? await updateQuickNotes(userId, note._id, draft.trim(), fields) : await addQuickNoteService({ userId, idea: draft.trim(), ...fields });
      const resultData = 'data' in result ? result.data : undefined;
      const saved = (note ? resultData?.idea : resultData?.newNote) as QuickNote | undefined;
      if (!saved?._id) throw new Error('Idea was not returned by the server');
      let notificationIds: number[] = [];
      if (shouldSaveReminder && !saved.completed) { notificationIds = await scheduleIdeaReminders(saved._id, saved.idea, date, selectedTime || null); if (notificationIds.length) await updateQuickNotes(userId, saved._id, saved.idea, { notificationIds }); }
      onSaved({ ...saved, ...fields, notificationIds }); onClose();
    } finally { setSubmitting(false); }
  };

  const availablePlots = (projectPlots.length ? projectPlots : plots).filter(plot => plot.projectId === projectId && plot._id);
  const projectOptions: SelectOption[] = [{ label: 'None', value: null }, ...projects.map(project => ({ label: project.title, value: project._id }))];
  const plotOptions: SelectOption[] = [{ label: 'None', value: null }, ...availablePlots.map(plot => ({ label: plot.title, value: plot._id! }))];
  const openTimePicker = async () => {
    const selected = await pickIdeaReminderTime(time || '07:00');
    if (!selected) return;
    if (!canScheduleReminder(date, selected)) {
      Alert.alert('Choose a future time', 'Reminder times for today must still be in the future.');
      return;
    }
    setTime(selected);
  };

  const dismiss = () => {
    setDate(initialDate);
    setDraft('');
    setEnabled(false);
    setTime('');
    setProjectId(null);
    setPlotId(null);
    setProjectPlots([]);
    setOpenSelector(null);
    onClose();
  };

  return <MyModal visible={visible} onClose={dismiss} placement="bottom" keyboardAware contentStyle={{ maxHeight: '75%' }}>
    <View style={{ flexShrink: 1, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><H3>Quick Idea</H3><TouchableWithoutFeedback onPress={dismiss}><X size={16} color={Theme.colors.mutedForeground} /></TouchableWithoutFeedback></View>
      <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
      {(!note || enabled) && <CustomCalendar selectedDate={date} onDayPress={d => setDate(d.dateString)} />}
      <Input
        placeholder="Capture your thought..."
        multiline
        numberOfLines={3}
        value={draft}
        maxLength={1000}
        onChangeText={text => {
          setDraft(text);
          if (draftError && !validateMaxLength(text, 1000, 'Idea content')) {
            setDraftError('');
          }
        }}
        error={draftError}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><TextSecondary>Remind me</TextSecondary><Switch value={enabled} onValueChange={toggleReminder} disabled={!reminderAllowed} /></View>
      {enabled && <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}><MutedText>Time (optional)</MutedText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Reminder time: ${formatTime(time)}`} onPress={openTimePicker} style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#263244', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Clock size={17} color={Theme.colors.mutedForeground} /><TextSecondary>{formatTime(time)}</TextSecondary></View><ChevronDown size={18} color={Theme.colors.mutedForeground} />
        </Pressable>
        {time && <Pressable onPress={() => setTime('')} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}><MutedText>Use default (7:00 AM)</MutedText></Pressable>}
      </View>
      {loadingProjects && <MutedText>Loading projects…</MutedText>}
      <SelectField label="Project (optional)" value={projectId} options={projectOptions} open={openSelector === 'project'} onToggle={() => setOpenSelector(openSelector === 'project' ? null : 'project')} onChange={value => { setProjectId(value); setPlotId(null); setOpenSelector(null); }} />
      {projectId && <SelectField label="Plot (optional)" value={plotId} options={plotOptions} open={openSelector === 'plot'} onToggle={() => setOpenSelector(openSelector === 'plot' ? null : 'plot')} onChange={value => { setPlotId(value); setOpenSelector(null); }} />}
      </View>}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MutedText>{draft.length}/200</MutedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary" onPress={dismiss} disabled={submitting}>Cancel</Button>
          <Button variant="rounded" onPress={save} disabled={submitting || !draft.trim()}>{submitting ? 'Saving...' : 'Save'}</Button>
        </View>
      </View>
    </View>
  </MyModal>;
}
