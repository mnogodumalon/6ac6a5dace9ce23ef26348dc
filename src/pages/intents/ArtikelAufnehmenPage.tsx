/**
 * Artikel aufnehmen — 5-Schritt-Wizard.
 * Steps: 1) Kategorie wählen → 2) Lieferant wählen (optional) → 3) Bezeichnung, Menge, Einheit, Bestand, Standort
 *        → 4) Zustand, Kaufdatum, Kaufpreis → 5) Prüfen & anlegen.
 * Reads: kategorien, lieferanten. Writes: inventar (via useArtikelAufnehmenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useArtikelAufnehmenFlow } from '@/lib/journey/flows/ArtikelAufnehmen';
import { tx } from '@/i18n';

export default function ArtikelAufnehmenPage() {
  const [step, setStep] = useState(1);
  const flow = useArtikelAufnehmenFlow({
    steps: {
      kategorie: 1, lieferant: 2,
      bezeichnung: 3, artikelnummer: 3, seriennummer: 3, menge: 3, einheit: 3, mindestbestand: 3, standort: 3,
      zustand: 4, kaufdatum: 4, kaufpreis: 4, notizen: 4,
    },
    items: {
      kategorie: r => ({ id: r.id, title: fieldText(r, 'kategorie_name') }),
      lieferant: r => ({ id: r.id, title: fieldText(r, 'firmenname'), subtitle: fieldText(r, 'ort') }),
    },
  });
  const f = flow.forms.inventar;

  return (
    <IntentWizardShell
      title={tx('Artikel aufnehmen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen neuen Artikel mit Kategorie und Lieferant erfassen.'),
        needs: [tx('Bezeichnung und Menge'), tx('Kategorie des Artikels')],
      }}
    >
      <WizardStep label={tx('Kategorie')} description={tx('Wähle die Kategorie, zu der der Artikel gehört.')}>
        <EntitySelectStep {...flow.picks.kategorie.select} {...flow.pick('kategorie')} searchPlaceholder={tx('Kategorie suchen …')} />
      </WizardStep>

      <WizardStep label={tx('Lieferant')} description={tx('Von wem kommt der Artikel? Das kannst du auch überspringen.')}>
        <EntitySelectStep {...flow.picks.lieferant.select} {...flow.pick('lieferant')} searchPlaceholder={tx('Lieferant suchen …')} />
        <StepNav onBack={() => setStep(1)} onNext={() => true} nextStepLabel={tx('Artikeldaten')} />
      </WizardStep>

      <WizardStep label={tx('Artikeldaten')} description={tx('Trage Bezeichnung, Menge, Einheit, Mindestbestand und Standort ein.')}>
        <div className="space-y-4">
          <Bound form={f} name="bezeichnung" />
          <Bound form={f} name="artikelnummer" />
          <Bound form={f} name="seriennummer" />
          <Bound form={f} name="menge" />
          <Bound form={f} name="einheit" />
          <Bound form={f} name="mindestbestand" />
          <Bound form={f} name="standort" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Zustand & Kauf')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Zustand & Kauf')} description={tx('Ergänze Zustand, Kaufdatum und Kaufpreis.')}>
        <div className="space-y-4">
          <Bound form={f} name="zustand" />
          <Bound form={f} name="kaufdatum" />
          <Bound form={f} name="kaufpreis" />
          <Bound form={f} name="notizen" />
          <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Artikel wird im Inventar angelegt und ist sofort verfügbar.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Bestand ändern'), href: '#/intents/bestand-aendern' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
