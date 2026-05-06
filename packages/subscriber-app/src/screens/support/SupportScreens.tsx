import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { Check, ChevronLeft, ChevronRight, Phone, Settings } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import type { SupportContactDto, SupportContactStatus } from '@washed/api-client';
import { translate, type WashedLocale } from '@washed/i18n';
import { useActiveLocale } from '@washed/ui';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
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
  type LocalizedTextDemo,
  type SupportCategoryId,
  type SupportFaqId,
  type SupportTicketDemo,
} from './supportDemoData.js';

type SupportTicketViewStatus = SupportContactStatus;

interface SupportTicketMessageView {
  readonly author: 'office' | 'subscriber';
  readonly body: string;
  readonly id: string;
  readonly timeAgo: string;
}

interface SupportTicketView {
  readonly agentName?: string;
  readonly attachments?: SupportTicketDemo['attachments'];
  readonly createdAgo: string;
  readonly displayId: string;
  readonly id: string;
  readonly messages: readonly SupportTicketMessageView[];
  readonly status: SupportTicketViewStatus;
  readonly summary: string;
  readonly title: string;
}

function localized(value: LocalizedTextDemo, locale: WashedLocale): string {
  return value[locale];
}

function localeTag(locale: WashedLocale): string {
  return locale === 'fr' ? 'fr-TG' : 'en-US';
}

function displayTicketId(contactId: string): string {
  return contactId.replace(/-/gu, '').slice(0, 6).toUpperCase();
}

function formatRelativeCreatedAt(createdAt: string, locale: WashedLocale): string {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return '';

  const diffSeconds = Math.round((createdAtMs - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: 'auto' });

  if (absSeconds < 60) return formatter.format(diffSeconds, 'second');
  if (absSeconds < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (absSeconds < 86_400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  return formatter.format(Math.round(diffSeconds / 86_400), 'day');
}

function demoTicketView(ticket: SupportTicketDemo, locale: WashedLocale): SupportTicketView {
  return {
    ...(ticket.agentName === undefined ? {} : { agentName: ticket.agentName }),
    ...(ticket.attachments === undefined ? {} : { attachments: ticket.attachments }),
    createdAgo: localized(ticket.createdAgo, locale),
    displayId: ticket.id,
    id: ticket.id,
    messages: ticket.messages.map((message) => ({
      author: message.author,
      body: localized(message.body, locale),
      id: message.id,
      timeAgo: localized(message.timeAgo, locale),
    })),
    status: ticket.status,
    summary: localized(ticket.summary, locale),
    title: localized(ticket.title, locale),
  };
}

function supportContactView(contact: SupportContactDto, locale: WashedLocale): SupportTicketView {
  return {
    createdAgo: formatRelativeCreatedAt(contact.createdAt, locale),
    displayId: displayTicketId(contact.contactId),
    id: contact.contactId,
    messages: [
      {
        author: 'subscriber',
        body: contact.body,
        id: `${contact.contactId}-subscriber`,
        timeAgo: formatRelativeCreatedAt(contact.createdAt, locale),
      },
      ...(contact.resolutionNote === null
        ? []
        : [
            {
              author: 'office' as const,
              body: contact.resolutionNote,
              id: `${contact.contactId}-resolution`,
              timeAgo:
                contact.resolvedAt === null
                  ? ''
                  : formatRelativeCreatedAt(contact.resolvedAt, locale),
            },
          ]),
    ],
    status: contact.status,
    summary: contact.body,
    title: contact.subject,
  };
}

export function HelpCenterX29(): ReactElement {
  const navigate = useNavigate();
  const subscriberApi = useSubscriberApi();
  const [openFaqId, setOpenFaqId] = useState<SupportFaqId | null>(null);
  const [openCount, setOpenCount] = useState(
    subscriberApi.isConfigured ? 0 : openSupportTicketCount(),
  );

  useEffect(() => {
    if (!subscriberApi.isConfigured) return;

    let cancelled = false;
    void subscriberApi
      .listSupportContacts({ limit: 20, status: 'open' })
      .then((response) => {
        if (!cancelled) setOpenCount(response.items.length);
      })
      .catch(() => {
        if (!cancelled) setOpenCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [subscriberApi]);

  return (
    <main aria-labelledby="x29-headline" className="support-screen" data-screen-id="X-29">
      <div className="support-body">
        <span className="support-eyebrow">{translate('subscriber.support.help.eyebrow')}</span>
        <h1 className="support-title" id="x29-headline">
          {translate('subscriber.support.help.title')}
        </h1>

        <a className="support-call-card" href={SUPPORT_PHONE_HREF}>
          <span aria-hidden="true" className="support-call-icon">
            <Phone />
          </span>
          <span className="support-call-copy">
            <strong>{translate('subscriber.support.help.call.title')}</strong>
            <small>{translate('subscriber.support.help.call.detail')}</small>
          </span>
          <span aria-hidden="true" className="support-chevron">
            <ChevronRight />
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
          {translate('subscriber.support.help.tickets.cta', { openCount })}
        </button>
      </div>
    </main>
  );
}

export function ContactBureauX30(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/support');
  const subscriberApi = useSubscriberApi();
  const [selectedCategory, setSelectedCategory] = useState<SupportCategoryId>('visit');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const isValid = message.trim().length >= 3;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submitContact();
  };

  async function submitContact(): Promise<void> {
    if (!isValid || isSubmitting) return;

    if (!subscriberApi.isConfigured) {
      navigate('/support/contact/submitted');
      return;
    }

    setHasSubmissionError(false);
    setIsSubmitting(true);
    try {
      const category = SUPPORT_CONTACT_CATEGORIES.find((item) => item.id === selectedCategory);
      const contact = await subscriberApi.createSupportContact({
        body: message.trim(),
        category: selectedCategory,
        createdAt: new Date().toISOString(),
        subject: translate(category?.labelKey ?? 'subscriber.support.contact.category.other'),
      });
      navigate('/support/contact/submitted', {
        state: { ticketId: displayTicketId(contact.contactId) },
      });
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

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

        {hasSubmissionError ? (
          <section className="support-card" aria-labelledby="x30-error-title">
            <h2 className="support-card-title" id="x30-error-title">
              {translate('error.server.title')}
            </h2>
            <p>{translate('error.server.body')}</p>
          </section>
        ) : null}

        <div className="support-grow" />
        <button
          className="support-button primary full lg"
          disabled={!isValid || isSubmitting}
          type="submit"
        >
          {translate('subscriber.support.contact.submit.cta')}
        </button>
      </form>
    </main>
  );
}

export function ContactSubmittedX30S(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { readonly ticketId?: unknown } | null;
  const ticketId =
    typeof state?.ticketId === 'string' ? state.ticketId : SUPPORT_DEMO.submittedTicketId;

  return (
    <main aria-labelledby="x30s-headline" className="support-screen" data-screen-id="X-30.S">
      <div className="support-body center">
        <div className="support-grow" />
        <div aria-hidden="true" className="support-checkmark">
          <Check />
        </div>
        <h1 className="support-title centered" id="x30s-headline">
          {translate('subscriber.support.contact.submitted.title')}
        </h1>
        <p className="support-copy centered">
          {translate('subscriber.support.contact.submitted.body', { ticketId })}
        </p>
        <section
          className="support-card cream full"
          aria-label={translate('subscriber.support.contact.submitted.created_label')}
        >
          <span className="support-eyebrow accent">
            {translate('subscriber.support.contact.submitted.card_eyebrow', { ticketId })}
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
  const subscriberApi = useSubscriberApi();
  const locale = useActiveLocale();
  const [contacts, setContacts] = useState<readonly SupportContactDto[] | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    if (!subscriberApi.isConfigured) return;

    let cancelled = false;
    setHasLoadError(false);
    void subscriberApi
      .listSupportContacts({ limit: 20 })
      .then((response) => {
        if (!cancelled) setContacts(response.items);
      })
      .catch(() => {
        if (!cancelled) {
          setContacts([]);
          setHasLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subscriberApi]);

  const tickets = subscriberApi.isConfigured
    ? (contacts ?? []).map((contact) => supportContactView(contact, locale))
    : SUPPORT_TICKETS.map((ticket) => demoTicketView(ticket, locale));

  return (
    <main aria-labelledby="x31-headline" className="support-screen" data-screen-id="X-31">
      <div className="support-body">
        <SupportBackHeader label={translate('subscriber.support.tickets.header')} onBack={goBack} />
        <h1 className="support-title" id="x31-headline">
          {translate('subscriber.support.tickets.title')}
        </h1>

        {hasLoadError ? (
          <section className="support-card" aria-labelledby="x31-error-title">
            <h2 className="support-card-title" id="x31-error-title">
              {translate('error.server.title')}
            </h2>
            <p>{translate('error.server.body')}</p>
          </section>
        ) : tickets.length > 0 ? (
          <div className="support-ticket-list">
            {tickets.map((ticket) => (
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
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const [reply, setReply] = useState('');
  const [sentReplies, setSentReplies] = useState<readonly string[]>([]);
  const [contact, setContact] = useState<SupportContactDto | null>(null);
  const [hasLoadedContact, setHasLoadedContact] = useState(false);
  const canSendReply = reply.trim().length > 0;

  useEffect(() => {
    if (!subscriberApi.isConfigured) return;

    const ticketId = params.ticketId;
    if (ticketId === undefined) {
      setContact(null);
      setHasLoadedContact(true);
      return;
    }

    let cancelled = false;
    setHasLoadedContact(false);
    void subscriberApi
      .getSupportContact(ticketId)
      .then((response) => {
        if (!cancelled) {
          setContact(response);
          setHasLoadedContact(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContact(null);
          setHasLoadedContact(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.ticketId, subscriberApi]);

  const ticket = subscriberApi.isConfigured
    ? contact === null
      ? undefined
      : supportContactView(contact, locale)
    : (() => {
        const demoTicket = findSupportTicket(params.ticketId);
        return demoTicket === undefined ? undefined : demoTicketView(demoTicket, locale);
      })();
  const isMissing = subscriberApi.isConfigured
    ? hasLoadedContact && ticket === undefined
    : ticket === undefined;

  const onReplySubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedReply = reply.trim();
    if (trimmedReply.length === 0) return;

    setSentReplies((currentReplies) => [...currentReplies, trimmedReply]);
    setReply('');
  };

  if (isMissing) {
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

  if (ticket === undefined) {
    return <main className="support-screen" data-screen-id="X-32" />;
  }

  const statusText =
    ticket.status === 'open'
      ? translate('subscriber.support.ticket.detail.status.open').toUpperCase()
      : translate('subscriber.support.ticket.detail.status.resolved').toUpperCase();

  return (
    <main aria-labelledby="x32-headline" className="support-screen" data-screen-id="X-32">
      <div className="support-body">
        <SupportBackHeader
          label={translate('subscriber.support.ticket.detail.header', {
            ticketId: ticket.displayId,
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
              aria-label={
                message.author === 'subscriber'
                  ? translate('subscriber.support.ticket.detail.message_subscriber_label')
                  : translate('subscriber.support.ticket.detail.message_office_label')
              }
            >
              <span className="support-eyebrow">
                {message.author === 'subscriber'
                  ? translate('subscriber.support.ticket.detail.user_label', {
                      timeAgo: message.timeAgo,
                    })
                  : translate('subscriber.support.ticket.detail.office_label', {
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
          {sentReplies.map((sentReply, index) => (
            <article
              aria-label={translate('subscriber.support.ticket.detail.message_subscriber_label')}
              className="support-message subscriber"
              key={`sent-reply-${index}`}
            >
              <span className="support-eyebrow">
                {translate('subscriber.support.ticket.detail.user_label', {
                  timeAgo: translate('subscriber.support.ticket.detail.reply.just_now'),
                })}
              </span>
              <p>{sentReply}</p>
            </article>
          ))}
        </div>

        <div className="support-grow" />
        <form className="support-reply-row" onSubmit={onReplySubmit}>
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
          <button className="support-button dark" disabled={!canSendReply} type="submit">
            {translate('subscriber.support.ticket.detail.reply.cta')}
          </button>
        </form>
      </div>
    </main>
  );
}

export function OfflineX33(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const visit = SUPPORT_DEMO.nextVisit;

  return (
    <main aria-labelledby="x33-headline" className="support-screen" data-screen-id="X-33">
      <div className="support-body">
        <header className="support-topline">
          <span className="support-eyebrow">
            {translate('subscriber.system.offline.greeting', {
              name: SUPPORT_DEMO.subscriberFirstName,
            })}
          </span>
          <span aria-hidden="true" className="support-avatar" />
        </header>

        <div className="support-ribbon">
          <span className="support-ribbon-dot" />
          {translate('subscriber.system.offline.status', {
            time: localized(SUPPORT_DEMO.offlineLastSync, locale),
          }).toUpperCase()}
        </div>

        <section aria-labelledby="x33-next" className="support-offline-visit">
          <span className="support-eyebrow" id="x33-next">
            {translate('subscriber.system.offline.next_visit')}
          </span>
          <h1 className="support-offline-time" id="x33-headline">
            <em>{localized(visit.weekday, locale)}</em>
            <strong>{localized(visit.time, locale)}</strong>
          </h1>
        </section>

        <section
          className="support-worker-cache"
          aria-label={translate('subscriber.system.offline.worker_cache_label')}
        >
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
  const locale = useActiveLocale();
  const visit = SUPPORT_DEMO.nextVisit;
  const [emergencyPrefix, emergencySuffix = ''] = translate(
    'subscriber.system.maintenance.emergency',
    {
      phone: '{phone}',
    },
  ).split('{phone}');

  return (
    <main aria-labelledby="x34-headline" className="support-screen" data-screen-id="X-34">
      <div className="support-body center">
        <div className="support-grow" />
        <div aria-hidden="true" className="support-system-icon warn">
          <Settings />
        </div>
        <h1 className="support-title centered" id="x34-headline">
          {translate('subscriber.system.maintenance.title')}
        </h1>
        <p className="support-copy centered">
          {translate('subscriber.system.maintenance.body', {
            minutes: SUPPORT_DEMO.maintenanceEtaMinutes,
          })}
        </p>
        <section className="support-card full" aria-labelledby="x34-next">
          <span className="support-eyebrow" id="x34-next">
            {translate('subscriber.system.maintenance.next_visit')}
          </span>
          <strong>
            {translate('subscriber.system.maintenance.next_visit_line', {
              date: localized(visit.date, locale),
              time: localized(visit.time, locale),
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
  readonly ticket: SupportTicketView;
}): ReactElement {
  const statusLabel =
    ticket.status === 'open'
      ? translate('subscriber.support.tickets.status.open', { ticketId: ticket.displayId })
      : translate('subscriber.support.tickets.status.resolved', { ticketId: ticket.displayId });

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
          {translate('subscriber.support.tickets.open.progress', {
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
      <button
        aria-label={translate('common.action.back')}
        className="support-back"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span>{label}</span>
    </div>
  );
}
