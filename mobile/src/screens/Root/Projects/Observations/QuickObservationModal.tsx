import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check, Hash, Plus, Type, X } from 'lucide-react-native';
import Input from '../../../../components/Input';
import { Theme } from '../../../../components/theme';
import type { Plot } from '../AddNewProject/Structure/helpers';
import { getPlotDisplayName } from '../AddNewProject/Structure/helpers';
import {
  bulkCreateObservationRecords,
  createObservationRecord,
  createObservationType,
  listObservationTypes,
} from '../../../../services/Observations';
import type { ObservationDataType, ObservationType } from '../../../../types/observation';

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
  const [step, setStep] = useState<Step>('pick');
  const [types, setTypes] = useState<ObservationType[]>([]);
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
  const [saving, setSaving] = useState(false);
  const valueRef = useRef<TextInput>(null);
  const sortedPlots = useMemo(() => orderedPlots(plots).filter(plot => plot._id), [plots]);
  const currentPlot = scope === 'single' ? sortedPlots.find(plot => plot._id === singlePlotId) : sortedPlots[plotIndex];

  useEffect(() => {
    if (!visible) return;
    listObservationTypes(projectId).then(setTypes).catch(error => Alert.alert('Unable to load observations', error.message));
  }, [projectId, visible]);

  useEffect(() => {
    if (step === 'capture') setTimeout(() => valueRef.current?.focus(), 180);
  }, [plotIndex, step]);

  const close = () => {
    setStep('pick'); setSelected(undefined); setName(''); setDataType('number'); setUnit('');
    setScope('all'); setSinglePlotId(''); setPlotIndex(0); setValue(''); setNote(''); setPending([]); setSaving(false); onClose();
  };

  const parseValue = () => selected?.dataType === 'number' ? Number(value) : selected?.dataType === 'boolean' ? value === 'true' : value.trim();
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

  const saveAndNext = () => {
    const record = currentRecord(); if (!record) return;
    if (scope === 'single') { void finish([record]); return; }
    const records = [...pending, record];
    if (plotIndex >= sortedPlots.length - 1) void finish(records);
    else { setPending(records); setPlotIndex(index => index + 1); setValue(''); setNote(''); }
  };
  const skip = () => {
    if (plotIndex >= sortedPlots.length - 1) { if (pending.length) void finish(pending); else close(); }
    else { setPlotIndex(index => index + 1); setValue(''); setNote(''); }
  };
  const previous = () => {
    if (!plotIndex) return;
    const previousRecord = pending[pending.length - 1];
    setPending(items => items.slice(0, -1)); setPlotIndex(index => index - 1);
    setValue(previousRecord ? String(previousRecord.value) : ''); setNote(previousRecord?.note || '');
  };
  const createType = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const created = await createObservationType({ projectId, name: name.trim(), dataType, unit: dataType === 'number' ? unit.trim() || undefined : undefined });
      setTypes(items => [created, ...items]); setSelected(created); setStep('scope');
    } catch (error: any) { Alert.alert('Could not create observation', error.message || String(error)); }
    finally { setSaving(false); }
  };

  const title = step === 'pick' ? 'What are you recording?' : step === 'new' ? 'New observation' : `${selected?.name}${selected?.unit ? ` · ${selected.unit}` : ''}`;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' }}>
        <View style={{ maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.card, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{title}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{step === 'scope' ? 'How should this observation be taken?' : step === 'plot' ? 'Select the one plot you want to record.' : step === 'capture' ? scope === 'all' ? `Plot ${plotIndex + 1} of ${sortedPlots.length} · Round saved when you finish` : 'Record one selected plot' : 'Reusable structured field data for this project.'}</Text></View>
            <Pressable onPress={close} hitSlop={16}><X color={colors.muted} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === 'pick' && <View style={{ gap: 10 }}>
              {types.map(type => <Pressable key={type.id} onPress={() => { setSelected(type); setStep('scope'); }} onLongPress={() => onViewObservation?.(type)} style={{ minHeight: 68, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 17 }}>{type.name}</Text><Text style={{ color: colors.muted, marginTop: 3 }}>{type.dataType === 'boolean' ? 'Yes / No' : type.dataType}{type.unit ? ` · ${type.unit}` : ''}</Text></View><Pressable onPress={event => { event.stopPropagation(); onViewObservation?.(type); }} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: Theme.colors.primary, fontWeight: '700' }}>View data</Text></Pressable><ArrowRight color={Theme.colors.primary} />
              </Pressable>)}
              <Pressable onPress={() => setStep('new')} style={{ minHeight: 64, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: Theme.colors.primary, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Plus color={Theme.colors.primary} /><Text style={{ color: Theme.colors.primary, fontWeight: '700', fontSize: 17 }}>New observation</Text></Pressable>
              {!!types.length && <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>Tap a row to capture another measurement session.</Text>}
            </View>}
            {step === 'new' && <View style={{ gap: 18 }}>
              <Input label="Observation name" value={name} onChangeText={setName} placeholder="e.g. Plant Height" autoFocus />
              <Text style={{ color: colors.muted }}>Data type</Text><View style={{ flexDirection: 'row', gap: 8 }}>{([
                ['number', Hash, 'Number'], ['text', Type, 'Text'], ['boolean', Check, 'Yes / No'],
              ] as const).map(([kind, Icon, label]) => <Pressable key={kind} onPress={() => setDataType(kind)} style={{ flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: dataType === kind ? Theme.colors.primary : colors.border, backgroundColor: dataType === kind ? '#30a65b1f' : 'transparent' }}><Icon color={dataType === kind ? Theme.colors.primary : colors.muted} /><Text style={{ color: colors.text, marginTop: 6 }}>{label}</Text></Pressable>)}</View>
              {dataType === 'number' && <Input label="Unit (optional)" value={unit} onChangeText={setUnit} placeholder="cm, kg, %, count" />}
              <View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={() => setStep('pick')} style={secondaryButton}><ArrowLeft color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable><Pressable disabled={!name.trim() || saving} onPress={() => void createType()} style={[primaryButton, { opacity: !name.trim() || saving ? .5 : 1 }]}><Text style={primaryText}>{saving ? 'Saving…' : 'Continue'}</Text></Pressable></View>
            </View>}
            {step === 'scope' && <View style={{ gap: 12 }}>
              <Pressable onPress={() => { setScope('single'); setSinglePlotId(''); setValue(''); setNote(''); setStep('plot'); }} style={scopeCard}>
                <View style={{ flex: 1 }}><Text style={scopeTitle}>Single Plot</Text><Text style={scopeDescription}>Record this observation for only one selected plot.</Text></View><ArrowRight color={Theme.colors.primary} />
              </Pressable>
              <Pressable onPress={() => { setScope('all'); setPlotIndex(0); setPending([]); setValue(''); setNote(''); setStep('capture'); }} style={scopeCard}>
                <View style={{ flex: 1 }}><Text style={scopeTitle}>All Plots</Text><Text style={scopeDescription}>Continue through all {sortedPlots.length} plots in order.</Text></View><ArrowRight color={Theme.colors.primary} />
              </Pressable>
              <Pressable onPress={() => setStep('pick')} style={[secondaryButton, { flex: 0 }]}><ArrowLeft color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable>
            </View>}
            {step === 'plot' && <View style={{ gap: 10 }}>
              {sortedPlots.map(plot => <Pressable key={plot._id} onPress={() => { setSinglePlotId(plot._id); setStep('capture'); }} style={scopeCard}>
                <View style={{ flex: 1 }}><Text style={scopeTitle}>{getPlotDisplayName(plot)}</Text><Text style={scopeDescription}>Treatment T{plot.treatment} · Replication R{plot.replication}</Text></View><ArrowRight color={Theme.colors.primary} />
              </Pressable>)}
              <Pressable onPress={() => setStep('scope')} style={[secondaryButton, { flex: 0 }]}><ArrowLeft color={colors.text} /><Text style={secondaryText}>Back</Text></Pressable>
            </View>}
            {step === 'capture' && currentPlot && <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: '#30a65b18', borderWidth: 1, borderColor: '#30a65b55', borderRadius: 20, padding: 18 }}><Text style={{ color: colors.muted, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.5 }}>Current plot</Text><Text style={{ color: colors.text, fontSize: 27, fontWeight: '800', marginTop: 4 }}>{getPlotDisplayName(currentPlot)}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Treatment T{currentPlot.treatment} · Replication R{currentPlot.replication}</Text></View>
              <Text style={{ color: colors.muted }}>Value</Text>
              {selected?.dataType === 'boolean' ? <View style={{ flexDirection: 'row', gap: 10 }}>{['true', 'false'].map(item => <Pressable key={item} onPress={() => setValue(item)} style={[choiceButton, value === item && selectedChoice]}><Text style={{ color: value === item ? Theme.colors.primary : colors.text, fontSize: 18 }}>{item === 'true' ? 'Yes' : 'No'}</Text></Pressable>)}</View> : <Input ref={valueRef} value={value} onChangeText={setValue} keyboardType={selected?.dataType === 'number' ? 'decimal-pad' : 'default'} returnKeyType="next" onSubmitEditing={saveAndNext} style={{ fontSize: 28 }} placeholder="Enter value" />}
              <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Add note" />
              {scope === 'single' ? <View style={{ flexDirection: 'row', gap: 8 }}><Pressable disabled={saving} onPress={() => setStep('plot')} style={smallButton}><Text style={secondaryText}>Back</Text></Pressable><Pressable disabled={value === '' || saving} onPress={saveAndNext} style={[primaryButton, { flex: 1.5, opacity: value === '' || saving ? .45 : 1 }]}><Text style={primaryText}>{saving ? 'Saving…' : 'Save observation'}</Text></Pressable></View> : <>
                <View style={{ flexDirection: 'row', gap: 8 }}><Pressable disabled={!plotIndex || saving} onPress={previous} style={[smallButton, { opacity: !plotIndex ? .45 : 1 }]}><Text style={secondaryText}>Previous</Text></Pressable><Pressable disabled={saving} onPress={skip} style={smallButton}><Text style={secondaryText}>Skip</Text></Pressable><Pressable disabled={value === '' || saving} onPress={saveAndNext} style={[primaryButton, { flex: 1.4, opacity: value === '' || saving ? .45 : 1 }]}><Text style={primaryText}>{saving ? 'Saving…' : plotIndex === sortedPlots.length - 1 ? 'Finish' : 'Save & Next'}</Text></Pressable></View>
                {!!pending.length && <Pressable disabled={saving} onPress={() => void finish(pending)} style={{ padding: 12 }}><Text style={{ textAlign: 'center', color: Theme.colors.primary, fontWeight: '700' }}>Finish now · save {pending.length} values</Text></Pressable>}
              </>}
            </View>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
