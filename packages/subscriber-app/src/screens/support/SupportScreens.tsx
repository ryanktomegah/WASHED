import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSafeBack } from '../../navigation/useSafeBack.js';
import {
  findSupportTicket,
  openSupportTicketCount,
  SUPPORT_CONTACT_CATEGORIES,
  SUPPORT_DEMO,
  SUPPORT_FAQS,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
  SUPPORT_TICKETS,
  UPDATE_REQUIRED_URL,
  type SupportCategoryId,
  type SupportFaqId,
  type SupportTicketDemo,
} from './supportDemoData.js';

export function HelpCenterX29(): ReactElement {
  const navigate = useNavigate();
  const [openFaqId, setOpenFaqId] = useState<SupportFaqId | null>(null);
  const openCount = openSupportTicketCount();

  return (
    <main aria-labelledby="x29-headline" className="support-screen" data-screen-id="X-29">
      <div className="support-body">
        <span className="support-eyebrow">{translate('subscriber.support.help.eyebrow')}</span>
        <h1 className="support-title" id="x29-headline">
          {translate('subscriber.support.help.title')}
        </h1>

        <a className="support-call-card" href={SUPPORT_PHONE_HREF}>
          <span aria-hidden="true" className="support-call-icon">
            ☎
          </span>
          <span className="support-call-copy">
            <strong>{translate('subscriber.support.help.call.title')}</strong>
            <small>{translate('subscriber.support.help.call.detail')}</small>
          </span>
          <span aria-hidden="true" className="support-chevron">
            ›
          </span>
        </a>

        <button
          className="support-button ghost full"
          onClick={() => navigate('/support/contact')}
          type="button"
        >
          {translate('subscriber.support.help.write.cta')}
        </button>

        <section className="support-section" aria-labelledby="x29-faq">
          <h2 className="support-eyebrow" id="x29-faq">
            {translate('subscriber.support.help.faq.eyebrow')}
          </h2>
          <div className="support-faq-list">
            {SUPPORT_FAQS.map((faq) => {
              const isOpen = faq.id === openFaqId;
              const panelId = `support-faq-${faq.id}`;
              return (
                <article className={`support-faq${isOpen ? ' open' : ''}`} key={faq.id}>
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="support-faq-toggle"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    type="button"
                  >
                    <span>{translate(faq.questionKey)}</span>
                    <span aria-hidden="true" className="support-plus">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="support-faq-answer" id={panelId}>
                      {translate(faq.answerKey)}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <div className="support-grow" />
        <button
          className="support-button primary full"
          onClick={() => navigate('/support/tickets')}
          type="button"
        >
          {translate('subscriber.support.help.tickets.cta', 'fr', { openCount })}
        </button>
      </div>
    </main>
  );
}

export function ContactBureauX30(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/support');
  const [selectedCategory, setSelectedCategory] = useState<SupportCategoryId>('visit');
  const [message, setMessage] = useState('');
  const isValid = message.trim().length >= 3;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isValid) return;
    navigate('/support/contact/submitted');
  };

  return (
    <main aria-labelledby="x30-headline" className="support-screen" data-screen-id="X-30">
      <form className="support-body" onSubmit={onSubmit}>
        <SupportBackHeader label={translate('subscriber.support.contact.header')} onBack={goBack} />
        <h1 className="support-title" id="x30-headline">
          {translate('subscriber.support.contact.title')}
        </h1>

        <fieldset className="support-choice-list" aria-labelledby="x30-headline">
          <legend className="support-sr">{translate('subscriber.support.contact.header')}</legend>
          {SUPPORT_CONTACT_CATEGORIES.map((category) => (
            <label
              className={`support-choice${category.id === selectedCategory ? ' selected' : ''}`}
              key={category.id}
            >
              <input
                checked={category.id === selectedCategory}
                className="support-sr"
                name="supportCategory"
                onChange={() => setSelectedCategory(category.id)}
                type="radio"
                value={category.id}
              />
              <span aria-hidden="true" className="support-radio" />
              <span>{translate(category.labelKey)}</span>
            </label>
          ))}
        </fieldset>

        <div className="support-field">
          <label className="support-eyebrow" htmlFor="x30-message">
            {translate('subscriber.support.contact.message.label').toUpperCase()}
          </label>
          <textarea
            className="support-textarea"
            id="x30-message"
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)}
            placeholder={translate('subscriber.support.contact.message.placeholder')}
            value={message}
          />
        </div>

        <div className="support-grow" />
        <button className="support-button primary full lg" disabled={!isValid} type="submit">
          {translate('subscriber.support.contact.submit.cta')}
        </button>
      </form>
    </main>
  );
}

export function ContactSubmittedX30S(): ReactElement {
  const navigate = useNavigate();
  const ticketId = SUPPORT_DEMO.submittedTicketId;

  return (
    <main aria-labelledby="x30s-headline" className="support-screen" data-screen-id="X-30.S">
      <div className="support-body center">
        <div className="support-grow" />
        <div aria-hidden="true" className="support-checkmark">
          ✓
        </div>
        <h1 className="support-title centered" id="x30s-headline">
          {translate('subscriber.support.contact.submitted.title')}
        </h1>
        <p className="support-copy centered">
          {translate('subscriber.support.contact.submitted.body', 'fr', { ticketId })}
        </p>
        <section className="support-card cream full" aria-label="Ticket créé">
          <span className="support-eyebrow accent">
            {translate('subscriber.support.contact.submitted.card_eyebrow', 'fr', { ticketId })}
          </span>
          <p>{translate('subscriber.support.contact.submitted.card_status')}</p>
        </section>
        <div className="support-grow" />
        <button
          className="support-button primary full"
          onClick={() => navigate('/support/tickets')}
          type="button"
        >
          {translate('subscriber.support.contact.submitted.tickets_cta')}
        </button>
        <button
          className="support-button ghost full"
          onClick={() => navigate('/hub')}
          type="button"
        >
          {translate('subscriber.support.contact.submitted.home_cta')}
        </button>
      </div>
    </main>
  );
}

export function TicketsX31(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/support');

  return (
    <main aria-labelledby="x31-headline" className="support-screen" data-screen-id="X-31">
      <div className="support-body">
        <SupportBackHeader label={translate('subscriber.support.tickets.header')} onBack={goBack} />
        <h1 className="support-title" id="x31-headline">
          {translate('subscriber.support.tickets.title')}
        </h1>

        {SUPPORT_TICKETS.length > 0 ? (
          <div className="support-ticket-list">
            {SUPPORT_TICKETS.map((ticket) => (
              <TicketListItem
                key={ticket.id}
                onOpen={() => navigate(`/support/tickets/${ticket.id}`)}
                ticket={ticket}
              />
            ))}
          </div>
        ) : (
          <section className="support-card" aria-labelledby="x31-empty-title">
            <h2 className="support-card-title" id="x31-empty-title">
              {translate('subscriber.support.tickets.empty.title')}
            </h2>
            <p>{translate('subscriber.support.tickets.empty.body')}</p>
          </section>
        )}

        <div className="support-grow" />
        <button
          className="support-button primary full"
          onClick={() => navigate('/support/contact')}
          type="button"
        >
          {translate('subscriber.support.tickets.open_request.cta')}
        </button>
      </div>
    </main>
  );
}

export function TicketDetailX32(): ReactElement {
  const params = useParams();
  const goBack = useSafeBack('/support/tickets');
  const [reply, setReply] = useState('');
  const ticket = findSupportTicket(params.ticketId);

  if (ticket === undefined) {
    return (
      <main aria-labelledby="x32-missing-headline" className="support-screen" data-screen-id="X-32">
        <div className="support-body center">
          <SupportBackHeader
            label={translate('subscriber.support.tickets.header')}
            onBack={goBack}
          />
          <div className="support-grow" />
          <h1 className="support-title centered" id="x32-missing-headline">
            {translate('subscriber.support.ticket.detail.not_found.title')}
          </h1>
          <p className="support-copy centered">
            {translate('subscriber.support.ticket.detail.not_found.body')}
          </p>
          <div className="support-grow" />
          <button className="support-button primary full" onClick={goBack} type="button">
            {translate('subscriber.support.ticket.detail.not_found.cta')}
          </button>
        </div>
      </main>
    );
  }

  const statusText =
    ticket.status === 'open'
      ? translate('subscriber.support.ticket.detail.status.open').toUpperCase()
      : translate('subscriber.support.ticket.detail.status.resolved').toUpperCase();

  return (
    <main aria-labelledby="x32-headline" className="support-screen" data-screen-id="X-32">
      <div className="support-body">
        <SupportBackHeader
          label={translate('subscriber.support.ticket.detail.header', 'fr', {
            ticketId: ticket.id,
          })}
          onBack={goBack}
        />
        <span className={`support-status ${ticket.status}`}>{statusText}</span>
        <h1 className="support-title ticket" id="x32-headline">
          {ticket.title}
        </h1>

        <div className="support-thread">
          {ticket.messages.map((message) => (
            <article
              className={`support-message ${message.author}`}
              key={message.id}
              aria-label={message.author === 'subscriber' ? 'Message abonné' : 'Message bureau'}
            >
              <span className="support-eyebrow">
                {message.author === 'subscriber'
                  ? translate('subscriber.support.ticket.detail.user_label', 'fr', {
                      timeAgo: message.timeAgo,
                    })
                  : translate('subscriber.support.ticket.detail.office_label', 'fr', {
                      timeAgo: message.timeAgo,
                    })}
              </span>
              <p>{message.body}</p>
              {message.author === 'subscriber' && ticket.attachments !== undefined ? (
                <div className="support-attachment-row">
                  {ticket.attachments.map((attachment) => (
                    <div className={`support-attachment ${attachment.tone}`} key={attachment.id}>
                      {translate(attachment.labelKey).toUpperCase()}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="support-grow" />
        <div className="support-reply-row">
          <label className="support-sr" htmlFor="x32-reply">
            {translate('subscriber.support.ticket.detail.reply.label')}
          </label>
          <input
            className="support-input"
            id="x32-reply"
            onChange={(event) => setReply(event.target.value)}
            placeholder={translate('subscriber.support.ticket.detail.reply.placeholder')}
            value={reply}
          />
          <button
            className="support-button dark"
            disabled={reply.trim().length === 0}
            type="button"
          >
            {translate('subscriber.support.ticket.detail.reply.cta')}
          </button>
        </div>
      </div>
    </main>
  );
}

export function OfflineX33(): ReactElement {
  const navigate = useNavigate();
  const visit = SUPPORT_DEMO.nextVisit;

  return (
    <main aria-labelledby="x33-headline" className="support-screen" data-screen-id="X-33">
      <div className="support-body">
        <header className="support-topline">
          <span className="support-eyebrow">
            {translate('subscriber.system.offline.greeting', 'fr', {
              name: SUPPORT_DEMO.subscriberFirstName,
            })}
          </span>
          <span aria-hidden="true" className="support-avatar" />
        </header>

        <div className="support-ribbon">
          <span className="support-ribbon-dot" />
          {translate('subscriber.system.offline.status', 'fr', {
            time: SUPPORT_DEMO.offlineLastSync,
          }).toUpperCase()}
        </div>

        <section aria-labelledby="x33-next" className="support-offline-visit">
          <span className="support-eyebrow" id="x33-next">
            {translate('subscriber.system.offline.next_visit')}
          </span>
          <h1 className="support-offline-time" id="x33-headline">
            <em>{visit.weekday}</em>
            <strong>{visit.time}</strong>
          </h1>
        </section>

        <section className="support-worker-cache" aria-label="Laveuse en cache">
          <span aria-hidden="true" className="support-avatar" />
          <span>
            <strong>{visit.workerDisplayName}</strong>
            <small>{translate('subscriber.system.offline.worker_hidden')}</small>
          </span>
        </section>

        <div className="support-grow" />
        <p className="support-footnote">{translate('subscriber.system.offline.retry_hint')}</p>
        <button
          className="support-button ghost full"
          onClick={() => navigate('/hub')}
          type="button"
        >
          {translate('subscriber.system.offline.retry_cta')}
        </button>
      </div>
    </main>
  );
}

export function MaintenanceX34(): ReactElement {
  const visit = SUPPORT_DEMO.nextVisit;
  const [emergencyPrefix, emergencySuffix = ''] = translate(
    'subscriber.system.maintenance.emergency',
    'fr',
    {
      phone: '{phone}',
    },
  ).split('{phone}');

  return (
    <main aria-labelledby="x34-headline" className="support-screen" data-screen-id="X-34">
      <div className="support-body center">
        <div className="support-grow" />
        <div aria-hidden="true" className="support-system-icon warn">
          ⚙
        </div>
        <h1 className="support-title centered" id="x34-headline">
          {translate('subscriber.system.maintenance.title')}
        </h1>
        <p className="support-copy centered">
          {translate('subscriber.system.maintenance.body', 'fr', {
            minutes: SUPPORT_DEMO.maintenanceEtaMinutes,
          })}
        </p>
        <section className="support-card full" aria-labelledby="x34-next">
          <span className="support-eyebrow" id="x34-next">
            {translate('subscriber.system.maintenance.next_visit')}
          </span>
          <strong>
            {translate('subscriber.system.maintenance.next_visit_line', 'fr', {
              date: visit.date,
              time: visit.time,
              name: visit.workerName,
            })}
          </strong>
          <small>{translate('subscriber.system.maintenance.no_impact')}</small>
        </section>
        <div className="support-grow" />
        <p className="support-footnote">
          {emergencyPrefix}
          <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE_DISPLAY}</a>
          {emergencySuffix}
        </p>
      </div>
    </main>
  );
}

export function UpdateRequiredX35(): ReactElement {
  return (
    <main aria-labelledby="x35-headline" className="support-screen" data-screen-id="X-35">
      <div className="support-body center">
        <div className="support-grow" />
        <div aria-hidden="true" className="support-system-icon brand">
          w
        </div>
        <h1 className="support-title centered" id="x35-headline">
          <em>{translate('subscriber.system.update.title_prefix')}</em>{' '}
          {translate('subscriber.system.update.title_suffix')}
        </h1>
        <p className="support-copy centered">{translate('subscriber.system.update.body')}</p>
        <section className="support-card cream full" aria-labelledby="x35-news">
          <span className="support-eyebrow accent" id="x35-news">
            {translate('subscriber.system.update.whats_new')}
          </span>
          <ul className="support-news-list">
            <li>{translate('subscriber.system.update.item.reveal')}</li>
            <li>{translate('subscriber.system.update.item.tracking')}</li>
            <li>{translate('subscriber.system.update.item.security')}</li>
          </ul>
        </section>
        <div className="support-grow" />
        <a className="support-button primary full lg" href={UPDATE_REQUIRED_URL}>
          {translate('subscriber.system.update.cta')}
        </a>
      </div>
    </main>
  );
}

function TicketListItem({
  onOpen,
  ticket,
}: {
  readonly onOpen: () => void;
  readonly ticket: SupportTicketDemo;
}): ReactElement {
  const statusLabel =
    ticket.status === 'open'
      ? translate('subscriber.support.tickets.status.open', 'fr', { ticketId: ticket.id })
      : translate('subscriber.support.tickets.status.resolved', 'fr', { ticketId: ticket.id });

  return (
    <button className={`support-ticket-card ${ticket.status}`} onClick={onOpen} type="button">
      <span className="support-ticket-row">
        <span className="support-eyebrow accent-status">{statusLabel}</span>
        <small>{ticket.createdAgo}</small>
      </span>
      <strong>{ticket.title}</strong>
      <span>{ticket.summary}</span>
      {ticket.status === 'open' && ticket.agentName !== undefined ? (
        <em>
          {translate('subscriber.support.tickets.open.progress', 'fr', {
            agentName: ticket.agentName,
          })}
        </em>
      ) : null}
    </button>
  );
}

function SupportBackHeader({
  label,
  onBack,
}: {
  readonly label: string;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <div className="support-back-header">
      <button aria-label="Retour" className="support-back" onClick={onBack} type="button">
        ‹
      </button>
      <span>{label}</span>
    </div>
  );
}
