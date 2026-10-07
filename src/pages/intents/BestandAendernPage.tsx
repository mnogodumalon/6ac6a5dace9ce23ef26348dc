/**
 * Bestand ändern — 3-Schritt-Wizard mit Prüfung.
 * Steps: 1) Artikel wählen → 2) Aktuellen Bestand ansehen und neue Menge eingeben → 3) Prüfen & speichern.
 * Reads: inventar. Writes: inventar (nur `menge`, aktualisiert den gewählten Artikel).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep, BudgetTracker.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { fieldText, fieldNumber, fieldLookup } from '@/lib/journey';
import { useBestandAendernFlow } from '@/lib/journey/flows/BestandAendern';
import { tx } from '@/i18n';

export default function BestandAendernPage() {
  const [step, setStep] = useState(1);
  const flow = useBestandAendernFlow({
    steps: { inventar: 1, menge: 2 },
    items: {
      inventar: r => {
        const menge = fieldNumber(r, 'menge');
        const einheit = fieldLookup(r, 'einheit')?.label ?? '';
        const standort = fieldText(r, 'standort');
        return {
          id: r.id,
          title: fieldText(r, 'bezeichnung'),
          subtitle: [menge !== null ? `${menge} ${einheit}`.trim() : '', standort].filter(Boolean).join(' · '),
        };
      },
    },
  });

  const f = flow.forms.inventar;
  const record = flow.targets.inventar.record;
  const current = record ? fieldNumber(record, 'menge') : null;
  const minimum = record ? fieldNumber(record, 'mindestbestand') : null;
  const einheit = record ? fieldLookup(record, 'einheit')?.label ?? '' : '';
  const name = record ? fieldText(record, 'bezeichnung') : '';
  const standort = record ? fieldText(record, 'standort') : '';

  const rawNew = f.get('menge');
  const parsedNew = rawNew === null || rawNew === undefined || rawNew === '' ? null : Number(rawNew);
  const newMenge = parsedNew !== null && Number.isFinite(parsedNew) ? parsedNew : null;
  const delta = newMenge !== null && current !== null ? newMenge - current : null;
  const belowMin = newMenge !== null && minimum !== null && newMenge < minimum;

  const checkMenge = (): boolean | string => {
    if (!flow.validateStep(2)) return false;
    if (newMenge !== null && newMenge < 0) return tx('Die Menge darf nicht unter null fallen.');
    return true;
  };

  const needsPick = (
    <StepNav onBack={() => setStep(1)} nextDisabled>
      {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
    </StepNav>
  );

  return (
    <IntentWizardShell
      title={tx('Bestand ändern')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Menge eines Artikels nach Entnahme oder Wareneingang anpassen.'),
        needs: [tx('Name des Artikels'), tx('Gezählte neue Menge')],
      }}
    >
      <WizardStep label={tx('Artikel')} description={tx('Suche den Artikel, dessen Bestand sich geändert hat.')}>
        <EntitySelectStep
          {...flow.picks.inventar.select}
          {...flow.pick('inventar')}
          searchPlaceholder={tx('Bezeichnung oder Standort …')}
        />
      </WizardStep>

      <WizardStep label={tx('Bestand & neue Menge')} description={tx('Prüfe den aktuellen Bestand und gib die Menge ein, die danach gelten soll.')}>
        {record ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 overflow-hidden">
              <p className="text-lg font-semibold truncate">{name}</p>
              {standort && <p className="text-sm text-muted-foreground truncate">{standort}</p>}
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary p-3">
                  <dt className="text-xs text-muted-foreground">{tx('Aktuelle Menge')}</dt>
                  <dd className="text-2xl font-semibold">{current ?? '—'} <span className="text-sm font-normal text-muted-foreground">{einheit}</span></dd>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <dt className="text-xs text-muted-foreground">{tx('Mindestbestand')}</dt>
                  <dd className="text-2xl font-semibold">{minimum ?? '—'} <span className="text-sm font-normal text-muted-foreground">{minimum !== null ? einheit : ''}</span></dd>
                </div>
              </dl>
            </div>
            {minimum !== null && minimum > 0 && current !== null && (
              <BudgetTracker
                format="count"
                unit={einheit || tx('Stück')}
                budget={Math.max(minimum * 2, current, 1)}
                booked={Math.max(current, 0)}
                label={tx('Bestand im Verhältnis zum doppelten Mindestbestand')}
                showRemaining={false}
              />
            )}
            {current !== null && minimum !== null && current < minimum && (
              <p className="text-sm text-destructive">{tx`Der Bestand liegt bereits ${minimum - current} unter dem Mindestbestand.`}</p>
            )}
            <Bound form={f} name="menge" hint={einheit ? tx`In ${einheit}, nicht unter 0` : tx('Nicht unter 0')} />
            {delta !== null && (
              <p className="text-sm">
                {delta === 0
                  ? tx('Die Menge bleibt unverändert.')
                  : delta > 0
                    ? tx`Wareneingang: +${delta} ${einheit}`
                    : tx`Entnahme: ${delta} ${einheit}`}
              </p>
            )}
            {newMenge !== null && newMenge < 0 && (
              <p className="text-xs text-destructive">{tx('Die Menge darf nicht unter null fallen.')}</p>
            )}
            {belowMin && newMenge !== null && newMenge >= 0 && (
              <p className="text-xs text-destructive">{tx`Achtung: Das liegt unter dem Mindestbestand von ${minimum ?? 0}.`}</p>
            )}
            <StepNav onBack={() => setStep(1)} onNext={checkMenge} nextStepLabel={tx('Prüfen')} />
          </div>
        ) : needsPick}
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die neue Menge ersetzt den bisherigen Bestand des Artikels.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          submit={flow.submit}
          forms={flow.formList}
          facts={[
            { label: tx('Neue Menge'), value: `${newMenge ?? '—'} ${einheit}`.trim() },
            { label: tx('Mindestbestand'), value: minimum !== null ? `${minimum} ${einheit}`.trim() : '—' },
          ]}
          next={[
            { label: tx('Weiteren Bestand ändern'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Zustand melden'), href: '#/intents/zustand-melden' },
            { label: tx('Artikel aufnehmen'), href: '#/intents/artikel-aufnehmen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
