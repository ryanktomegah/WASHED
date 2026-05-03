import type { WashedLocale } from '@washed/i18n';
import type { PaymentStatus, SubscriberFeedback, VisitStage } from './subscriberState.js';

export type PrimaryAppRoute = 'home' | 'profile' | 'subscription' | 'support';
export type SubscriberSheet =
  | 'accountDelete'
  | 'cancel'
  | 'dispute'
  | 'orderWash'
  | 'paymentRecovery'
  | 'privacyErasure'
  | 'privacyExport'
  | 'rating'
  | 'reschedule'
  | 'skip'
  | 'workerSwap';
export type SupportIssueKind =
  | 'damaged_item'
  | 'missed_visit'
  | 'other'
  | 'payment'
  | 'quality'
  | 'safety';
export type AppRoute =
  | PrimaryAppRoute
  | 'accountRecovery'
  | 'billing'
  | 'inbox'
  | 'legal'
  | 'onboarding'
  | 'paymentRecovery'
  | 'visit';

export interface LocalizedCopy {
  readonly action: {
    readonly close: string;
    readonly changeTier: string;
    readonly confirmArrival: string;
    readonly confirm: string;
    readonly openSupport: string;
    readonly orderWash: string;
    readonly recoverPayment: string;
    readonly reportIssue: string;
    readonly requestSwap: string;
    readonly reschedule: string;
    readonly skipVisit: string;
    readonly startTracking: string;
    readonly stopTracking: string;
  };
  readonly feedback: Record<SubscriberFeedback, string>;
  readonly home: {
    readonly assigned: string;
    readonly boundedTrackingBody: string;
    readonly boundedTrackingTitle: string;
    readonly greeting: string;
    readonly hero: string;
    readonly nextVisit: string;
    readonly price: string;
    readonly routeInventory: string;
    readonly setupNote: string;
    readonly surfaceCount: string;
    readonly visitControls: string;
    readonly washerConfirmed: string;
  };
  readonly nav: Record<AppRoute, string>;
  readonly paymentStatus: Record<PaymentStatus, string>;
  readonly sheet: Record<
    SubscriberSheet,
    {
      readonly body: string;
      readonly confirm: string;
      readonly title: string;
    }
  >;
  readonly onboarding: {
    readonly address: string;
    readonly confirm: string;
    readonly language: string;
    readonly otp: string;
    readonly payment: string;
    readonly phone: string;
    readonly schedule: string;
    readonly start: string;
    readonly tier: string;
    readonly title: string;
  };
  readonly profile: {
    readonly account: string;
    readonly deleteAccount: string;
    readonly erasure: string;
    readonly exportData: string;
    readonly legal: string;
    readonly maintenance: string;
    readonly privacy: string;
    readonly title: string;
  };
  readonly subscription: {
    readonly billing: string;
    readonly cancel: string;
    readonly history: string;
    readonly priceNote: string;
    readonly swapLimit: string;
    readonly tier: string;
    readonly title: string;
  };
  readonly support: {
    readonly dispute: string;
    readonly inbox: string;
    readonly issueKinds: Record<SupportIssueKind, string>;
    readonly messages: string;
    readonly notificationCenter: string;
    readonly title: string;
  };
  readonly surfaces: {
    readonly accountRecovery: {
      readonly body: string;
      readonly identity: string;
      readonly operatorReview: string;
      readonly title: string;
    };
    readonly billing: {
      readonly receipt: string;
      readonly refund: string;
      readonly supportCredit: string;
      readonly title: string;
    };
    readonly inbox: {
      readonly outage: string;
      readonly payment: string;
      readonly reminder: string;
      readonly title: string;
    };
    readonly legal: {
      readonly erasure: string;
      readonly export: string;
      readonly privacyPolicy: string;
      readonly terms: string;
      readonly title: string;
    };
    readonly paymentRecovery: {
      readonly body: string;
      readonly title: string;
    };
    readonly visit: {
      readonly access: string;
      readonly photos: string;
      readonly rating: string;
      readonly title: string;
    };
  };
  readonly visitStage: Record<VisitStage, string>;
}

export interface SurfaceGroup {
  readonly count: number;
  readonly label: string;
  readonly screens: readonly string[];
}

export const copy = {
  en: {
    action: {
      close: 'Close',
      changeTier: 'Change tier',
      confirm: 'Confirm',
      confirmArrival: 'Confirm arrival',
      openSupport: 'Open support',
      orderWash: 'Add a visit',
      recoverPayment: 'Recover payment',
      reportIssue: 'Report an issue',
      requestSwap: 'Request worker swap',
      reschedule: 'Reschedule',
      skipVisit: 'Skip visit',
      startTracking: 'Start en-route tracking',
      stopTracking: 'Stop tracking',
    },
    feedback: {
      accountDeleteRequested: 'Account deletion request queued for operator review.',
      cancelRequested: 'Cancellation request recorded. Support will confirm the final date.',
      dataErasureRequested: 'Erasure request queued for operator review.',
      dataExportRequested: 'Privacy export request queued.',
      issueSubmitted: 'Issue sent to Washed support with visit context.',
      orderRequested: 'Request sent. Washed will confirm the washerwoman and time window.',
      paymentRecovered: 'Payment recovery marked as completed.',
      rated: 'Thanks. Your rating was saved for this visit.',
      rescheduled: 'Visit marked for rescheduling.',
      skipUsed: 'Skip credit used for the next visit.',
      tierChanged: 'Tier change preview applied.',
      trackingArrived: 'Worker marked as arrived; tracking stopped.',
      trackingStarted: 'Bounded tracking started for this visit.',
      trackingStopped: 'Bounded tracking stopped.',
      visitInProgress: 'Visit marked in progress.',
      workerSwapRequested: 'Worker swap request queued for operator approval.',
    },
    home: {
      assigned: 'Assigned',
      boundedTrackingBody:
        'The map appears only after the worker taps Heading to subscriber and stops at check-in.',
      boundedTrackingTitle: 'Bounded tracking',
      greeting: 'Active subscription',
      hero: 'In-home laundry subscriptions for Lomé households, with support, billing, privacy, and visit controls prepared for production.',
      nextVisit: 'Next visit',
      price: 'Monthly price',
      routeInventory: 'Production route inventory',
      setupNote: 'Closed beta setup is ready if this household still needs onboarding.',
      surfaceCount: '35 surfaces',
      visitControls: 'Visit controls',
      washerConfirmed: 'Washerwoman confirmed',
    },
    nav: {
      accountRecovery: 'Recovery',
      billing: 'Billing',
      home: 'Home',
      inbox: 'Inbox',
      legal: 'Legal',
      onboarding: 'Start',
      paymentRecovery: 'Payment',
      profile: 'Profile',
      subscription: 'Plan',
      support: 'Support',
      visit: 'Visit',
    },
    paymentStatus: {
      current: 'current',
      overdue: 'overdue',
      recovered: 'recovered',
    },
    sheet: {
      accountDelete: {
        body: 'This queues an operator-reviewed account deletion request. Payment, audit, and safety records may be retained where required.',
        confirm: 'Request deletion',
        title: 'Delete account',
      },
      cancel: {
        body: 'Washed support will confirm the final service date before closing the subscription and preserving required billing/support history.',
        confirm: 'Request cancellation',
        title: 'Cancel subscription',
      },
      dispute: {
        body: 'Choose the closest issue type. Washed support receives the visit, worker, billing, and message context together.',
        confirm: 'Send issue',
        title: 'Report visit issue',
      },
      orderWash: {
        body: 'Washed checks availability, proposes a washerwoman, and confirms the time window before booking the extra visit.',
        confirm: 'Send request',
        title: 'Add a wash visit',
      },
      paymentRecovery: {
        body: 'Use the linked mobile-money wallet to settle the overdue month. One visit remains protected while recovery is attempted.',
        confirm: 'Mark payment recovered',
        title: 'Recover payment',
      },
      privacyErasure: {
        body: 'Washed will review what can be erased and what must remain for payment, audit, safety, and dispute obligations.',
        confirm: 'Request erasure',
        title: 'Request data erasure',
      },
      privacyExport: {
        body: 'Washed will prepare an export of your account, visits, payments, support records, and privacy-sensitive evidence.',
        confirm: 'Request export',
        title: 'Export your data',
      },
      rating: {
        body: 'Rate the completed visit. Low ratings can be followed by a support issue if you need Washed to intervene.',
        confirm: 'Save 5-star rating',
        title: 'Rate visit',
      },
      reschedule: {
        body: 'Move the next visit while keeping your regular household preference for future planning.',
        confirm: 'Confirm reschedule',
        title: 'Reschedule visit',
      },
      skip: {
        body: 'Use one skip credit for the next visit. Your normal schedule stays attached to the subscription.',
        confirm: 'Use skip credit',
        title: 'Skip next visit',
      },
      workerSwap: {
        body: 'Washed operations will review the reason, capacity, and visit history before changing the assigned washerwoman.',
        confirm: 'Request swap',
        title: 'Request worker swap',
      },
    },
    onboarding: {
      address: 'Home address',
      confirm: 'Confirmation',
      language: 'Language',
      otp: 'OTP',
      payment: 'Payment',
      phone: 'Phone',
      schedule: 'Schedule',
      start: 'Start setup',
      tier: 'Tier',
      title: 'Subscriber onboarding',
    },
    profile: {
      account: 'Account recovery',
      deleteAccount: 'Delete account',
      erasure: 'Request erasure',
      exportData: 'Export data',
      legal: 'Terms and privacy',
      maintenance: 'Maintenance and app update states',
      privacy: 'Privacy rights',
      title: 'Profile and privacy',
    },
    subscription: {
      billing: 'Billing history',
      cancel: 'Cancel subscription',
      history: 'Visit history',
      priceNote: 'Mobile-money recovery remains platform-controlled',
      swapLimit: '2 swaps left this quarter',
      tier: 'Tier 2 · 4,500 FCFA',
      title: 'Subscription controls',
    },
    support: {
      dispute: 'Open a visit dispute',
      inbox: 'Inbox',
      issueKinds: {
        damaged_item: 'Damaged or missing item',
        missed_visit: 'Missed visit',
        other: 'Something else',
        payment: 'Payment or receipt',
        quality: 'Wash quality',
        safety: 'Safety concern',
      },
      messages: 'Operator-mediated messages',
      notificationCenter: 'Notification center',
      title: 'Support',
    },
    surfaces: {
      accountRecovery: {
        body: 'Phone-only auth needs an operator-reviewed path when a household changes SIM or loses access.',
        identity: 'Identity checks',
        operatorReview: 'Operator review',
        title: 'Account recovery',
      },
      billing: {
        receipt: 'May receipt · 4,500 XOF · overdue',
        refund: 'Refund preview and support credit ledger',
        supportCredit: 'Support credits',
        title: 'Billing history',
      },
      inbox: {
        outage: 'Maintenance and required update notices stay here after the push disappears.',
        payment: 'Payment recovery reminder',
        reminder: 'Tuesday visit reminder',
        title: 'Inbox and notifications',
      },
      legal: {
        erasure: 'Three-step erasure request with operator review',
        export: 'Export request queued from profile',
        privacyPolicy: 'Privacy policy',
        terms: 'Terms of service',
        title: 'Terms and privacy',
      },
      paymentRecovery: {
        body: 'A failed mobile-money charge opens this screen before the next scheduled visit.',
        title: 'Payment recovery',
      },
      visit: {
        access: 'Landmark, access notes, and operator-visible watchlist status',
        photos: 'Before/after photos and visit proof',
        rating: 'Rating and dispute entry point',
        title: 'Visit detail',
      },
    },
    visitStage: {
      arrived: 'Arrived',
      enRoute: 'En route',
      inProgress: 'In progress',
      scheduled: 'Scheduled',
    },
  },
  fr: {
    action: {
      close: 'Fermer',
      changeTier: 'Changer la formule',
      confirm: 'Confirmer',
      confirmArrival: "Confirmer l'arrivée",
      openSupport: 'Contacter le support',
      orderWash: 'Ajouter une visite',
      recoverPayment: 'Régulariser le paiement',
      reportIssue: 'Signaler un problème',
      requestSwap: 'Demander un remplacement',
      reschedule: 'Reprogrammer',
      skipVisit: 'Sauter la visite',
      startTracking: 'Démarrer le suivi',
      stopTracking: 'Arrêter le suivi',
    },
    feedback: {
      accountDeleteRequested: 'Demande de suppression du compte mise en file pour revue opérateur.',
      cancelRequested: "Demande d'annulation enregistrée. Le support confirmera la date finale.",
      dataErasureRequested: "Demande d'effacement mise en file pour revue opérateur.",
      dataExportRequested: "Demande d'export confidentialité mise en file.",
      issueSubmitted: 'Signalement transmis au support Washed avec le contexte de visite.',
      orderRequested: 'Demande envoyée. Washed confirmera la laveuse et le créneau.',
      paymentRecovered: 'Paiement marqué comme régularisé.',
      rated: 'Merci. Votre note a été enregistrée pour cette visite.',
      rescheduled: 'Visite marquée pour reprogrammation.',
      skipUsed: 'Crédit de saut utilisé pour la prochaine visite.',
      tierChanged: 'Changement de formule prévisualisé.',
      trackingArrived: "Arrivée confirmée; le suivi s'arrête.",
      trackingStarted: 'Suivi encadré démarré pour cette visite.',
      trackingStopped: 'Suivi encadré arrêté.',
      visitInProgress: 'Visite marquée en cours.',
      workerSwapRequested: 'Demande de remplacement envoyée pour validation opérateur.',
    },
    home: {
      assigned: 'Attribuée',
      boundedTrackingBody:
        "La carte s'affiche uniquement quand la travailleuse appuie sur En route et s'arrête au pointage d'arrivée.",
      boundedTrackingTitle: 'Suivi encadré',
      greeting: 'Abonnement actif',
      hero: 'Abonnements de lessive à domicile pour les foyers de Lomé, avec support, paiement, confidentialité et contrôles de visite prêts pour la production.',
      nextVisit: 'Prochaine visite',
      price: 'Prix mensuel',
      routeInventory: 'Inventaire des écrans production',
      setupNote: "L'inscription beta reste disponible si ce foyer doit encore être activé.",
      surfaceCount: '35 surfaces',
      visitControls: 'Contrôles de visite',
      washerConfirmed: 'Washerwoman confirmée',
    },
    nav: {
      accountRecovery: 'Récupération',
      billing: 'Paiements',
      home: 'Accueil',
      inbox: 'Inbox',
      legal: 'Legal',
      onboarding: 'Départ',
      paymentRecovery: 'Paiement',
      profile: 'Profil',
      subscription: 'Abonnement',
      support: 'Support',
      visit: 'Visite',
    },
    paymentStatus: {
      current: 'à jour',
      overdue: 'en retard',
      recovered: 'régularisé',
    },
    sheet: {
      accountDelete: {
        body: "Cette demande sera revue par l'équipe Washed. Les données de paiement, audit et sécurité peuvent rester conservées si nécessaire.",
        confirm: 'Demander la suppression',
        title: 'Supprimer le compte',
      },
      cancel: {
        body: "Le support Washed confirme la date finale avant de fermer l'abonnement et de conserver l'historique obligatoire.",
        confirm: "Demander l'annulation",
        title: "Annuler l'abonnement",
      },
      dispute: {
        body: 'Choisissez le motif le plus proche. Le support reçoit la visite, la laveuse, le paiement et les messages au même endroit.',
        confirm: 'Envoyer le signalement',
        title: 'Signaler un problème de visite',
      },
      orderWash: {
        body: 'Washed vérifie la disponibilité, propose une laveuse et confirme le créneau avant de réserver la visite en plus.',
        confirm: 'Envoyer la demande',
        title: 'Ajouter une visite de lavage',
      },
      paymentRecovery: {
        body: 'Utilisez le wallet mobile money lié pour régulariser le mois en retard. Une visite reste protégée pendant la tentative.',
        confirm: 'Marquer comme régularisé',
        title: 'Régulariser le paiement',
      },
      privacyErasure: {
        body: 'Washed vérifiera ce qui peut être effacé et ce qui doit rester pour les obligations de paiement, audit, sécurité ou litige.',
        confirm: "Demander l'effacement",
        title: "Demander l'effacement",
      },
      privacyExport: {
        body: 'Washed préparera un export de votre compte, visites, paiements, support et preuves sensibles.',
        confirm: "Demander l'export",
        title: 'Exporter vos données',
      },
      rating: {
        body: 'Notez la visite terminée. Une note basse peut être suivie par un signalement si Washed doit intervenir.',
        confirm: 'Enregistrer 5 étoiles',
        title: 'Noter la visite',
      },
      reschedule: {
        body: 'Déplacez la prochaine visite sans changer la préférence habituelle utilisée pour la planification.',
        confirm: 'Confirmer le report',
        title: 'Reporter la visite',
      },
      skip: {
        body: "Utilisez un crédit de saut pour la prochaine visite. Le créneau habituel reste attaché à l'abonnement.",
        confirm: 'Utiliser le crédit',
        title: 'Sauter la prochaine visite',
      },
      workerSwap: {
        body: "L'équipe opérations vérifie le motif, la capacité et l'historique avant de changer la laveuse affectée.",
        confirm: 'Demander le remplacement',
        title: 'Changer de laveuse',
      },
    },
    onboarding: {
      address: 'Adresse du foyer',
      confirm: 'Confirmation',
      language: 'Langue',
      otp: 'OTP',
      payment: 'Paiement',
      phone: 'Téléphone',
      schedule: 'Créneau',
      start: "Démarrer l'inscription",
      tier: 'Formule',
      title: 'Inscription abonnée',
    },
    profile: {
      account: 'Récupération du compte',
      deleteAccount: 'Supprimer le compte',
      erasure: "Demander l'effacement",
      exportData: 'Exporter mes données',
      legal: 'Conditions et confidentialité',
      maintenance: 'Maintenance et mise à jour obligatoire',
      privacy: 'Droits de confidentialité',
      title: 'Profil et confidentialité',
    },
    subscription: {
      billing: 'Historique de paiement',
      cancel: "Annuler l'abonnement",
      history: 'Historique des visites',
      priceNote: 'Le recouvrement mobile money reste contrôlé par Washed',
      swapLimit: '2 remplacements restants ce trimestre',
      tier: 'Formule 2 · 4 500 FCFA',
      title: "Gestion de l'abonnement",
    },
    support: {
      dispute: 'Ouvrir une réclamation visite',
      inbox: 'Boîte de réception',
      issueKinds: {
        damaged_item: 'Article abîmé ou manquant',
        missed_visit: 'Visite manquée',
        other: 'Autre demande',
        payment: 'Paiement ou reçu',
        quality: 'Qualité du lavage',
        safety: 'Situation sensible',
      },
      messages: 'Messages relayés par opérateur',
      notificationCenter: 'Centre de notifications',
      title: 'Support',
    },
    surfaces: {
      accountRecovery: {
        body: "L'authentification par téléphone exige un parcours revu par opérateur quand un foyer change de SIM ou perd l'accès.",
        identity: "Contrôles d'identité",
        operatorReview: 'Revue opérateur',
        title: 'Récupération du compte',
      },
      billing: {
        receipt: 'Reçu de mai · 4 500 FCFA · en retard',
        refund: 'Prévisualisation remboursement et crédits support',
        supportCredit: 'Crédits support',
        title: 'Historique de paiement',
      },
      inbox: {
        outage:
          'Les avis de maintenance et de mise à jour obligatoire restent ici après la notification.',
        payment: 'Rappel de régularisation',
        reminder: 'Rappel visite mardi',
        title: 'Boîte de réception et notifications',
      },
      legal: {
        erasure: "Demande d'effacement en trois étapes avec revue opérateur",
        export: 'Export demandé depuis le profil',
        privacyPolicy: 'Politique de confidentialité',
        terms: "Conditions d'utilisation",
        title: 'Conditions et confidentialité',
      },
      paymentRecovery: {
        body: 'Un échec de paiement mobile money ouvre cet écran avant la prochaine visite planifiée.',
        title: 'Régularisation du paiement',
      },
      visit: {
        access: "Repère, consignes d'accès et statut de vigilance visible par opérateur",
        photos: 'Photos avant/après et preuve de visite',
        rating: 'Note et point d’entrée réclamation',
        title: 'Détail de visite',
      },
    },
    visitStage: {
      arrived: 'Arrivée',
      enRoute: 'En route',
      inProgress: 'En cours',
      scheduled: 'Planifiée',
    },
  },
} as const satisfies Record<WashedLocale, LocalizedCopy>;

export const onboardingSteps = [
  'language',
  'phone',
  'otp',
  'address',
  'tier',
  'schedule',
  'payment',
  'confirm',
] as const;

export const subscriberSurfaceGroups = [
  {
    count: 8,
    label: 'Core',
    screens: ['Splash', 'Phone', 'OTP', 'Address', 'Tier', 'Schedule', 'Payment', 'Confirm'],
  },
  {
    count: 9,
    label: 'Visit',
    screens: [
      'Home',
      'Visit detail',
      'En-route map',
      'Skip modal',
      'Reschedule modal',
      'Rating',
      'Visit history',
      'Dispute',
      'Messages',
    ],
  },
  {
    count: 9,
    label: 'Subscription',
    screens: [
      'Subscription',
      'Tier change',
      'Worker swap',
      'Billing history',
      'Payment recovery',
      'Cancel flow',
      'Receipts',
      'Support credits',
      'Notification priming',
    ],
  },
  {
    count: 9,
    label: 'Privacy',
    screens: [
      'Profile',
      'Terms',
      'Privacy policy',
      'Export request',
      'Erasure request',
      'Account deletion',
      'Change number',
      'Maintenance',
      'Help / FAQ',
    ],
  },
] as const satisfies readonly SurfaceGroup[];

export const visitTimeline: readonly VisitStage[] = [
  'scheduled',
  'enRoute',
  'arrived',
  'inProgress',
];
