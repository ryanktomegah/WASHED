export type WorkerRoute = 'earnings' | 'planning' | 'profile' | 'today';
export type VisitStep =
  | 'afterPhoto'
  | 'beforePhoto'
  | 'checkIn'
  | 'checkOut'
  | 'heading'
  | 'inVisit';

export interface WorkerCopy {
  readonly action: {
    readonly advance: string;
    readonly cancel: string;
    readonly close: string;
    readonly confirmSos: string;
    readonly declareNoShow: string;
    readonly heading: string;
    readonly retrySync: string;
    readonly safetyReport: string;
    readonly submitIssue: string;
  };
  readonly earnings: {
    readonly advance: string;
    readonly bonus: string;
    readonly floor: string;
    readonly nextPayout: string;
    readonly title: string;
  };
  readonly nav: Record<WorkerRoute, string>;
  readonly planning: {
    readonly markUnavailable: string;
    readonly title: string;
    readonly week: string;
  };
  readonly profile: {
    readonly agreement: string;
    readonly help: string;
    readonly payout: string;
    readonly privacy: string;
    readonly title: string;
  };
  readonly safety: {
    readonly body: string;
    readonly panic: string;
    readonly title: string;
  };
  readonly sync: {
    readonly offline: string;
    readonly pending: string;
    readonly ready: string;
  };
  readonly today: {
    readonly addressHint: string;
    readonly dayComplete: string;
    readonly routeActive: string;
    readonly subscriber: string;
    readonly title: string;
    readonly visitCount: string;
  };
  readonly visitStep: Record<VisitStep, string>;
}

export const workerCopy = {
  action: {
    advance: 'Demander une avance',
    cancel: 'Annuler',
    close: 'Fermer',
    confirmSos: "Prévenir l'opérateur",
    declareNoShow: 'Déclarer absence foyer',
    heading: 'En route vers le foyer',
    retrySync: 'Synchroniser maintenant',
    safetyReport: 'Signaler un problème',
    submitIssue: 'Envoyer le signalement',
  },
  earnings: {
    advance: 'Avance disponible: 20 000 FCFA max',
    bonus: 'Bonus visites terminées: 3 500 FCFA',
    floor: 'Plancher mensuel garanti: 40 000 FCFA',
    nextPayout: 'Prochain paiement: 31 mai',
    title: 'Gains',
  },
  nav: {
    earnings: 'Gains',
    planning: 'Planning',
    profile: 'Profil',
    today: "Aujourd'hui",
  },
  planning: {
    markUnavailable: 'Marquer indisponible',
    title: 'Planning',
    week: 'Semaine du 4 mai',
  },
  profile: {
    agreement: 'Accord travailleuse accepté',
    help: 'Aide / FAQ',
    payout: 'Numéro Mobile Money confirmé',
    privacy: 'Confidentialité et export des données',
    title: 'Profil',
  },
  safety: {
    body: "Ce bouton alerte immédiatement l'opérateur, journalise l'incident, et peut suspendre la visite.",
    panic: 'SOS',
    title: 'Aide immédiate',
  },
  sync: {
    offline:
      "Mode hors ligne actif. Les photos, pointages et signalements restent en file d'attente.",
    pending: '3 actions en attente de synchronisation',
    ready: 'Synchronisation prête',
  },
  today: {
    addressHint: 'Repère: portail bleu, pharmacie à côté',
    dayComplete: 'Résumé de fin de journée',
    routeActive: 'Route active',
    subscriber: 'Ama K., Adidogomé',
    title: "Route d'aujourd'hui",
    visitCount: '3 visites planifiées',
  },
  visitStep: {
    afterPhoto: 'Photo après',
    beforePhoto: 'Photo avant',
    checkIn: 'Pointage arrivée',
    checkOut: 'Pointage sortie',
    heading: 'En route',
    inVisit: 'Visite en cours',
  },
} as const satisfies WorkerCopy;

export const visitSteps = [
  'heading',
  'checkIn',
  'beforePhoto',
  'inVisit',
  'afterPhoto',
  'checkOut',
] as const satisfies readonly VisitStep[];

export const routeCards = [
  {
    status: 'Prochaine',
    time: '9:00',
    title: workerCopy.today.subscriber,
  },
  {
    status: 'Prévue',
    time: '11:30',
    title: 'Esi A., Agoè',
  },
  {
    status: 'Prévue',
    time: '15:00',
    title: 'Mawuli B., Tokoin',
  },
] as const;

export const workerSurfaces = [
  "Aujourd'hui",
  'Planning',
  'Gains',
  'Profil',
  'SOS',
  'Offline queue',
  'Advance request',
  'Day summary',
  'No-show',
  'Photo retry',
  'Privacy',
  'Agreement',
] as const;
