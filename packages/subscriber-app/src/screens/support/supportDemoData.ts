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

export interface SupportTicketMessageDemo {
  readonly id: string;
  readonly author: 'subscriber' | 'office';
  readonly timeAgo: string;
  readonly body: string;
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
  readonly createdAgo: string;
  readonly title: string;
  readonly summary: string;
  readonly agentName?: string;
  readonly messages: readonly SupportTicketMessageDemo[];
  readonly attachments?: readonly SupportTicketAttachmentDemo[];
}

export const SUPPORT_TICKETS: readonly SupportTicketDemo[] = [
  {
    id: '0421',
    status: 'open',
    createdAgo: 'il y a 12 min',
    title: 'Linge endommagé — pull rouge décoloré',
    summary: 'Le bureau examine la visite du 28 avril.',
    agentName: 'Ama M.',
    messages: [
      {
        id: 'subscriber-0421',
        author: 'subscriber',
        timeAgo: 'il y a 12 min',
        body: "Mon pull rouge a déteint sur deux chemises blanches. La laveuse n'a pas séparé les couleurs.",
      },
      {
        id: 'office-0421',
        author: 'office',
        timeAgo: 'il y a 4 min',
        body: 'Bonjour Yawa, on examine les photos avec Akouvi. Réponse sous 4 h. — Ama',
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
    createdAgo: 'il y a 12 jours',
    title: 'Changer de Mobile Money',
    summary: 'Mixx by Yas activé. Premier prélèvement le 1er mai.',
    messages: [
      {
        id: 'office-0388',
        author: 'office',
        timeAgo: 'il y a 12 jours',
        body: 'Mixx by Yas activé. Premier prélèvement le 1er mai.',
      },
    ],
  },
  {
    id: '0312',
    status: 'resolved',
    createdAgo: 'il y a 21 jours',
    title: 'Reporter visite — voyage',
    summary: 'Visite du 14 reportée au 21. Crédit appliqué.',
    messages: [
      {
        id: 'office-0312',
        author: 'office',
        timeAgo: 'il y a 21 jours',
        body: 'Visite du 14 reportée au 21. Crédit appliqué.',
      },
    ],
  },
];

export const SUPPORT_DEMO = {
  subscriberFirstName: 'Yawa',
  offlineLastSync: '9 H 38',
  nextVisit: {
    weekday: 'Mardi',
    date: 'Mardi 5 mai',
    time: '9 h 00',
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
