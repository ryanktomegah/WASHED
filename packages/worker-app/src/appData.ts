import type { VisitStep, WorkerFeedback } from './workerState.js';

export type PrimaryWorkerRoute = 'earnings' | 'planning' | 'profile' | 'today';
export type WorkerRoute = PrimaryWorkerRoute | 'activation' | 'daySummary' | 'inbox' | 'photoRetry';

export interface WorkerCopy {
  readonly action: {
    readonly advance: string;
    readonly cancel: string;
    readonly checkInNow: string;
    readonly close: string;
    readonly confirmSos: string;
    readonly declareNoShow: string;
    readonly heading: string;
    readonly requestErasure: string;
    readonly requestExport: string;
    readonly retrySync: string;
    readonly safetyReport: string;
    readonly submitIssue: string;
  };
  readonly activation: {
    readonly agreement: string;
    readonly complete: string;
    readonly payout: string;
    readonly serviceCells: string;
    readonly title: string;
  };
  readonly daySummary: {
    readonly complete: string;
    readonly title: string;
  };
  readonly earnings: {
    readonly advance: string;
    readonly bonus: string;
    readonly floor: string;
    readonly nextPayout: string;
    readonly title: string;
  };
  readonly feedback: Record<WorkerFeedback, string>;
  readonly inbox: {
    readonly advance: string;
    readonly payout: string;
    readonly route: string;
    readonly title: string;
  };
  readonly nav: Record<WorkerRoute, string>;
  readonly photoRetry: {
    readonly blur: string;
    readonly retake: string;
    readonly title: string;
  };
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
    checkInNow: "Pointer l'arrivée",
    close: 'Fermer',
    confirmSos: "Prévenir l'opérateur",
    declareNoShow: 'Déclarer absence foyer',
    heading: 'En route vers le foyer',
    requestErasure: "Demander l'effacement",
    requestExport: 'Exporter mes données',
    retrySync: 'Synchroniser maintenant',
    safetyReport: 'Signaler un problème',
    submitIssue: 'Envoyer le signalement',
  },
  activation: {
    agreement: 'Accord travailleuse',
    complete: "Terminer l'activation",
    payout: 'Mobile Money confirmé',
    serviceCells: 'Cellules de service confirmées',
    title: 'Activation du profil',
  },
  daySummary: {
    complete: 'Clôturer la journée',
    title: 'Résumé de fin de journée',
  },
  earnings: {
    advance: 'Avance disponible: 20 000 FCFA max',
    bonus: 'Bonus visites terminées: 3 500 FCFA',
    floor: 'Plancher mensuel garanti: 40 000 FCFA',
    nextPayout: 'Prochain paiement: 31 mai',
    title: 'Gains',
  },
  feedback: {
    activationCompleted: 'Profil activé pour les routes terrain.',
    advanceRequested: "Demande d'avance envoyée à l'opérateur.",
    afterPhotoQueued: 'Photo après ajoutée à la file hors ligne.',
    beforePhotoQueued: 'Photo avant ajoutée à la file hors ligne.',
    checkInQueued: "Pointage d'arrivée ajouté à la file hors ligne.",
    checkOutQueued: 'Pointage de sortie ajouté à la file hors ligne.',
    dayMarkedComplete: 'Résumé de fin de journée enregistré.',
    erasureRequested: "Demande d'effacement envoyée pour revue opérateur.",
    exportRequested: "Demande d'export des données enregistrée.",
    issueQueued: 'Signalement ajouté à la file hors ligne.',
    noShowQueued: 'Absence foyer déclarée et ajoutée à la file hors ligne.',
    sosSubmitted: "Alerte SOS envoyée à l'opérateur.",
    syncComplete: 'Toutes les actions locales sont synchronisées.',
    unavailableMarked: 'Indisponibilité envoyée à la planification.',
    visitInProgress: 'Visite marquée en cours.',
  },
  nav: {
    activation: 'Activation',
    daySummary: 'Résumé',
    earnings: 'Gains',
    inbox: 'Inbox',
    photoRetry: 'Photos',
    planning: 'Planning',
    profile: 'Profil',
    today: "Aujourd'hui",
  },
  inbox: {
    advance: "Demande d'avance reçue par l'opérateur",
    payout: 'Paiement mensuel prévu le 31 mai',
    route: 'Route de demain confirmée',
    title: 'Notifications',
  },
  photoRetry: {
    blur: 'La photo semble floue ou trop sombre. Reprendre avant de quitter le foyer.',
    retake: 'Reprendre la photo',
    title: 'Contrôle photo',
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
  'Activation',
  'Planning',
  'Gains',
  'Profil',
  'Inbox',
  'SOS',
  'Offline queue',
  'Advance request',
  'Day summary',
  'No-show',
  'Photo retry',
  'Privacy',
  'Agreement',
] as const;
