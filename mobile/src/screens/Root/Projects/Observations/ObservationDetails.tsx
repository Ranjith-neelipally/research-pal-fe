import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, ChevronDown, Download, Pencil, Trash2, X } from 'lucide-react-native';
import Input from '../../../../components/Input';
import LoadingState from '../../../../components/LoadingState';
import { Theme } from '../../../../components/theme';
import {
  deleteObservationRecord,
  exportObservations,
  getObservationGraphs,
  compareObservation,
  getObservationSummary,
  listObservationRecords,
  updateObservationRecord,
} from '../../../../services/Observations';
import type { ComparisonResult, ObservationGraphs, ObservationMeasurement, ObservationSummary, ObservationType } from '../../../../types/observation';
import ObservationChart, { type ChartDatum, type ChartStyle } from './ObservationChart';

type Tab = 'Data' | 'Graphs' | 'Summary';
type GraphMode = 'Straight' | 'Comparison';
const colors = { bg: '#101318', card: '#171b22', border: '#343b46', text: '#e7ebef', muted: '#8b98aa' };
const MOBILE_CHARTS_ENABLED = false;

export default function ObservationDetails({ route, navigation }: any) {
  const { projectId, observationType } = route.params as { projectId: string; observationType: ObservationType };
  const [tab, setTab] = useState<Tab>('Data'); const [mode, setMode] = useState<GraphMode>('Straight'); const [style, setStyle] = useState<ChartStyle>('bar');
  const [records, setRecords] = useState<ObservationMeasurement[]>([]); const [graphs, setGraphs] = useState<ObservationGraphs>(); const [summary, setSummary] = useState<ObservationSummary>();
  const [loading, setLoading] = useState(true); const [selectedSession, setSelectedSession] = useState(''); const [selectedTreatment, setSelectedTreatment] = useState(''); const [allSessions, setAllSessions] = useState(false); const [comparisonSessions, setComparisonSessions] = useState<string[]>([]); const [comparison, setComparison] = useState<ComparisonResult>();
  const [editing, setEditing] = useState<ObservationMeasurement>(); const [editValue, setEditValue] = useState(''); const [editNote, setEditNote] = useState(''); const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listObservationRecords(projectId, observationType.id); setRecords(data);
      if (observationType.dataType === 'number') {
        const [nextGraphs, nextSummary] = await Promise.all([getObservationGraphs(projectId, observationType.id), getObservationSummary(projectId, observationType.id)]);
        setGraphs(nextGraphs); setSummary(nextSummary); setSelectedSession(value => value || nextGraphs.sessions.at(-1)?.id || ''); setComparisonSessions(value => value.length ? value : nextGraphs.sessions.slice(-2).map(item => item.id));
      }
    } catch (error: any) { Alert.alert('Unable to load observation', error.message || String(error)); }
    finally { setLoading(false); }
  }, [observationType.dataType, observationType.id, projectId]);
  useEffect(() => { void load(); }, [load]);

  const session = graphs?.sessions.find(item => item.id === selectedSession) || graphs?.sessions.at(-1);
  const straightData = useMemo<ChartDatum[]>(() => {
    if (!graphs) return [];
    if (allSessions) {
      const source = selectedTreatment
        ? graphs.timeSeries.filter(item => item.treatmentId === selectedTreatment)
        : graphs.treatmentSeries;
      return graphs.sessions.flatMap(current => source.flatMap(item => {
        const point = item.values.find(value => value.sessionId === current.id);
        if (point?.value == null) return [];
        if ('plotId' in item) {
          return [{ key: `${current.id}-${item.plotId}`, label: current.label, value: point.value, series: item.replication, detail: `Treatment T${item.treatmentId} · ${item.replication} · ${item.plot}` }];
        }
        const count = 'count' in point ? point.count : 1;
        return [{ key: `${current.id}-${item.treatmentId}`, label: current.label, value: point.value, series: item.treatment, detail: `${item.treatment} · Mean · N ${count}` }];
      }));
    }
    if (!session) return [];
    if (selectedTreatment) {
      return session.comparePlots
        .filter(item => item.treatmentId === selectedTreatment)
        .sort((a, b) => Number(a.replicationId) - Number(b.replicationId))
        .map(item => ({ key: item.plotId, label: item.plot, value: item.value, detail: `Treatment T${item.treatmentId} · Replication R${item.replicationId} · ${session.label}` }));
    }
    return session.compareTreatments.map(item => ({ key: item.treatmentId, label: item.treatment, value: item.average, detail: `Mean · N ${item.count} · ${session.label}` }));
  }, [allSessions, graphs, selectedTreatment, session]);
  const comparisonData = useMemo<ChartDatum[]>(() => comparison?.points.flatMap((point, pointIndex) => comparison.series.flatMap(series => { const value = point.values[series.key]; return value == null ? [] : [{ key: `${pointIndex}-${series.key}`, label: point.category, value, series: series.label, detail: `${series.label} · ${comparison.title}` }]; })) || [], [comparison]);
  const displayedData = mode === 'Straight' ? straightData : comparisonData;

  const runComparison = async (sessionIds: string[]) => {
    setComparisonSessions(sessionIds);
    if (sessionIds.length < 2) { setComparison(undefined); return; }
    try {
      const result = await compareObservation(projectId, observationType.id, { mode: 'sessions', sessionIds, groupBy: selectedTreatment ? 'plot' : 'treatment', selectedTreatments: selectedTreatment ? [`T${selectedTreatment}`] : undefined, aggregation: 'average' });
      setComparison(result); setMode('Comparison'); setStyle(sessionIds.length > 2 ? 'line' : 'bar');
    } catch (error: any) { Alert.alert('Unable to compare', error.message || String(error)); }
  };

  const saveEdit = async () => {
    if (!editing || editValue === '') return;
    try { await updateObservationRecord({ projectId, recordId: editing.id, value: observationType.dataType === 'number' ? Number(editValue) : observationType.dataType === 'boolean' ? editValue === 'true' : editValue, note: editNote.trim() }); setEditing(undefined); await load(); }
    catch (error: any) { Alert.alert('Could not update value', error.message || String(error)); }
  };
  const remove = (record: ObservationMeasurement) => Alert.alert('Delete observation?', 'This removes this plot value from its measurement session.', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteObservationRecord(projectId, record.id); await load(); } catch (error: any) { Alert.alert('Could not delete', error.message); } } }]);
  const exportFile = async (format: 'csv' | 'xlsx' | 'pdf') => { try { const saved = await exportObservations(projectId, format, observationType.id); Alert.alert('Export saved', `${saved.fileName}\n${saved.uri}`); } catch (error: any) { if (__DEV__) console.error('Observation export failed', error); Alert.alert('Export failed', error.message || String(error)); } };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}><LoadingState label="Loading structured data…" fullScreen /></View>;
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable onPress={() => navigation.goBack()} hitSlop={12}><ArrowLeft color={colors.text} /></Pressable><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{observationType.name}</Text><Text style={{ color: colors.muted }}>{observationType.dataType}{observationType.unit ? ` · ${observationType.unit}` : ''}</Text></View><Pressable onPress={() => setExportOpen(true)} style={iconButton}><Download color={Theme.colors.primary} /></Pressable></View>
    <View style={{ marginHorizontal: 16, flexDirection: 'row', backgroundColor: '#202630', borderRadius: 14, padding: 4 }}>{(['Data', ...(MOBILE_CHARTS_ENABLED ? ['Graphs'] : []), 'Summary'] as Tab[]).map(item => <Pressable key={item} onPress={() => setTab(item)} style={[tabButton, tab === item && activeTab]}><Text style={{ color: tab === item ? '#101318' : colors.muted, fontWeight: '700' }}>{item}</Text></Pressable>)}</View>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {tab === 'Data' && <>{records.length ? records.map(record => <View key={record.id} style={card}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{record.plotName} · {String(record.value)}{record.unit ? ` ${record.unit}` : ''}</Text><Text style={muted}>{record.treatment} · {record.replication} · {graphs?.sessions.find(item => item.id === record.sessionId)?.label || new Date(record.capturedAt).toLocaleString()}</Text>{record.note ? <Text style={[muted, { marginTop: 6 }]}>{record.note}</Text> : null}</View><Pressable onPress={() => { setEditing(record); setEditValue(String(record.value)); setEditNote(record.note || ''); }} hitSlop={10}><Pencil size={19} color={Theme.colors.primary} /></Pressable><Pressable onPress={() => remove(record)} hitSlop={10}><Trash2 size={19} color="#e36b73" /></Pressable></View></View>) : <Empty text="No values recorded yet." />}</>}
      {MOBILE_CHARTS_ENABLED && tab === 'Graphs' && observationType.dataType !== 'number' && <Empty text="Graphs and numeric summaries are available for Number observations." />}
      {MOBILE_CHARTS_ENABLED && tab === 'Graphs' && observationType.dataType === 'number' && <View style={{ gap: 14 }}>
        <View style={graphControlRow}><CompactSegment values={['Straight', 'Comparison']} value={mode} onChange={value => { const next = value as GraphMode; setMode(next); if (next === 'Comparison') void runComparison(comparisonSessions); }} /><Text style={{ color: colors.muted, fontSize: 12 }}>Chart</Text></View>
        <CompactSegment values={['line', 'bar', 'points']} value={style} onChange={value => setStyle(value as ChartStyle)} />
        {mode === 'Straight' ? <View style={filterCard}>
          <FilterRow label="View" value={selectedTreatment ? `${graphs?.treatmentSeries.find(item => item.treatmentId === selectedTreatment)?.treatment || selectedTreatment} replications` : 'Treatment overview'} onPress={() => { const ids = ['', ...(graphs?.treatmentSeries.map(item => item.treatmentId) || [])]; const index = ids.indexOf(selectedTreatment); setSelectedTreatment(ids[(index + 1) % ids.length]); }} />
          <FilterRow label="Period" value={allSessions ? 'All sessions' : 'One session'} onPress={() => { setAllSessions(value => { setStyle(!value ? 'line' : 'bar'); return !value; }); }} />
          {!allSessions && <FilterRow label="Session" value={session?.label || 'No sessions'} onPress={() => { const sessions = graphs?.sessions || []; const index = sessions.findIndex(item => item.id === selectedSession); setSelectedSession(sessions[(index + 1) % Math.max(1, sessions.length)]?.id || ''); }} />}
        </View> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{graphs?.sessions.map(item => <Pressable key={item.id} onPress={() => void runComparison(comparisonSessions.includes(item.id) ? comparisonSessions.filter(id => id !== item.id) : [...comparisonSessions, item.id])} style={[chip, comparisonSessions.includes(item.id) && activeChip]}><Text style={{ color: colors.text }}>{item.label}</Text></Pressable>)}</ScrollView>
          <Text style={muted}>{comparisonSessions.length < 2 ? 'Choose at least two sessions.' : `${comparisonSessions.length} sessions selected`}</Text>
          <Pressable onPress={() => void runComparison((graphs?.sessions || []).slice(-2).map(item => item.id))} style={secondaryAction}><Text style={secondaryActionText}>Compare latest two sessions</Text></Pressable>
        </>}
        <View style={chartCard}><Text style={chartTitle}>{mode === 'Comparison' ? comparison?.title || 'Session comparison' : selectedTreatment ? `${graphs?.treatmentSeries.find(item => item.treatmentId === selectedTreatment)?.treatment || selectedTreatment} replication plots` : 'Treatment overview'}</Text><Text style={chartSubtitle}>{mode === 'Comparison' ? 'Every value is constructed from plot-level records.' : selectedTreatment ? 'Each series remains attached to this treatment through its plot ID.' : 'Means are calculated from plot-level observations.'}</Text><ObservationChart data={displayedData} style={style} unit={observationType.unit} /></View>
      </View>}
      {tab === 'Summary' && summary && <View style={{ gap: 12 }}><View style={{ flexDirection: 'row', gap: 8 }}><Stat label="Mean" value={summary.average} unit={observationType.unit} /><Stat label="Min" value={summary.minimum} unit={observationType.unit} /><Stat label="Max" value={summary.maximum} unit={observationType.unit} /></View>{summary.byTreatment.map(item => { const treatmentRecords = records.filter(record => record.treatmentId === item.treatmentId); const sessions = new Set(treatmentRecords.map(record => record.sessionId)); const replications = new Set(treatmentRecords.map(record => record.replicationId)); return <View key={item.treatmentId} style={card}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{item.treatment}</Text><Text style={muted}>{replications.size} replications · {sessions.size} sessions</Text><Text style={{ color: colors.text, marginTop: 8 }}>Mean {item.average.toFixed(2)} · Min {item.minimum} · Max {item.maximum}</Text></View>; })}</View>}
      {tab === 'Summary' && !summary && <Empty text="No numeric summary is available." />}
    </ScrollView>
    <EditModal visible={!!editing} type={observationType} value={editValue} note={editNote} setValue={setEditValue} setNote={setEditNote} close={() => setEditing(undefined)} save={() => void saveEdit()} />
    <DataExportModal visible={exportOpen} close={() => setExportOpen(false)} normal={exportFile} />
  </View>;
}

function Segment({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) { return <View style={{ flexDirection: 'row', backgroundColor: '#202630', borderRadius: 13, padding: 3 }}>{values.map(item => <Pressable key={item} onPress={() => onChange(item)} style={[tabButton, value === item && activeTab]}><Text style={{ color: value === item ? '#101318' : colors.muted, fontWeight: '700', textTransform: 'capitalize' }}>{item}</Text></Pressable>)}</View>; }
function CompactSegment({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) { return <View style={compactSegment}>{values.map(item => <Pressable key={item} onPress={() => onChange(item)} style={[compactSegmentButton, value === item && activeTab]}><Text style={{ color: value === item ? '#101318' : colors.text, fontWeight: '600', textTransform: 'capitalize' }}>{item}</Text></Pressable>)}</View>; }
function FilterRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) { return <View style={filterRow}><Text style={filterLabel}>{label}</Text><Pressable onPress={onPress} style={selectButton}><Text numberOfLines={1} style={selectText}>{value}</Text><ChevronDown size={14} color={colors.text} /></Pressable></View>; }
function Stat({ label, value, unit }: { label: string; value: number | null; unit?: string | null }) { return <View style={[card, { flex: 1, alignItems: 'center' }]}><Text style={muted}>{label}</Text><Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5 }}>{value == null ? '—' : value.toFixed(2)}{unit ? ` ${unit}` : ''}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={card}><Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text></View>; }
function EditModal({ visible, type, value, note, setValue, setNote, close, save }: any) { return <Modal visible={visible} transparent animationType="fade"><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0} style={modalBackdrop}><View style={modalCard}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}><View style={modalHeader}><Text style={modalTitle}>Edit value</Text><Pressable onPress={close}><X color={colors.muted} /></Pressable></View>{type.dataType === 'boolean' ? <Segment values={['true', 'false']} value={value} onChange={setValue} /> : <Input label="Value" value={value} onChangeText={setValue} keyboardType={type.dataType === 'number' ? 'decimal-pad' : 'default'} />}<Input label="Note" value={note} onChangeText={setNote} /><Pressable onPress={save} style={primaryAction}><Text style={primaryActionText}>Save changes</Text></Pressable></ScrollView></View></KeyboardAvoidingView></Modal>; }
const card = { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, backgroundColor: colors.card };
const muted = { color: colors.muted, marginTop: 4 };
const iconButton = { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const tabButton = { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const };
const activeTab = { backgroundColor: Theme.colors.primary };
const chip = { minHeight: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, alignItems: 'center' as const, justifyContent: 'center' as const };
const activeChip = { borderColor: Theme.colors.primary, backgroundColor: '#30a65b24' };
const secondaryAction = { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const secondaryActionText = { color: colors.text, fontWeight: '700' as const };
const primaryAction = { minHeight: 48, borderRadius: 13, backgroundColor: Theme.colors.primary, flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, justifyContent: 'center' as const };
const primaryActionText = { color: '#101318', fontWeight: '800' as const };
const smallExport = { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const modalBackdrop = { flex: 1, justifyContent: 'center' as const, backgroundColor: '#000a', padding: 16 };
const modalCard = { maxHeight: '90%' as const, backgroundColor: colors.card, borderRadius: 22, padding: 18 };
const modalHeader = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 4 };
const modalTitle = { color: colors.text, fontSize: 21, fontWeight: '800' as const };
const graphControlRow = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const };
const compactSegment = { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 3 };
const compactSegmentButton = { minHeight: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center' as const, justifyContent: 'center' as const };
const filterCard = { gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 12, backgroundColor: '#12181b' };
const filterRow = { minHeight: 36, flexDirection: 'row' as const, alignItems: 'center' as const };
const filterLabel = { width: 48, color: colors.text, fontSize: 12 };
const selectButton = { maxWidth: '78%' as const, minHeight: 34, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 12 };
const selectText = { flexShrink: 1, color: colors.text, fontSize: 12 };
const chartCard = { borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 14, backgroundColor: '#12181b' };
const chartTitle = { color: colors.text, fontWeight: '800' as const, fontSize: 14 };
const chartSubtitle = { color: colors.muted, fontSize: 11, marginTop: 2, marginBottom: 8 };
function DataExportModal({ visible, close, normal }: any) { return <Modal visible={visible} transparent animationType="slide"><View style={modalBackdrop}><View style={modalCard}><View style={modalHeader}><Text style={modalTitle}>Export observation data</Text><Pressable onPress={close}><X color={colors.muted} /></Pressable></View><Text style={{ color: colors.muted, marginBottom: 12 }}>{Platform.OS === 'ios' ? 'Choose where to share or save the generated file.' : 'Files are saved to the public Downloads folder.'}</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['csv', 'xlsx', 'pdf'] as const).map(format => <Pressable key={format} onPress={() => void normal(format)} style={smallExport}><Text style={secondaryActionText}>{format === 'xlsx' ? 'Excel' : format.toUpperCase()}</Text></Pressable>)}</View></View></View></Modal>; }
