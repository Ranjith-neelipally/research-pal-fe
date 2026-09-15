import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Hash, Plus, Type, X } from 'lucide-react-native';
import Input from '../../../../components/Input';
import { Theme } from '../../../../components/theme';
import type { Plot } from '../AddNewProject/Structure/helpers';
import { buildGrid, getAssignmentDisplayName, getPlotDisplayName } from '../AddNewProject/Structure/helpers';
import {
  bulkCreateObservationRecords,
  createObservationRecord,
  createObservationType,
} from '../../../../services/Observations';
import type { ObservationDataType, ObservationType } from '../../../../types/observation';
import { validateMaxLength, validateNumberValue, validateRequiredMaxLength } from '../../../../utils/apiValidation';
import { useKeyboardInsets } from '../../../../hooks/useKeyboardInsets';
import { useObservationsStore } from '../../../../store/observations.store';
import LoadingState from '../../../../components/LoadingState';

type Step = 'pick' | 'new' | 'scope' | 'plot' | 'capture';
type Scope = 'single' | 'all';
type PendingRecord = { plotId: string; value: number | string | boolean; note?: string; capturedAt: string };

interface Props {
  visible: boolean;
  projectId: string;
  plots: Plot[];
  onClose: () => void;
  onSaved?: () => void;
  onViewObservation?: (type: ObservationType) => void;
}

const colors = { card: '#171b22', border: '#343b46', text: '#e7ebef', muted: '#8b98aa' };
const orderedPlots = (plots: Plot[]) => [...plots].sort((a, b) =>
  a.replication - b.replication || a.treatment - b.treatment || a.plotIndex[0] - b.plotIndex[0] || a.plotIndex[1] - b.plotIndex[1],
);

export default function QuickObservationModal({ visible, projectId, plots, onClose, onSaved, onViewObservation }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const { keyboardInset, keyboardVisible } = useKeyboardInsets();
  const [step, setStep] = useState<Step>('pick');
  const [selected, setSelected] = useState<ObservationType>();
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState<ObservationDataType>('number');
  const [unit, setUnit] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [singlePlotId, setSinglePlotId] = useState('');
  const [plotIndex, setPlotIndex] = useState(0);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<PendingRecord[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const observationCache = useObservationsStore(state => state.byProjectId[projectId]);
  const fetchObservationTypes = useObservationsStore(state => state.fetchObservationTypes);
  const setProjectObservationTypes = useObservationsStore(state => state.setProjectObservationTypes);
  const types = observationCache?.types || [];
  const isLoadingTypes = observationCache?.isLoading || (!observationCache?.loaded && !observationCache?.error);
  const valueRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const sortedPlots = useMemo(() => orderedPlots(plots).filter(plot => plot._id), [plots]);
  const captureGrid = useMemo(() => {
    const rows = Math.max(0, ...sortedPlots.map(plot => plot.plotIndex?.[0] || 0));
    const columns = Math.max(0, ...sortedPlots.map(plot => plot.plotIndex?.[1] || 0));
    return buildGrid(sortedPlots, rows, columns);
  }, [sortedPlots]);
  const currentPlot = scope === 'single' ? sortedPlots.find(plot => plot._id === singlePlotId) : sortedPlots[plotIndex];
  const expandedMapHeight = Math.max(90, Math.min(260, screenHeight * .75 - 370));
  const sheetMaxHeight = Math.max(260, screenHeight - keyboardInset - 32);

  useEffect(() => {
    if (!visible || observationCache?.loaded || observationCache?.isLoading) return;
    fetchObservationTypes(projectId).catch(error => Alert.alert('Unable to load observations', error.message));
  }, [fetchObservationTypes, observationCache?.isLoading, observationCache?.loaded, projectId, visible]);

  useEffect(() => {
    if (step === 'capture') setTimeout(() => valueRef.current?.focus(), 180);
  }, [plotIndex, step]);

  const close = () => {
    setStep('pick'); setSelected(undefined); setName(''); setDataType('number'); setUnit('');
    setScope('all'); setSinglePlotId(''); setPlotIndex(0); setValue(''); setNote(''); setPending([]); setSkipped(new Set()); setSaving(false); onClose();
  };
  const closeOrDismissKeyboard = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    close();
  };

  const parseValue = () => selected?.dataType === 'number' ? Number(value) : selected?.dataType === 'boolean' ? value === 'true' : value.trim();
  const validateCapture = () => {
    if (!selected) return 'Observation type is required.';
    if (selected.dataType === 'number') return validateNumberValue(value);
    if (selected.dataType === 'text') return validateRequiredMaxLength(value, 2000, 'Value');
    if (selected.dataType === 'boolean' && value !== 'true' && value !== 'false') {
      return 'Choose yes or no.';
    }
    return validateMaxLength(note, 2000, 'Note');
  };
  const currentRecord = (): PendingRecord | null => !currentPlot?._id || !selected || value === '' ? null : ({
    plotId: currentPlot._id,
    value: parseValue(),
    note: note.trim() || undefined,
    capturedAt: new Date().toISOString(),
  });

  const finish = async (records: PendingRecord[]) => {
    if (!selected || !records.length || saving) return;
    setSaving(true);
    try {
      if (scope === 'single') {
        await createObservationRecord({ projectId, observationTypeId: selected.id, ...records[0] });
        Alert.alert('Saved', 'Observation saved for the selected plot.');
      } else {
        await bulkCreateObservationRecords({ projectId, observationTypeId: selected.id, records });
        Alert.alert('Saved', `${records.length} value${records.length === 1 ? '' : 's'} saved in one measurement session.`);
      }
      onSaved?.(); close();
    } catch (error: any) {
      Alert.alert('Could not save observations', error.message || String(error));
      setSaving(false);
    }
  };

  const goToPlot = (index: number) => {
    const record = pending.find(item => item.plotId === sortedPlots[index]?._id);
    setPlotIndex(index); setValue(record ? String(record.value) : ''); setNote(record?.note || '');
  };
  const saveAndNext = () => {
    const validationError = validateCapture();
    if (validationError) { setFormError(validationError); return; }
    const record = currentRecord(); if (!record) return;
    if (scope === 'single') { void finish([record]); return; }
    setPending(items => [...items.filter(item => item.plotId !== record.plotId), record]);
    setSkipped(items => { const next = new Set(items); next.delete(record.plotId); return next; });
    setPlotIndex(index => Math.min(index + 1, sortedPlots.length - 1)); setValue(''); setNote('');
  };
  const skip = () => {
    if (!currentPlot?._id) return;
    setSkipped(items => new Set(items).add(currentPlot._id!));
    setPlotIndex(index => Math.min(index + 1, sortedPlots.length - 1)); setValue(''); setNote('');
  };
  const previous = () => {
    if (!plotIndex) return;
    goToPlot(plotIndex - 1);
  };
  const createType = async () => {
    const nameError = validateRequiredMaxLength(name, 100, 'Observation name');
    const unitError = dataType === 'number' ? validateMaxLength(unit, 40, 'Unit') : undefined;
    if (nameError || unitError || saving) { setFormError(nameError || unitError || ''); return; }
    setSaving(true);
    try {
      const created = await createObservationType({ projectId, name: name.trim(), dataType, unit: dataType === 'number' ? unit.trim() || undefined : undefined });
      setProjectObservationTypes(projectId, [created, ...types]); setSelected(created); setStep('scope');
    } catch (error: any) { Alert.alert('Could not create observation', error.message || String(error)); }
    finally { setSaving(false); }
  };

  const title = step === 'pick' ? 'What are you recording?' : step === 'new' ? 'New observation' : `${selected?.name}${selected?.unit ? ` · ${selected.unit}` : ''}`;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeOrDismissKeyboard}>
        <Pressable onPress={closeOrDismissKeyboard} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009', paddingBottom: keyboardInset }}>
        <Pressable onPress={event => event.stopPropagation()} style={{ height: keyboardVisible ? undefined : '75%', maxHeight: sheetMaxHeight, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.card, padding: 20 }}>
          {!(step === 'capture' && scope === 'all') && <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{title}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{step === 'scope' ? 'How should this observation be taken?' : step === 'plot' ? 'Select the one plot you want to record.' : step === 'capture' ? scope === 'all' ? `Plot ${plotIndex + 1} of ${sortedPlots.length} · Round saved when you finish` : 'Record one selected plot' : 'Reusable structured field data for this project.'}</Text></View>
            <Pressable onPress={closeOrDismissKeyboard} hitSlop={16}><X color={colors.muted} /></Pressable>
          </View>}
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: step === 'capture' && scope === 'all' ? 1 : undefined,
              paddingBottom: keyboardVisible ? 28 : 0,
            }}
          >
            {step === 'pick' && <View style={{ gap: 10 }}>
              {isLoadingTypes && <LoadingState label="Loading observations..." />}
              {types.map(type => <Pressable key={type.id} onPress={() => { setSelected(type); setStep('scope'); }} onLongPress={() => onViewObservation?.(type)} style={{ minHeight: 68, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 17 }}>{type.name}</Text><Text style={{ color: colors.muted, marginTop: 3 }}>{type.dataType === 'boolean' ? 'Yes / No' : type.dataType}{type.unit ? ` · ${type.unit}` : ''}</Text></View><Pressable onPress={event => { event.stopPropagation(); onViewObservation?.(type); }} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: Theme.colors.primary, fontWeight: '700' }}>View data</Text></Pressable><ArrowRight color={Theme.colors.primary} />
              </Pressable>)}
              <Pressable onPress={() => setStep('new')} style={{ minHeight: 64, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Theme.colors.primary, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Plus color={Theme.colors.primary} /><Text style={{ color: Theme.colors.primary, fontWeight: '700', fontSize: 17 }}>New observation</Text></Pressable>
              {!!types.length && <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>Tap a row to capture another measurement session.</Text>}
            </View>}
            {step === 'new' && <View style={{ gap: 18 }}>
              <Input label="Observation name" value={name} onChangeText={text => { setName(text); setFormError(''); }} placeholder="e.g. Plant Height" autoFocus error={step === 'new' ? formError : undefined} />
              <Text style={{ color: colors.muted }}>Data type</Text><View style={{ flexDirection: 'row', gap: 8 }}>{([
                ['number', Hash, 'Number'], ['text', Type, 'Text'], ['boolean', Check, 'Yes / No'],
              ] as const).map(([kind, Icon, label]) => <Pressable key={kind} onPress={() => setDataType(kind)} style={{ flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: dataType === kind ? Theme.colors.primary : colors.border, backgroundColor: dataType === kind ? '#30a65b1f' : 'transparent' }}><Icon color={dataType === kind ? Theme.colors.primary : colors.muted} /><Text style={{ color: colors.text, marginTop: 6 }}>{label}</Text></Pressable>)}</View>
              {dataType === 'number' && <Input label="Unit (optional)" value={unit} onChangeText={text => { setUnit(text); setFormError(''); }} placeholder="cm, kg, %, count" />}
              <View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={() => setStep('pick')} style={secondaryButton}><ArrowLeft color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable><Pressable disabled={!name.trim() || saving} onPress={() => void createType()} style={[primaryButton, { opacity: !name.trim() || saving ? .5 : 1 }]}><Text style={primaryText}>{saving ? 'Saving…' : 'Continue'}</Text></Pressable></View>
            </View>}
            {step === 'scope' && <View style={{ gap: 12 }}>
              <Pressable onPress={() => { setScope('single'); setSinglePlotId(''); setValue(''); setNote(''); setStep('plot'); }} style={scopeCard}>
                <View style={{ flex: 1 }}><Text style={scopeTitle}>Single Plot</Text><Text style={scopeDescription}>Record this observation for only one selected plot.</Text></View><ArrowRight color={Theme.colors.primary} />
              </Pressable>
              <Pressable onPress={() => { setScope('all'); setPlotIndex(0); setPending([]); setSkipped(new Set()); setValue(''); setNote(''); setStep('capture'); }} style={scopeCard}>
                <View style={{ flex: 1 }}><Text style={scopeTitle}>All Plots</Text><Text style={scopeDescription}>Continue through all {sortedPlots.length} plots in order.</Text></View><ArrowRight color={Theme.colors.primary} />
              </Pressable>
              <Pressable onPress={() => setStep('pick')} style={[secondaryButton, { flex: 0 }]}><ArrowLeft color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable>
            </View>}
            {step === 'plot' && <View style={{ gap: 10 }}>
              {sortedPlots.map(plot => <Pressable key={plot._id} onPress={() => { setSinglePlotId(plot._id || ''); setStep('capture'); }} style={scopeCard}>
                <View style={{ flex: 1 }}><Text style={scopeTitle}>{getPlotDisplayName(plot)}</Text><Text style={scopeDescription}>Treatment T{plot.treatment} · Replication R{plot.replication}</Text></View><ArrowRight color={Theme.colors.primary} />
              </Pressable>)}
              <Pressable onPress={() => setStep('scope')} style={[secondaryButton, { flex: 0 }]}><ArrowLeft color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable>
            </View>}
            {step === 'capture' && scope === 'all' && currentPlot && <View style={{ gap: 18 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}><Text style={captureEyebrow}>Current observation</Text><Text style={captureTitle}>{selected?.name} {selected?.unit ? <Text style={{ color: colors.muted, fontWeight: '400' }}>({selected.unit})</Text> : null}</Text></View>
                  <View style={{ alignItems: 'flex-end' }}><Text style={{ color: Theme.colors.primary, fontSize: 14, fontWeight: '800' }}>{pending.length}/{sortedPlots.length}</Text><Text style={completedLabel}>Completed</Text></View>
                </View>
                <View style={progressTrack}><View style={[progressFill, { width: `${sortedPlots.length ? pending.length / sortedPlots.length * 100 : 0}%` }]} /></View>
              </View>
              <ScrollView style={{ height: keyboardVisible ? 90 : expandedMapHeight }} nestedScrollEnabled showsVerticalScrollIndicator={captureGrid.length > 2}>
                <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
                  <View style={{ gap: 8 }}>{captureGrid.map((row, rowIndex) => <View key={rowIndex} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map((plot, columnIndex) => {
                      if (!plot?._id) return <View key={`empty-${rowIndex}-${columnIndex}`} style={emptyPlotCard} />;
                      const index = sortedPlots.findIndex(item => item._id === plot._id); const completed = pending.some(item => item.plotId === plot._id); const current = index === plotIndex; const wasSkipped = skipped.has(plot._id);
                      return <Pressable key={plot._id} onPress={() => goToPlot(index)} style={[plotCard, { borderColor: plot.color || colors.border }, current && currentPlotCard, completed && !current && completedPlotCard, wasSkipped && !completed && skippedPlotCard]}>
                        <Text numberOfLines={1} style={[plotReplication, current && { color: Theme.colors.primary }]}>{getPlotDisplayName(plot)}</Text><Text numberOfLines={1} style={plotTreatment}>{getAssignmentDisplayName(plot)}</Text>
                        {completed && <CheckCircle2 size={14} color={Theme.colors.primary} style={{ position: 'absolute', right: 7, top: 7 }} />}
                        {wasSkipped && !completed && <Text style={skippedLabel}>Skipped</Text>}
                      </Pressable>;
                    })}
                  </View>)}</View>
                </ScrollView>
              </ScrollView>
              {selected?.dataType === 'boolean' ? <View style={{ flexDirection: 'row', gap: 10 }}>{['true', 'false'].map(item => <Pressable key={item} onPress={() => setValue(item)} style={[largeChoiceButton, value === item && selectedChoice]}><Text style={{ color: value === item ? Theme.colors.primary : colors.text, fontSize: 20, fontWeight: '700' }}>{item === 'true' ? 'Yes' : 'No'}</Text></Pressable>)}</View> :
                <View style={valueShell}><TextInput ref={valueRef} value={value} onChangeText={text => { setValue(text); setFormError(''); }} keyboardType={selected?.dataType === 'number' ? 'decimal-pad' : 'default'} returnKeyType="next" onSubmitEditing={saveAndNext} placeholder={selected?.dataType === 'number' ? '0.0' : 'Enter value'} placeholderTextColor="#56606d" style={valueInput} /><Text style={valueUnit}>{selected?.unit || 'Value'}</Text></View>}
              {!!formError && <Text style={{ color: '#f87171' }}>{formError}</Text>}
              <View style={{ flexDirection: 'row', gap: 8 }}><Pressable disabled={!plotIndex || saving} onPress={previous} style={[smallButton, { opacity: !plotIndex ? .45 : 1 }]}><ArrowLeft size={19} color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable><Pressable disabled={saving} onPress={skip} style={smallButton}><Text style={secondaryText}>Skip</Text></Pressable><Pressable disabled={value === '' || saving} onPress={saveAndNext} style={[primaryButton, { flex: 1.7, opacity: value === '' || saving ? .45 : 1 }]}><Text style={primaryText}>Save & Next</Text></Pressable></View>
              <Pressable disabled={saving} onPress={() => pending.length ? void finish(pending) : close()} style={{ padding: 12 }}><Text style={finishText}>{saving ? 'Finishing…' : 'Finish Session'}</Text></Pressable>
            </View>}
            {step === 'capture' && scope === 'single' && currentPlot && <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: '#30a65b18', borderWidth: 1, borderColor: '#30a65b55', borderRadius: 20, padding: 18 }}><Text style={{ color: colors.muted, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.5 }}>Current plot</Text><Text style={{ color: colors.text, fontSize: 27, fontWeight: '800', marginTop: 4 }}>{getPlotDisplayName(currentPlot)}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Treatment T{currentPlot.treatment} · Replication R{currentPlot.replication}</Text></View>
              <Text style={{ color: colors.muted }}>Value</Text>
              {selected?.dataType === 'boolean' ? <View style={{ flexDirection: 'row', gap: 10 }}>{['true', 'false'].map(item => <Pressable key={item} onPress={() => { setValue(item); setFormError(''); }} style={[choiceButton, value === item && selectedChoice]}><Text style={{ color: value === item ? Theme.colors.primary : colors.text, fontSize: 18 }}>{item === 'true' ? 'Yes' : 'No'}</Text></Pressable>)}</View> : <Input ref={valueRef} value={value} onChangeText={text => { setValue(text); setFormError(''); }} keyboardType={selected?.dataType === 'number' ? 'decimal-pad' : 'default'} returnKeyType="next" onSubmitEditing={saveAndNext} style={{ fontSize: 28 }} placeholder="Enter value" error={formError || undefined} />}
              <Input label="Note (optional)" value={note} onChangeText={text => { setNote(text); setFormError(''); }} placeholder="Add note" />
              {scope === 'single' ? <View style={{ flexDirection: 'row', gap: 8 }}><Pressable disabled={saving} onPress={() => setStep('plot')} style={smallButton}><Text style={secondaryText}>Back</Text></Pressable><Pressable disabled={value === '' || saving} onPress={saveAndNext} style={[primaryButton, { flex: 1.5, opacity: value === '' || saving ? .45 : 1 }]}><Text style={primaryText}>{saving ? 'Saving…' : 'Save observation'}</Text></Pressable></View> : <>
                <View style={{ flexDirection: 'row', gap: 8 }}><Pressable disabled={!plotIndex || saving} onPress={previous} style={[smallButton, { opacity: !plotIndex ? .45 : 1 }]}><Text style={secondaryText}>Previous</Text></Pressable><Pressable disabled={saving} onPress={skip} style={smallButton}><Text style={secondaryText}>Skip</Text></Pressable><Pressable disabled={value === '' || saving} onPress={saveAndNext} style={[primaryButton, { flex: 1.4, opacity: value === '' || saving ? .45 : 1 }]}><Text style={primaryText}>{saving ? 'Saving…' : plotIndex === sortedPlots.length - 1 ? 'Finish' : 'Save & Next'}</Text></Pressable></View>
                {!!pending.length && <Pressable disabled={saving} onPress={() => void finish(pending)} style={{ padding: 12 }}><Text style={{ textAlign: 'center', color: Theme.colors.primary, fontWeight: '700' }}>Finish now · save {pending.length} values</Text></Pressable>}
              </>}
            </View>}
          </ScrollView>
        </Pressable>
        </Pressable>
    </Modal>
  );
}

const primaryButton = { minHeight: 50, borderRadius: 14, paddingHorizontal: 16, backgroundColor: Theme.colors.primary, alignItems: 'center' as const, justifyContent: 'center' as const };
const primaryText = { color: '#101318', fontWeight: '800' as const };
const secondaryButton = { minHeight: 50, flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, justifyContent: 'center' as const };
const secondaryText = { color: colors.text, fontWeight: '700' as const };
const smallButton = { minHeight: 50, flex: 1, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const choiceButton = { flex: 1, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const selectedChoice = { borderColor: Theme.colors.primary, backgroundColor: '#30a65b1f' };
const scopeCard = { minHeight: 76, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 18, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12 };
const scopeTitle = { color: colors.text, fontWeight: '700' as const, fontSize: 17 };
const scopeDescription = { color: colors.muted, marginTop: 4 };
const captureEyebrow = { color: colors.muted, textTransform: 'uppercase' as const, fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.5 };
const captureTitle = { color: colors.text, fontSize: 20, fontWeight: '800' as const, marginTop: 4 };
const completedLabel = { color: colors.muted, fontSize: 8, textTransform: 'uppercase' as const, letterSpacing: 1 };
const progressTrack = { height: 4, borderRadius: 2, overflow: 'hidden' as const, backgroundColor: '#292e36', marginTop: 14 };
const progressFill = { height: 4, borderRadius: 2, backgroundColor: Theme.colors.primary };
const plotCard = { width: 82, minHeight: 78, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1b1f26', alignItems: 'center' as const, justifyContent: 'center' as const, padding: 8 };
const emptyPlotCard = { width: 82, minHeight: 78, borderRadius: 12, backgroundColor: '#11151a', borderWidth: 1, borderColor: '#242a32', opacity: .45 };
const currentPlotCard = { borderColor: Theme.colors.primary, backgroundColor: '#30a65b18' };
const completedPlotCard = { borderColor: '#30a65b77', backgroundColor: '#30a65b0d' };
const skippedPlotCard = { borderColor: '#b8873e99', borderStyle: 'dashed' as const };
const plotReplication = { color: colors.muted, fontSize: 9, fontWeight: '700' as const };
const plotTreatment = { color: colors.text, fontSize: 14, fontWeight: '800' as const, marginTop: 2 };
const skippedLabel = { position: 'absolute' as const, bottom: 4, color: '#d19a4b', fontSize: 7, textTransform: 'uppercase' as const, letterSpacing: .7 };
const valueShell = { minHeight: 92, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0f1217', flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 18 };
const valueInput = { flex: 1, color: colors.text, fontSize: 36, fontWeight: '800' as const, paddingVertical: 16 };
const valueUnit = { color: colors.muted, fontSize: 11, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginLeft: 10 };
const largeChoiceButton = { flex: 1, minHeight: 82, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0f1217', alignItems: 'center' as const, justifyContent: 'center' as const };
const finishText = { textAlign: 'center' as const, color: colors.muted, fontSize: 11, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1.4 };
