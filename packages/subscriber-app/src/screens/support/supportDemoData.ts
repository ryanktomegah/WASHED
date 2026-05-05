export const SUPPORT_PHONE_DISPLAY = '90 00 00 00';
export const SUPPORT_PHONE_HREF = 'tel:+22890000000';
export const UPDATE_REQUIRED_URL = 'https://washed.app/update';

export type SupportCategoryId = 'visit' | 'plan' | 'payment' | 'worker' | 'other';

export interface SupportCategoryDemo {
  readonly id: SupportCategoryId;
  readonly labelKey:
    | 'subscriber.support.contact.category.visit'
    | 'subscriber.support.contact.category.plan'
    | 'subscriber.support.contact.category.payment'
    | 'subscriber.support.contact.category.worker'
    | 'subscriber.support.contact.category.other';
}

export const SUPPORT_CONTACT_CATEGORIES: readonly SupportCategoryDemo[] = [
  { id: 'visit', labelKey: 'subscriber.support.contact.category.visit' },
  { id: 'plan', labelKey: 'subscriber.support.contact.category.plan' },
  { id: 'payment', labelKey: 'subscriber.support.contact.category.payment' },
  { id: 'worker', labelKey: 'subscriber.support.contact.category.worker' },
  { id: 'other', labelKey: 'subscriber.support.contact.category.other' },
];

export type SupportFaqId = 'cancel' | 'missed' | 'payment' | 'damage' | 'worker';

export interface SupportFaqDemo {
  readonly id: SupportFaqId;
  readonly questionKey:
    | 'subscriber.support.help.faq.cancel.question'
    | 'subscriber.support.help.faq.missed.question'
    | 'subscriber.support.help.faq.payment.question'
    | 'subscriber.support.help.faq.damage.question'
    | 'subscriber.support.help.faq.worker.question';
  readonly answerKey:
    | 'subscriber.support.help.faq.cancel.answer'
    | 'subscriber.support.help.faq.missed.answer'
    | 'subscriber.support.help.faq.payment.answer'
    | 'subscriber.support.help.faq.damage.answer'
    | 'subscriber.support.help.faq.worker.answer';
}

export const SUPPORT_FAQS: readonly SupportFaqDemo[] = [
  {
    id: 'cancel',
    questionKey: 'subscriber.support.help.faq.cancel.question',
    answerKey: 'subscriber.support.help.faq.cancel.answer',
  },
  {
    id: 'missed',
    questionKey: 'subscriber.support.help.faq.missed.question',
    answerKey: 'subscriber.support.help.faq.missed.answer',
  },
  {
    id: 'payment',
    questionKey: 'subscriber.support.help.faq.payment.question',
    answerKey: 'subscriber.support.help.faq.payment.answer',
  },
  {
    id: 'damage',
    questionKey: 'subscriber.support.help.faq.damage.question',
    answerKey: 'subscriber.support.help.faq.damage.answer',
  },
  {
    id: 'worker',
    questionKey: 'subscriber.support.help.faq.worker.question',
    answerKey: 'subscriber.support.help.faq.worker.answer',
  },
];

export type SupportTicketStatus = 'open' | 'resolved';

export interface LocalizedTextDemo {
  readonly en: string;
  readonly fr: string;
}

export interface SupportTicketMessageDemo {
  readonly id: string;
  readonly author: 'subscriber' | 'office';
  readonly timeAgo: LocalizedTextDemo;
  readonly body: LocalizedTextDemo;
}

export interface SupportTicketAttachmentDemo {
  readonly id: string;
  readonly labelKey:
    | 'subscriber.support.ticket.detail.photo.pull'
    | 'subscriber.support.ticket.detail.photo.shirts';
  readonly tone: 'red' | 'cream';
}

export interface SupportTicketDemo {
  readonly id: string;
  readonly status: SupportTicketStatus;
  readonly createdAgo: LocalizedTextDemo;
  readonly title: LocalizedTextDemo;
  readonly summary: LocalizedTextDemo;
  readonly agentName?: string;
  readonly messages: readonly SupportTicketMessageDemo[];
  readonly attachments?: readonly SupportTicketAttachmentDemo[];
}

export const SUPPORT_TICKETS: readonly SupportTicketDemo[] = [
  {
    id: '0421',
    status: 'open',
    createdAgo: { en: '12 min ago', fr: 'il y a 12 min' },
    title: {
      en: 'Damaged laundry — red sweater bled',
      fr: 'Linge endommagé — pull rouge décoloré',
    },
    summary: {
      en: 'The office is reviewing the April 28 visit.',
      fr: 'Le bureau examine la visite du 28 avril.',
    },
    agentName: 'Ama M.',
    messages: [
      {
        id: 'subscriber-0421',
        author: 'subscriber',
        timeAgo: { en: '12 min ago', fr: 'il y a 12 min' },
        body: {
          en: "My red sweater bled onto two white shirts. The washerwoman didn't separate the colors.",
          fr: "Mon pull rouge a déteint sur deux chemises blanches. La laveuse n'a pas séparé les couleurs.",
        },
      },
      {
        id: 'office-0421',
        author: 'office',
        timeAgo: { en: '4 min ago', fr: 'il y a 4 min' },
        body: {
          en: "Hi Yawa, we're reviewing the photos with Akouvi. Reply within 4 h. — Ama",
          fr: 'Bonjour Yawa, on examine les photos avec Akouvi. Réponse sous 4 h. — Ama',
        },
      },
    ],
    attachments: [
      { id: 'pull', labelKey: 'subscriber.support.ticket.detail.photo.pull', tone: 'red' },
      { id: 'shirts', labelKey: 'subscriber.support.ticket.detail.photo.shirts', tone: 'cream' },
    ],
  },
  {
    id: '0388',
    status: 'resolved',
    createdAgo: { en: '12 days ago', fr: 'il y a 12 jours' },
    title: { en: 'Change Mobile Money', fr: 'Changer de Mobile Money' },
    summary: {
      en: 'Mixx by Yas activated. First charge on May 1.',
      fr: 'Mixx by Yas activé. Premier prélèvement le 1er mai.',
    },
    messages: [
      {
        id: 'office-0388',
        author: 'office',
        timeAgo: { en: '12 days ago', fr: 'il y a 12 jours' },
        body: {
          en: 'Mixx by Yas activated. First charge on May 1.',
          fr: 'Mixx by Yas activé. Premier prélèvement le 1er mai.',
        },
      },
    ],
  },
  {
    id: '0312',
    status: 'resolved',
    createdAgo: { en: '21 days ago', fr: 'il y a 21 jours' },
    title: { en: 'Reschedule visit — travel', fr: 'Reporter visite — voyage' },
    summary: {
      en: 'Visit on the 14th moved to the 21st. Credit applied.',
      fr: 'Visite du 14 reportée au 21. Crédit appliqué.',
    },
    messages: [
      {
        id: 'office-0312',
        author: 'office',
        timeAgo: { en: '21 days ago', fr: 'il y a 21 jours' },
        body: {
          en: 'Visit on the 14th moved to the 21st. Credit applied.',
          fr: 'Visite du 14 reportée au 21. Crédit appliqué.',
        },
      },
    ],
  },
];

export const SUPPORT_DEMO = {
  subscriberFirstName: 'Yawa',
  offlineLastSync: { en: '9:38 AM', fr: '9 H 38' },
  nextVisit: {
    weekday: { en: 'Tuesday', fr: 'Mardi' },
    date: { en: 'Tuesday, May 5', fr: 'Mardi 5 mai' },
    time: { en: '9:00 AM', fr: '9 h 00' },
    workerName: 'Akouvi',
    workerDisplayName: 'Akouvi K.',
  },
  maintenanceEtaMinutes: 8,
  submittedTicketId: '0422',
  issueTicketId: '0421',
} as const;

export function findSupportTicket(ticketId: string | undefined): SupportTicketDemo | undefined {
  if (ticketId === undefined) return undefined;
  return SUPPORT_TICKETS.find((ticket) => ticket.id === ticketId);
}

export function openSupportTicketCount(): number {
  return SUPPORT_TICKETS.filter((ticket) => ticket.status === 'open').length;
}
