import { useMemo, useState } from 'react';
import { IconAlertTriangle, IconPackage, IconPlus, IconSearch, IconTool } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedInventar } from '@/types/enriched';
import { lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { appLabel, tx } from '@/i18n';
import { gruss, namen, undoToast, useClock } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

type Filter = 'all' | 'unter' | 'defekt';

function isUnder(r: EnrichedInventar): boolean {
  const { menge, mindestbestand } = r.fields;
  return mindestbestand != null && mindestbestand > 0 && (menge ?? 0) < mindestbestand;
}

function isBroken(r: EnrichedInventar): boolean {
  const k = r.fields.zustand?.key;
  return k === 'defekt' || k === 'in_reparatur';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { setInventar, fetchAll } = data;
  const clock = useClock();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  // Advance helper: a broken/in-repair item is marked as good again.
  const markRepaired = (rec: EnrichedInventar) => {
    const prev = rec.fields.zustand;
    const next = lookupOption('inventar', 'zustand', 'gut');
    setInventar(list => list.map(r => (r.record_id === rec.record_id ? { ...r, fields: { ...r.fields, zustand: next } } : r)));
    LivingAppsService.updateInventarEntry(rec.record_id, { zustand: 'gut' }).catch(() => fetchAll());
    undoToast(tx`${rec.fields.bezeichnung ?? ''} — wieder einsatzbereit`, () => {
      setInventar(list => list.map(r => (r.record_id === rec.record_id ? { ...r, fields: { ...r.fields, zustand: prev } } : r)));
      LivingAppsService.updateInventarEntry(rec.record_id, { zustand: prev?.key ?? null as unknown as undefined }).catch(() => fetchAll());
    });
  };

  const crud = useEntityCrud(data, {
    footer: top =>
      top.type === 'inventar' && isBroken(top.record)
        ? { label: tx('Wieder einsatzbereit'), onClick: () => markRepaired(top.record) }
        : undefined,
  });
  const items = crud.enriched.inventar;

  const under = useMemo(
    () => items.filter(isUnder).sort((a, b) => (a.fields.menge ?? 0) - (a.fields.mindestbestand ?? 0) - ((b.fields.menge ?? 0) - (b.fields.mindestbestand ?? 0))),
    [items],
  );
  const broken = useMemo(() => items.filter(isBroken), [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(r => (filter === 'unter' ? isUnder(r) : filter === 'defekt' ? isBroken(r) : true))
      .filter(r => !q || [r.fields.bezeichnung, r.fields.artikelnummer, r.fields.standort, r.kategorieName, r.lieferantName].some(v => (v ?? '').toLowerCase().includes(q)))
      .sort((a, b) => (a.fields.bezeichnung ?? '').localeCompare(b.fields.bezeichnung ?? ''));
  }, [items, filter, query]);

  const chartRows = useMemo<ChartRow<EnrichedInventar>[]>(
    () => items.map(r => ({ id: `inventar:${r.record_id}`, data: r })),
    [items],
  );

  const openCreate = () => crud.inventar.openCreate({});
  const einheit = (r: EnrichedInventar) => r.fields.einheit?.label ?? '';

  let context: string;
  if (items.length === 0) context = tx`Richte dein Werkstattlager ein — erfasse den ersten Artikel.`;
  else if (under.length > 0) context = tx`Nachbestellen: ${namen(under.map(r => r.fields.bezeichnung ?? ''), 3)}.`;
  else if (broken.length > 0) context = tx`Nicht einsatzbereit: ${namen(broken.map(r => r.fields.bezeichnung ?? ''), 3)}.`;
  else context = tx`Alle Bestände sind ausreichend und alles ist einsatzbereit.`;

  const empty = items.length === 0;

  const list = (
    <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b">
        <h2 className="text-base font-semibold mr-auto">{appLabel('inventar')}</h2>
        <div className="relative w-full sm:w-64">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={tx('Artikel suchen')} className="pl-9" />
        </div>
      </div>
      {filter !== 'all' && (
        <div className="px-4 py-2 text-sm bg-muted/50 flex flex-wrap items-center gap-2">
          <span>{filter === 'unter' ? tx('Gefiltert: unter Mindestbestand') : tx('Gefiltert: defekt oder in Reparatur')}</span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setFilter('all')}>{tx('Filter aufheben')}</Button>
        </div>
      )}
      <ul className="divide-y max-h-[640px] overflow-y-auto">
        {visible.map(r => {
          const low = isUnder(r);
          const bad = isBroken(r);
          return (
            <li key={r.record_id}>
              <button type="button" onClick={() => crud.inventar.openDetail(r)} className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.fields.bezeichnung ?? '—'}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {[r.kategorieName, r.fields.standort, r.lieferantName].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={low ? 'font-semibold text-destructive' : 'font-semibold'}>
                    {r.fields.menge ?? 0} {einheit(r)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.fields.mindestbestand != null ? tx`Min. ${r.fields.mindestbestand}` : ''}
                    {bad && <span className="ml-1 font-medium text-amber-600">{r.fields.zustand?.label}</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">{tx('Keine Artikel gefunden.')}</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.inventar.canWrite && (
          <Button onClick={openCreate}>
            <IconPlus size={16} className="mr-1 shrink-0" />
            {tx('Neuer Artikel')}
          </Button>
        )}
      </div>

      {empty ? (
        <div className="rounded-[27px] bg-card shadow-lg p-10 flex flex-col items-center gap-3 text-center">
          <IconPackage size={48} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{tx('Noch kein Artikel im Lager.')}</p>
          {crud.inventar.canWrite && <Button onClick={openCreate}>{tx('Ersten Artikel aufnehmen')}</Button>}
        </div>
      ) : (
        <DashboardGrid
          variant="split"
          hero={
            under.length > 0 && (
              <HeroBanner
                icon={<IconAlertTriangle size={18} />}
                action={{ label: filter === 'unter' ? tx('Alle anzeigen') : tx('Artikel anzeigen'), onClick: () => setFilter(f => (f === 'unter' ? 'all' : 'unter')) }}
              >
                <b>{namen(under.map(r => r.fields.bezeichnung ?? ''), 3)}</b> {tx('unter Mindestbestand — nachbestellen.')}
              </HeroBanner>
            )
          }
          kpis={
            <StatStrip>
              <StatStripItem
                title={tx('Artikel gesamt')}
                value={items.length}
                icon={<IconPackage size={18} className="text-muted-foreground" />}
                onClick={() => setFilter('all')}
                active={filter === 'all'}
              />
              <StatStripItem
                title={tx('Defekt / Reparatur')}
                value={broken.length}
                icon={<IconTool size={18} className="text-muted-foreground" />}
                tone={broken.length > 0 ? 'warning' : 'default'}
                onClick={() => setFilter(f => (f === 'defekt' ? 'all' : 'defekt'))}
                active={filter === 'defekt'}
              />
            </StatStrip>
          }
          aside={
            <>
              <WorkList
                title={tx('Defekt & in Reparatur')}
                items={broken.map(r => ({
                  id: r.record_id,
                  title: r.fields.bezeichnung ?? '—',
                  secondLine: (
                    <>
                      <span className="font-medium text-amber-600">{r.fields.zustand?.label}</span>
                      <span className="text-muted-foreground"> · {r.fields.standort ?? r.kategorieName}</span>
                    </>
                  ),
                  action: { label: tx('✓ Einsatzbereit'), onClick: () => markRepaired(r) },
                }))}
                onItemClick={id => {
                  const rec = items.find(r => r.record_id === id);
                  if (rec) crud.inventar.openDetail(rec);
                }}
                empty={{ text: tx('Alles einsatzbereit — nichts in Reparatur.') }}
              />
              <ChartWidget<EnrichedInventar>
                title={tx('Artikel je Kategorie')}
                rows={chartRows}
                dimension={{ kind: 'category', accessor: r => r.data.kategorieName || null, label: tx('Kategorie') }}
              />
            </>
          }
          primary={list}
        />
      )}
      {crud.surfaces}
    </div>
  );
}
