/**
 * Zustand melden — 3-Schritt-Wizard.
 * Steps: 1) Artikel wählen → 2) Neuen Zustand wählen → 3) Standort und Notiz ergänzen → Prüfen & speichern.
 * Reads: inventar. Writes: inventar (update: zustand, standort, notizen).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useZustandMeldenFlow } from '@/lib/journey/flows/ZustandMelden';
import { tx } from '@/i18n';

export default function ZustandMeldenPage() {
  const [step, setStep] = useState(1);
  const flow = useZustandMeldenFlow({
    steps: { inventar: 1, zustand: 2, standort: 3, notizen: 3 },
    items: {
      inventar: r => {
        const zustand = fieldLookup(r, 'zustand');
        const standort = fieldText(r, 'standort');
        return {
          id: r.id,
          title: fieldText(r, 'bezeichnung'),
          subtitle: standort || undefined,
          status: zustand ?? undefined,
        };
      },
    },
  });
  const f = flow.forms.inventar;

  return (
    <IntentWizardShell
      title={tx('Zustand melden')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Den Zustand eines Artikels ändern und den Standort vermerken.'),
        needs: [tx('Name des Artikels'), tx('Neuer Zustand, z. B. defekt')],
      }}
    >
      <WizardStep label={tx('Artikel')} description={tx('Welcher Artikel hat einen neuen Zustand?')}>
        <EntitySelectStep
          {...flow.picks.inventar.select}
          {...flow.pick('inventar')}
          searchPlaceholder={tx('Bezeichnung suchen …')}
        />
      </WizardStep>
      <WizardStep
        label={tx('Zustand')}
        description={tx('In welchem Zustand ist der Artikel jetzt?')}
        needs={['inventar']}
      >
        <div className="space-y-4">
          <Bound form={f} name="zustand" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Standort')}
          />
        </div>
      </WizardStep>
      <WizardStep
        label={tx('Standort')}
        description={tx('Wo befindet sich der Artikel jetzt? Eine Notiz ist optional.')}
        needs={['inventar']}
      >
        <div className="space-y-4">
          <Bound form={f} name="standort" placeholder={tx('z. B. Werkstatt, Lager 2')} />
          <Bound form={f} name="notizen" rows={3} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Artikel erhält sofort den neuen Zustand und Standort.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weiteren Zustand melden'), onClick: () => flow.reset() },
            { label: tx('Bestand ändern'), href: '#/intents/bestand-aendern' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
