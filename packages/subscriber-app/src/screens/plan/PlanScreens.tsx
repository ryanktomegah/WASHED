import { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatXof, translate } from '@washed/i18n';

import { useSafeBack } from '../../navigation/useSafeBack.js';
import { SUBSCRIBER_PLAN_DEMO } from './subscriberPlanDemoData.js';
import { PlanTabBar } from './PlanTabBar.js';

// Renders the plan title `Compte bon jusqu'au {date}.` with the date
// italicised in primary terracotta. Splits on the deck-locked date token
// position so the italic span tracks deck phrasing changes.
function PlanActiveTitle({
  text,
  accentDate,
}: {
  readonly text: string;
  readonly accentDate: string;
}): ReactElement {
  const splitAt = text.indexOf(accentDate);
  if (splitAt === -1) return <>{text}</>;
  const before = text.slice(0, splitAt);
  const after = text.slice(splitAt + accentDate.length);
  return (
    <>
      {before}
      <em className="plan-title-accent">{accentDate}</em>
      {after}
    </>
  );
}

export function PlanX19(): ReactElement {
  const navigate = useNavigate();
  const { active } = SUBSCRIBER_PLAN_DEMO;
  const titleText = translate('subscriber.plan.title.active', 'fr', {
    date: active.accountGoodUntil,
  });

  return (
    <main aria-labelledby="x19-headline" className="plan-screen" data-screen-id="X-19">
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">{translate('subscriber.plan.eyebrow')}</span>
        </header>

        <h1 className="plan-title" id="x19-headline">
          <PlanActiveTitle text={titleText} accentDate={active.accountGoodUntil} />
        </h1>

        <section className="plan-active-card" aria-labelledby="x19-active-card-eyebrow">
          <span className="plan-active-card-eyebrow" id="x19-active-card-eyebrow">
            {translate('subscriber.plan.active_card.eyebrow').toUpperCase()}
          </span>
          <span className="plan-active-card-tier">
            {translate('subscriber.plan.active_card.tier', 'fr', {
              label: active.tierLabel,
              amount: formatXof(active.amountXof),
            })}
          </span>
          <div className="plan-active-card-row">
            <span className="plan-active-card-row-label">
              {translate('subscriber.plan.active_card.next_charge_label')}
            </span>
            <span className="plan-active-card-row-value">
              {translate('subscriber.plan.active_card.next_charge_value', 'fr', {
                date: active.nextChargeDate,
              })}
            </span>
          </div>
        </section>

        <h2 className="plan-eyebrow plan-section-eyebrow">
          {translate('subscriber.plan.next_visit.eyebrow')}
        </h2>
        <article className="plan-next-visit-card" aria-label={active.nextVisit.workerName}>
          <span aria-hidden="true" className="plan-avatar">
            {active.nextVisit.workerInitials}
          </span>
          <div className="plan-next-visit-meta">
            <strong>
              {translate('subscriber.plan.next_visit.summary', 'fr', {
                weekday: active.nextVisit.weekday,
                date: active.nextVisit.date,
                time: active.nextVisit.time,
              })}
            </strong>
            <span>
              {translate('subscriber.plan.next_visit.with_worker', 'fr', {
                name: active.nextVisit.workerName,
              })}
            </span>
          </div>
        </article>

        <div className="plan-row2">
          <button
            className="plan-button ghost"
            onClick={() => navigate('/plan/upgrade')}
            type="button"
          >
            {translate('subscriber.plan.cta_upgrade')}
          </button>
          <button
            className="plan-button ghost"
            onClick={() => navigate('/plan/pause')}
            type="button"
          >
            {translate('subscriber.plan.cta_pause')}
          </button>
        </div>

        <div className="plan-row2 plan-payment-actions">
          <button
            className="plan-button subtle"
            onClick={() => navigate('/plan/payments')}
            type="button"
          >
            {translate('subscriber.payment.action.view_history')}
          </button>
          <button
            className="plan-button subtle"
            onClick={() => navigate('/plan/payment-method')}
            type="button"
          >
            {translate('subscriber.payment.action.edit_method')}
          </button>
        </div>

        <div className="plan-grow" />

        <PlanTabBar />
      </div>
    </main>
  );
}

export function PlanPaymentHistoryX20(): ReactElement {
  const goBack = useSafeBack('/plan');
  const { payment } = SUBSCRIBER_PLAN_DEMO;
  const totalXof = payment.receipts.reduce((sum, receipt) => sum + receipt.amountXof, 0);

  return (
    <main aria-labelledby="x20-headline" className="plan-screen" data-screen-id="X-20">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.payment.history.header')} onBack={goBack} />

        <h1 className="plan-title" id="x20-headline">
          {translate('subscriber.payment.history.title', 'fr', {
            months: payment.historyMonths,
          })}
        </h1>

        <section
          className="plan-cream-card plan-payment-summary"
          aria-label={translate('subscriber.payment.history.summary_label')}
        >
          <div>
            <span className="plan-cream-body">
              {translate('subscriber.payment.history.total_label')}
            </span>
            <strong className="plan-payment-total">{formatXof(totalXof)}</strong>
          </div>
          <div className="plan-payment-summary-right">
            <span className="plan-cream-body">
              {translate('subscriber.payment.history.count_label', 'fr', {
                count: payment.historyMonths,
              })}
            </span>
            <strong className="plan-payment-total">
              {translate('subscriber.payment.history.success_rate')}
            </strong>
          </div>
        </section>

        <h2 className="plan-eyebrow plan-section-eyebrow">
          {translate('subscriber.payment.history.detail_eyebrow')}
        </h2>

        <ul
          className="plan-payment-list"
          aria-label={translate('subscriber.payment.history.detail_eyebrow')}
        >
          {payment.receipts.map((receipt) => (
            <li className="plan-payment-row" key={receipt.reference}>
              <div>
                <strong>{receipt.date}</strong>
                <span>
                  {receipt.provider} · {receipt.reference}
                </span>
              </div>
              <strong className="plan-payment-amount">{formatXof(receipt.amountXof)}</strong>
            </li>
          ))}
        </ul>

        <div className="plan-grow" />

        <button className="plan-button ghost full" disabled type="button">
          {translate('subscriber.payment.history.download_cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPaymentMethodX21(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/plan');
  const { payment } = SUBSCRIBER_PLAN_DEMO;
  const initialProvider =
    payment.methods.find((method) => method.isActive)?.provider ??
    payment.methods[0]?.provider ??
    '';
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);

  return (
    <main aria-labelledby="x21-headline" className="plan-screen" data-screen-id="X-21">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.payment.method.header')} onBack={goBack} />

        <h1 className="plan-title" id="x21-headline">
          {translate('subscriber.payment.method.title')}
        </h1>
        <p className="plan-copy">{translate('subscriber.payment.method.body')}</p>

        <div className="plan-method-list" role="list">
          {payment.methods.map((method) => {
            const isSelected = selectedProvider === method.provider;
            return (
              <button
                aria-pressed={isSelected}
                className={isSelected ? 'plan-method-card active' : 'plan-method-card'}
                key={method.provider}
                onClick={() => setSelectedProvider(method.provider)}
                type="button"
              >
                <span
                  className={isSelected ? 'plan-radio active' : 'plan-radio'}
                  aria-hidden="true"
                >
                  {isSelected ? <span /> : null}
                </span>
                <span className="plan-method-meta">
                  <strong>{method.provider}</strong>
                  <span>
                    {method.phone}
                    {method.isActive
                      ? ` · ${translate('subscriber.payment.method.current_suffix')}`
                      : ''}
                  </span>
                </span>
                <span className={isSelected ? 'plan-method-badge active' : 'plan-method-badge'}>
                  {isSelected
                    ? translate('subscriber.payment.method.active_badge').toUpperCase()
                    : translate('subscriber.payment.method.available_badge').toUpperCase()}
                </span>
              </button>
            );
          })}

          <button className="plan-method-card plan-method-add" disabled type="button">
            <span className="plan-radio" aria-hidden="true" />
            <strong>{translate('subscriber.payment.method.add_flooz')}</strong>
          </button>
        </div>

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          onClick={() => navigate('/plan')}
          type="button"
        >
          {translate('subscriber.payment.method.save_cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanOverdueX23(): ReactElement {
  const navigate = useNavigate();
  const { active, payment } = SUBSCRIBER_PLAN_DEMO;

  return (
    <main aria-labelledby="x23-headline" className="plan-screen" data-screen-id="X-23">
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">
            {translate('subscriber.dashboard.greeting.morning', 'fr', {
              name: payment.subscriberFirstName,
            })}
          </span>
          <span aria-hidden="true" className="plan-avatar">
            {payment.subscriberInitials}
          </span>
        </header>

        <section className="plan-danger-card" aria-labelledby="x23-headline">
          <span className="plan-eyebrow accent-danger">
            {translate('subscriber.payment.overdue.header')}
          </span>
          <h1 className="plan-overdue-title" id="x23-headline">
            {translate('subscriber.payment.failed.title')}
          </h1>
          <p className="plan-danger-body">{translate('subscriber.payment.failed.body')}</p>
          <p className="plan-danger-body">{translate('subscriber.payment.overdue.banner')}</p>
          <div className="plan-row2">
            <button
              className="plan-button danger-outline"
              onClick={() => navigate('/plan/payments')}
              type="button"
            >
              {translate('subscriber.payment.history.detail_eyebrow')}
            </button>
            <button className="plan-button primary" onClick={() => navigate('/plan')} type="button">
              {translate('subscriber.payment.failed.cta')}
            </button>
          </div>
        </section>

        <section className="plan-overdue-visit" aria-labelledby="x23-next-visit">
          <span className="plan-eyebrow" id="x23-next-visit">
            {translate('subscriber.payment.overdue.next_visit_eyebrow')}
          </span>
          <strong>{active.nextVisit.weekday}</strong>
          <span>{translate('subscriber.payment.overdue.waiting')}</span>
        </section>

        <div className="plan-grow" />

        <PlanTabBar activeItem="home" />
      </div>
    </main>
  );
}

export function PlanUpgradeX19U(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/plan');
  const { upgrade } = SUBSCRIBER_PLAN_DEMO;

  return (
    <main aria-labelledby="x19u-headline" className="plan-screen" data-screen-id="X-19.U">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.plan.upgrade.header')} onBack={goBack} />

        <h1 className="plan-title" id="x19u-headline">
          {translate('subscriber.plan.upgrade.title')}
        </h1>

        <p className="plan-copy">
          {translate('subscriber.plan.upgrade.body', 'fr', {
            date: upgrade.effectiveDate,
            savings: formatXof(upgrade.savingsXof),
          })}
        </p>

        <section className="plan-cream-card" aria-labelledby="x19u-changes-eyebrow">
          <span className="plan-eyebrow accent" id="x19u-changes-eyebrow">
            {translate('subscriber.plan.upgrade.changes_eyebrow')}
          </span>
          <div className="plan-compare-row">
            <span>{translate('subscriber.plan.upgrade.current_label')}</span>
            <span className="plan-compare-current">{formatXof(upgrade.currentAmountXof)}</span>
          </div>
          <div className="plan-compare-row">
            <strong>{translate('subscriber.plan.upgrade.new_label')}</strong>
            <span className="plan-compare-new">{formatXof(upgrade.newAmountXof)}</span>
          </div>
          <div className="plan-compare-divider" aria-hidden="true" />
          <div className="plan-compare-row plan-compare-row-savings">
            <span>{translate('subscriber.plan.upgrade.savings_label')}</span>
            <span className="plan-compare-savings">— {formatXof(upgrade.savingsXof)}</span>
          </div>
        </section>

        <section className="plan-list-card" aria-labelledby="x19u-effect-eyebrow">
          <span className="plan-eyebrow" id="x19u-effect-eyebrow">
            {translate('subscriber.plan.upgrade.effect_eyebrow')}
          </span>
          <ul className="plan-list">
            <li>{translate('subscriber.plan.upgrade.effect.remaining')}</li>
            <li>
              {translate('subscriber.plan.upgrade.effect.charge', 'fr', {
                date: upgrade.effectiveDate,
                amount: formatXof(upgrade.newAmountXof),
              })}
            </li>
            <li>{translate('subscriber.plan.upgrade.effect.bureau')}</li>
            <li>
              {translate('subscriber.plan.upgrade.effect.same_worker', 'fr', {
                name: upgrade.workerFirstName,
              })}
            </li>
          </ul>
        </section>

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          onClick={() => navigate('/plan')}
          type="button"
        >
          {translate('subscriber.plan.upgrade.confirm.cta', 'fr', {
            amount: formatXof(upgrade.newAmountXof),
          })}
        </button>
        <button className="plan-button ghost full" onClick={() => navigate('/plan')} type="button">
          {translate('subscriber.plan.upgrade.cancel.cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPauseConfirmX22(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/plan');
  const { active, upgrade } = SUBSCRIBER_PLAN_DEMO;

  return (
    <main aria-labelledby="x22-headline" className="plan-screen" data-screen-id="X-22">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.plan.pause.header')} onBack={goBack} />

        <h1 className="plan-title" id="x22-headline">
          {translate('subscriber.plan.pause.title')}
        </h1>

        <p className="plan-copy">
          {translate('subscriber.plan.pause.body', 'fr', {
            name: active.nextVisit.workerName.split(' ')[0] ?? active.nextVisit.workerName,
            amount: formatXof(active.amountXof),
          })}
        </p>

        <section className="plan-warn-card" aria-labelledby="x22-warn-eyebrow">
          <span className="plan-eyebrow accent-warn" id="x22-warn-eyebrow">
            {translate('subscriber.plan.pause.warn_eyebrow')}
          </span>
          <ul className="plan-list">
            <li>
              {translate('subscriber.plan.pause.warn.cancel_visit', 'fr', {
                weekday: active.nextVisit.weekday.toLowerCase(),
                date: active.nextVisit.date,
              })}
            </li>
            <li>
              {translate('subscriber.plan.pause.warn.no_charge', 'fr', {
                date: active.nextChargeDate,
              })}
            </li>
            <li>{translate('subscriber.plan.pause.warn.resume')}</li>
          </ul>
        </section>

        <section className="plan-cream-card" aria-labelledby="x22-savings-eyebrow">
          <span className="plan-eyebrow accent" id="x22-savings-eyebrow">
            {translate('subscriber.plan.pause.savings_eyebrow')}
          </span>
          <p className="plan-cream-body">
            {translate('subscriber.plan.pause.savings_body', 'fr', {
              savings: formatXof(upgrade.savingsXof),
            })}
          </p>
        </section>

        <div className="plan-grow" />

        <button className="plan-button ghost full" onClick={() => navigate('/plan')} type="button">
          {translate('subscriber.plan.upgrade.cancel.cta')}
        </button>
        <button
          className="plan-button danger full"
          onClick={() => navigate('/plan/pause/submitted')}
          type="button"
        >
          {translate('subscriber.plan.pause.confirm.cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPausedSuccessX22A(): ReactElement {
  const navigate = useNavigate();
  const { active, paused } = SUBSCRIBER_PLAN_DEMO;
  const titleText = translate('subscriber.plan.pause.success.title');

  return (
    <main aria-labelledby="x22a-headline" className="plan-screen" data-screen-id="X-22.A">
      <div className="plan-body plan-body-success">
        <div className="plan-grow" />

        <span aria-hidden="true" className="plan-pause-glyph">
          ⏸
        </span>

        <h1 className="plan-title plan-success-title" id="x22a-headline">
          <PauseAccentTitle text={titleText} />
        </h1>

        <p className="plan-copy plan-success-copy">
          {translate('subscriber.plan.pause.success.body', 'fr', {
            name: paused.workerFirstName,
          })}
        </p>

        <section
          className="plan-cream-card plan-success-card"
          aria-labelledby="x22a-changes-eyebrow"
        >
          <span className="plan-eyebrow accent" id="x22a-changes-eyebrow">
            {translate('subscriber.plan.pause.success.changes_eyebrow')}
          </span>
          <ul className="plan-list">
            <li>
              {translate('subscriber.plan.pause.success.changes.visit', 'fr', {
                weekday: active.nextVisit.weekday.toLowerCase(),
                date: active.nextVisit.date,
              })}
            </li>
            <li>
              {translate('subscriber.plan.pause.success.changes.no_charge', 'fr', {
                date: active.nextChargeDate,
              })}
            </li>
            <li>{translate('subscriber.plan.pause.success.changes.data')}</li>
            <li>{translate('subscriber.plan.pause.success.changes.resume')}</li>
          </ul>
        </section>

        <section
          className="plan-warn-card plan-success-card"
          aria-labelledby="x22a-deadline-eyebrow"
        >
          <span className="plan-eyebrow accent-warn" id="x22a-deadline-eyebrow">
            {translate('subscriber.plan.pause.success.deadline_eyebrow')}
          </span>
          <p className="plan-cream-body">
            {translate('subscriber.plan.pause.success.deadline_body', 'fr', {
              date: paused.autoCloseDate,
            })}
          </p>
        </section>

        <div className="plan-grow" />

        <button
          className="plan-button ink full"
          onClick={() => navigate('/plan/paused')}
          type="button"
        >
          {translate('subscriber.plan.pause.success.cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPausedX19R(): ReactElement {
  const navigate = useNavigate();
  const { paused } = SUBSCRIBER_PLAN_DEMO;

  return (
    <main aria-labelledby="x19r-headline" className="plan-screen" data-screen-id="X-19.R">
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">{translate('subscriber.plan.eyebrow')}</span>
        </header>

        <section className="plan-warn-card" aria-labelledby="x19r-paused-eyebrow">
          <span className="plan-eyebrow accent-warn" id="x19r-paused-eyebrow">
            {translate('subscriber.plan.paused.eyebrow').toUpperCase()}
          </span>
          <strong className="plan-paused-headline">
            {translate('subscriber.plan.paused.headline')}
          </strong>
          <span className="plan-paused-since">
            {translate('subscriber.plan.paused.since', 'fr', {
              date: paused.pauseStartDate,
              day: paused.daysIntoPause,
            })}
          </span>
        </section>

        <h1 className="plan-title" id="x19r-headline">
          {translate('subscriber.plan.paused.title')}
        </h1>

        <section className="plan-cream-card" aria-labelledby="x19r-worker-eyebrow">
          <span className="plan-eyebrow accent" id="x19r-worker-eyebrow">
            {translate('subscriber.plan.paused.worker_eyebrow')}
          </span>
          <div className="plan-paused-worker">
            <span aria-hidden="true" className="plan-avatar plan-avatar-lg">
              {paused.workerInitials}
            </span>
            <div className="plan-paused-worker-meta">
              <strong>
                {translate('subscriber.plan.paused.worker_line', 'fr', {
                  name: paused.workerName,
                })}
              </strong>
              <span>
                {translate('subscriber.plan.paused.worker_sub', 'fr', {
                  months: paused.tenureMonths,
                })}
              </span>
            </div>
          </div>
        </section>

        <section className="plan-list-card" aria-labelledby="x19r-deadline-eyebrow">
          <span className="plan-eyebrow" id="x19r-deadline-eyebrow">
            {translate('subscriber.plan.paused.deadline_eyebrow').toUpperCase()}
          </span>
          <p className="plan-deadline-body">
            {translate('subscriber.plan.paused.deadline_body', 'fr', {
              date: paused.autoCloseDate,
              name: paused.workerFirstName,
            })}
          </p>
        </section>

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          onClick={() => navigate('/plan')}
          type="button"
        >
          {translate('subscriber.plan.paused.resume_cta')}
        </button>
        <button
          className="plan-button ghost full plan-button-sm"
          onClick={() => navigate('/plan')}
          type="button"
        >
          {translate('subscriber.plan.paused.extend_cta')}
        </button>

        <PlanTabBar />
      </div>
    </main>
  );
}

function BackHeader({
  label,
  onBack,
}: {
  readonly label: string;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <header className="plan-back-header">
      <button aria-label="Retour" className="plan-back" onClick={onBack} type="button">
        ‹
      </button>
      <span className="plan-eyebrow">{label.toUpperCase()}</span>
    </header>
  );
}

function PauseAccentTitle({ text }: { readonly text: string }): ReactElement {
  // Italicise the leading "Pause" word per design hi-fi:1326.
  const accent = 'Pause';
  if (!text.startsWith(accent)) return <>{text}</>;
  return (
    <>
      <em className="plan-pause-accent">{accent}</em>
      {text.slice(accent.length)}
    </>
  );
}
