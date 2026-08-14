import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Theme } from '../../../../components/theme';

export type ChartStyle = 'line' | 'bar' | 'points';
export interface ChartDatum { key: string; label: string; value: number; detail: string; series?: string }
interface Props { data: ChartDatum[]; style: ChartStyle; unit?: string | null; height?: number }
const palette = ['#2fbfa9', '#3978c5', '#e29b3f', '#9b62c7', '#d35f78', '#58756f', '#ef7f45', '#466eab', '#79a84b', '#a85d8c'];
const short = (value: string) => value.length > 11 ? `${value.slice(0, 10)}…` : value;

export default function ObservationChart({ data, style, unit, height = 260 }: Props) {
  const [selected, setSelected] = useState<ChartDatum>();
  const [chartWidth, setChartWidth] = useState(360);
  const width = 720, left = 58, right = 18, top = 24, bottom = 54;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const valid = data.filter(item => Number.isFinite(item.value));
  const categories = useMemo(() => [...new Set(valid.map(item => item.label))], [valid]);
  const series = useMemo(() => [...new Set(valid.map(item => item.series || 'Value'))], [valid]);
  const max = Math.max(1, ...valid.map(item => item.value));
  const min = Math.min(0, ...valid.map(item => item.value));
  const range = Math.max(1, max - min);
  const x = (label: string) => left + (categories.indexOf(label) + .5) * (plotWidth / Math.max(1, categories.length));
  const y = (value: number) => top + (max - value) / range * plotHeight;
  const color = (item: ChartDatum) => palette[Math.max(0, series.indexOf(item.series || 'Value')) % palette.length];
  const itemX = (item: ChartDatum) => { if (style !== 'bar') return x(item.label); const seriesIndex = series.indexOf(item.series || 'Value'); const groupWidth = barWidth * series.length; return x(item.label) - groupWidth / 2 + seriesIndex * barWidth + barWidth / 2; };
  const itemY = (item: ChartDatum) => style === 'bar' ? (y(item.value) + y(0)) / 2 : y(item.value);
  const pick = (event: GestureResponderEvent) => {
    const scaledX = event.nativeEvent.locationX * (width / Math.max(1, chartWidth)), scaledY = event.nativeEvent.locationY;
    const match = valid.reduce<{ item?: ChartDatum; distance: number }>((best, item) => {
      // Resolve the exact rendered mark in two dimensions. Multi-series marks
      // sharing an x-axis category therefore retain their backend identity.
      const distance = Math.hypot(itemX(item) - scaledX, itemY(item) - scaledY);
      return distance < best.distance ? { item, distance } : best;
    }, { distance: Number.POSITIVE_INFINITY }).item;
    setSelected(match);
  };
  const ticks = [0, .25, .5, .75, 1];
  const categoryWidth = plotWidth / Math.max(1, categories.length);
  const barWidth = Math.max(5, Math.min(34, categoryWidth * .72 / Math.max(1, series.length)));

  return <View>
    <Pressable onLayout={event => setChartWidth(event.nativeEvent.layout.width)} onPress={pick} style={{ height, overflow: 'hidden' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {ticks.map(fraction => { const value = max - fraction * range; const tickY = top + fraction * plotHeight; return <React.Fragment key={fraction}><Line x1={left} x2={width - right} y1={tickY} y2={tickY} stroke="#2b313b" strokeWidth="1" strokeDasharray="4 4" /><SvgText x={left - 8} y={tickY + 5} fill="#8b98aa" fontSize="13" textAnchor="end">{Number.isInteger(value) ? value : value.toFixed(1)}</SvgText></React.Fragment>; })}
        {style === 'bar' && valid.map(item => { const seriesIndex = series.indexOf(item.series || 'Value'); const groupWidth = barWidth * series.length; const barX = x(item.label) - groupWidth / 2 + seriesIndex * barWidth; return <Rect key={item.key} x={barX + 1} y={y(Math.max(item.value, 0))} width={Math.max(3, barWidth - 2)} height={Math.max(2, Math.abs(y(item.value) - y(0)))} rx={4} fill={color(item)} opacity={selected && selected.key !== item.key ? .28 : 1} />; })}
        {style === 'line' && series.map((name, seriesIndex) => { const entries = categories.flatMap(label => { const item = valid.find(value => value.label === label && (value.series || 'Value') === name); return item ? [item] : []; }); const points = entries.map(item => `${x(item.label)},${y(item.value)}`).join(' '); return <React.Fragment key={name}>{entries.length > 1 && <Polyline points={points} fill="none" stroke={palette[seriesIndex % palette.length]} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" opacity={selected && (selected.series || 'Value') !== name ? .25 : 1} />}{entries.map(item => <Circle key={item.key} cx={x(item.label)} cy={y(item.value)} r={6} fill={palette[seriesIndex % palette.length]} stroke="#101318" strokeWidth={2} />)}</React.Fragment>; })}
        {style === 'points' && valid.map(item => <Circle key={item.key} cx={x(item.label)} cy={y(item.value)} r={7} fill={color(item)} stroke="#101318" strokeWidth={2} opacity={selected && selected.key !== item.key ? .25 : 1} />)}
        {categories.map(label => <SvgText key={label} x={x(label)} y={height - 20} fill="#8b98aa" fontSize="13" textAnchor="middle">{short(label)}</SvgText>)}
      </Svg>
    </Pressable>
    {!!series.length && series.length > 1 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: -8 }}>{series.map((name, index) => <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 10, height: 10, backgroundColor: palette[index % palette.length] }} /><Text style={{ color: palette[index % palette.length], fontSize: 12 }}>{name}</Text></View>)}</View>}
    {selected && <Pressable onPress={() => setSelected(undefined)} style={{ marginTop: 10, borderRadius: 14, backgroundColor: '#202630', padding: 12 }}><Text style={{ color: '#e7ebef', fontWeight: '800' }}>{selected.label} · {selected.value.toFixed(2)}{unit ? ` ${unit}` : ''}</Text>{selected.series && <Text style={{ color: Theme.colors.primary, marginTop: 4 }}>{selected.series}</Text>}<Text style={{ color: '#8b98aa', marginTop: 4 }}>{selected.detail}</Text></Pressable>}
    {!valid.length && <Text style={{ color: Theme.colors.mutedForeground, textAlign: 'center', marginTop: 12 }}>No numeric data for these filters.</Text>}
  </View>;
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char] || char));
export function chartSvg(data: ChartDatum[], title: string, unit?: string | null, style: ChartStyle = 'bar') {
  const valid = data.filter(item => Number.isFinite(item.value)), categories = [...new Set(valid.map(x => x.label))], series = [...new Set(valid.map(x => x.series || 'Value'))];
  const width = 900, height = 480, left = 70, right = 30, top = 70, base = 410, plotHeight = base - top;
  const max = Math.max(1, ...valid.map(x => x.value)), min = Math.min(0, ...valid.map(x => x.value)), range = Math.max(1, max - min);
  const x = (label: string) => left + (categories.indexOf(label) + .5) * ((width - left - right) / Math.max(1, categories.length)); const y = (value: number) => top + (max - value) / range * plotHeight;
  const grid = [0, .25, .5, .75, 1].map(f => `<line x1="${left}" y1="${top + f * plotHeight}" x2="${width - right}" y2="${top + f * plotHeight}" stroke="#d8e3e1" stroke-dasharray="4 4"/>`).join('');
  const labels = categories.map(label => `<text x="${x(label)}" y="440" text-anchor="middle" font-size="12" fill="#526b67">${escapeXml(short(label))}</text>`).join('');
  const marks = style === 'line' ? series.map((name, i) => { const entries = categories.flatMap(label => { const item = valid.find(v => v.label === label && (v.series || 'Value') === name); return item ? [item] : []; }); return `<polyline points="${entries.map(item => `${x(item.label)},${y(item.value)}`).join(' ')}" fill="none" stroke="${palette[i % palette.length]}" stroke-width="4"/>${entries.map(item => `<circle cx="${x(item.label)}" cy="${y(item.value)}" r="5" fill="${palette[i % palette.length]}"/>`).join('')}`; }).join('') : valid.map(item => { const i = series.indexOf(item.series || 'Value'), slot = (width - left - right) / Math.max(1, categories.length), bw = slot * .72 / Math.max(1, series.length); const bx = x(item.label) - bw * series.length / 2 + i * bw; return style === 'points' ? `<circle cx="${x(item.label)}" cy="${y(item.value)}" r="7" fill="${palette[i % palette.length]}"/>` : `<rect x="${bx + 1}" y="${y(Math.max(0, item.value))}" width="${Math.max(3, bw - 2)}" height="${Math.max(2, Math.abs(y(item.value) - y(0)))}" rx="4" fill="${palette[i % palette.length]}"/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/><text x="40" y="40" font-size="24" font-family="Arial" font-weight="700" fill="#173b36">${escapeXml(title)}${unit ? ` (${escapeXml(unit)})` : ''}</text>${grid}${marks}${labels}</svg>`;
}
