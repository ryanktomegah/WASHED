const STORAGE_KEY = 'washed.ops-web.v1';
const app = document.querySelector('#app');
const VISIT_PHOTO_TYPES = ['before', 'after'];

const state = loadState();

const demoWorkers = [
  {
    displayName: 'Akouvi Koffi',
    maxActiveSubscriptions: 12,
    serviceNeighborhoods: ['Tokoin', 'Be Kpota', 'Bè Kpota'],
    workerId: '22222222-2222-4222-8222-222222222222',
  },
  {
    displayName: 'Dede Ametodji',
    maxActiveSubscriptions: 8,
    serviceNeighborhoods: ['Tokoin', 'Adidogome'],
    workerId: '33333333-3333-4333-8333-333333333333',
  },
  {
    displayName: 'Yawa Gbea',
    maxActiveSubscriptions: 6,
    serviceNeighborhoods: ['Agoe', 'Tokoin'],
    workerId: '44444444-4444-4444-8444-444444444444',
  },
];

render();

function loadState() {
  const defaults = {
    activeMode: 'ops',
    activeOps: 'matching',
    activeWorker: 'route',
    advanceRequests: [],
    auditEvents: [],
    auth: { operator: null, worker: null },
    betaMetrics: null,
    detail: null,
    disputes: [],
    earnings: null,
    flash: null,
    loading: false,
    onboardingCases: [],
    onboardingStageFilter: '',
    notifications: [],
    paymentAttempts: [],
    paymentProviderReadiness: null,
    paymentReconciliationRun: null,
    pendingPhotoUploads: [],
    pushDevices: [],
    pushProviderReadiness: null,
    queue: [],
    route: null,
    routeCacheStatus: 'empty',
    routeCachedAt: null,
    serviceCells: [],
    supportContext: null,
    supportMatches: [],
    supportPhoneQuery: '',
    supportSubscriptionId: '33333333-3333-4333-8333-333333333333',
    selectedDisputeId: null,
    selectedAdvanceRequestId: null,
    selectedOnboardingCaseId: null,
    selectedSubscriptionId: null,
    selectedSwapRequestId: null,
    selectedWorkerIssueId: null,
    swapRequests: [],
    swapDetail: null,
    visitPhotoDrafts: {},
    workerAuthPhone: '+22890000002',
    workerId: demoWorkers[0].workerId,
    workerIssues: [],
    workerOtpChallenge: null,
    workerProfile: null,
    workerPushDevice: null,
  };

  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      activeMode: state.activeMode,
      activeOps: state.activeOps,
      activeWorker: state.activeWorker,
      advanceRequests: state.advanceRequests,
      auditEvents: state.auditEvents,
      auth: state.auth,
      betaMetrics: state.betaMetrics,
      detail: state.detail,
      disputes: state.disputes,
      earnings: state.earnings,
      notifications: state.notifications,
      onboardingCases: state.onboardingCases,
      onboardingStageFilter: state.onboardingStageFilter,
      pendingPhotoUploads: state.pendingPhotoUploads,
      paymentAttempts: state.paymentAttempts,
      paymentProviderReadiness: state.paymentProviderReadiness,
      paymentReconciliationRun: state.paymentReconciliationRun,
      pushDevices: state.pushDevices,
      pushProviderReadiness: state.pushProviderReadiness,
      queue: state.queue,
      route: state.route,
      routeCacheStatus: state.routeCacheStatus,
      routeCachedAt: state.routeCachedAt,
      serviceCells: state.serviceCells,
      supportContext: state.supportContext,
      supportMatches: state.supportMatches,
      supportPhoneQuery: state.supportPhoneQuery,
      supportSubscriptionId: state.supportSubscriptionId,
      selectedDisputeId: state.selectedDisputeId,
      selectedAdvanceRequestId: state.selectedAdvanceRequestId,
      selectedOnboardingCaseId: state.selectedOnboardingCaseId,
      selectedSubscriptionId: state.selectedSubscriptionId,
      selectedSwapRequestId: state.selectedSwapRequestId,
      selectedWorkerIssueId: state.selectedWorkerIssueId,
      swapRequests: state.swapRequests,
      swapDetail: state.swapDetail,
      visitPhotoDrafts: state.visitPhotoDrafts,
      workerAuthPhone: state.workerAuthPhone,
      workerId: state.workerId,
      workerIssues: state.workerIssues,
      workerOtpChallenge: state.workerOtpChallenge,
      workerProfile: state.workerProfile,
      workerPushDevice: state.workerPushDevice,
    }),
  );
}

function setState(patch) {
  Object.assign(state, patch);
  saveState();
  render();
}

function render() {
  app.innerHTML = `
    <section class="canvas">
      <header class="top">
        <h1>Washed Worker & Ops</h1>
        <span>Interfaces from the Claude wireframes, connected to Core API where available.</span>
        <span class="spacer"></span>
        <div class="segmented">
          <button class="${state.activeMode === 'worker' ? 'on' : ''}" data-mode="worker">Worker app</button>
          <button class="${state.activeMode === 'ops' ? 'on' : ''}" data-mode="ops">Ops console</button>
        </div>
      </header>
      ${state.activeMode === 'worker' ? renderWorkerMode() : renderOpsMode()}
    </section>
  `;
  bindCommon();
  if (state.activeMode === 'worker') bindWorker();
  if (state.activeMode === 'ops') bindOps();
}

window.addEventListener('online', () => {
  if (state.activeMode === 'worker') refreshWorker().catch(() => {});
  syncPendingPhotoUploads().catch(() => {});
  navigator.serviceWorker?.controller?.postMessage({ type: 'washed.syncPhotos' });
});
window.addEventListener('focus', () => {
  syncPendingPhotoUploads().catch(() => {});
});
setInterval(() => {
  if (state.pendingPhotoUploads.length > 0) {
    syncPendingPhotoUploads().catch(() => {});
  }
}, 30000);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'washed.syncPhotos') {
      syncPendingPhotoUploads().catch(() => {});
    }
  });
}

function bindCommon() {
  app.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => setState({ activeMode: button.dataset.mode }));
  });
}

function renderWorkerMode() {
  return `
    <section class="grid">
      ${renderWorkerPhone()}
      <div class="browser">
        <div class="chrome">${dots()}<div class="addressbar">worker.washed.local</div></div>
        <div class="content">
          <div class="topbar">
            <strong>Worker controls</strong>
            ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
            <span style="flex:1"></span>
            <button class="btn secondary" id="seed-demo">Seed dispatch demo</button>
            <button class="btn" id="refresh-worker">Refresh route</button>
            <button class="btn red" id="mark-unavailable">Mark unavailable</button>
          </div>
          <div class="detail">
            <div class="kpis">
              <div class="kpi"><span>Visits</span><strong>${state.route?.visits?.length ?? 0}</strong></div>
              <div class="kpi"><span>Completed</span><strong>${state.earnings?.completedVisits ?? 0}</strong></div>
              <div class="kpi"><span>Floor</span><strong>40k</strong></div>
              <div class="kpi"><span>Total</span><strong>${compactMoney(state.earnings?.total?.amountMinor ?? '40000')}</strong></div>
              <div class="kpi"><span>Photos</span><strong>${state.pendingPhotoUploads.length}</strong></div>
            </div>
            <div class="card">
              <h3 style="margin-top:0">Worker route API</h3>
              <p style="color:var(--muted);line-height:1.55">This panel uses <code>GET /v1/workers/:workerId/route</code>, check-in/check-out endpoints, and earnings once a worker has been assigned from the operator console.</p>
              <pre style="white-space:pre-wrap;background:var(--bg);border-radius:12px;padding:12px;overflow:auto">${escapeHtml(JSON.stringify(state.route ?? { message: 'No route loaded yet.' }, null, 2))}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderWorkerPhone() {
  if (state.activeWorker === 'earnings') return renderWorkerEarningsPhone();
  if (state.activeWorker === 'profile') return renderWorkerProfilePhone();

  const visits = state.route?.visits ?? [];
  const first = visits[0];
  const cachedLabel =
    state.routeCacheStatus === 'stale'
      ? `Derniere synchro ${state.routeCachedAt ? new Date(state.routeCachedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'inconnue'}`
      : 'Cache offline actif';
  return `
    <div class="phone">
      <section class="phone-screen">
        <div class="statusbar"><span>9:41</span><span>82%</span></div>
        <div class="worker-header">
          <small>${new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' }).toUpperCase()}</small>
          <div class="row between">
            <h2>${visits.length || 0} visites aujourd'hui</h2>
            <div style="text-align:right"><small>Ce mois</small><br><strong>${money(state.earnings?.total?.amountMinor ?? '40000')}</strong></div>
          </div>
          <span class="pill" style="background:rgb(255 255 255 / 14%);color:var(--green-light)">${escapeHtml(cachedLabel)}</span>
        </div>
        <div class="scroll pad">
          ${
            state.routeCacheStatus === 'stale'
              ? `<div class="card" style="border:1.5px solid var(--amber);background:#fff8e6"><strong>Mode hors ligne</strong><p style="color:var(--muted);line-height:1.5;margin:6px 0 0">La route affiche les dernieres donnees chargees. Les photos et actions seront synchronisees au retour du reseau.</p></div>`
              : ''
          }
          ${
            visits.length
              ? visits.map((visit, index) => workerVisitCard(visit, index)).join('')
              : `<div class="card"><strong>Aucune route chargee</strong><p style="color:var(--muted);line-height:1.5">Seed the dispatch demo from the console, then refresh this route.</p></div>`
          }
          <div class="card" style="border:1.5px dashed var(--green);background:var(--green-bg)">
            <strong>Salaire · ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
            <div class="row between" style="margin-top:10px"><span>Fixe garanti</span><strong>40 000 XOF</strong></div>
            <div class="row between"><span>Prime visites</span><strong>${money(state.earnings?.visitBonusTotal?.amountMinor ?? '0')}</strong></div>
            <div class="row between"><span>Deja verse</span><strong>${money(state.earnings?.paidOutTotal?.amountMinor ?? '0')}</strong></div>
            <div class="row between"><span>Reste a payer</span><strong>${money(state.earnings?.netDue?.amountMinor ?? state.earnings?.total?.amountMinor ?? '40000')}</strong></div>
            ${
              state.earnings?.payoutHistory?.length
                ? `<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:8px">${state.earnings.payoutHistory
                    .map(
                      (payout) =>
                        `<p style="margin:4px 0;color:${payout.status === 'failed' ? 'var(--danger)' : 'var(--muted)'}">${escapeHtml(payoutLabel(payout.payoutType))} · ${money(payout.amount.amountMinor)} · ${escapeHtml(payout.status)} · ${new Date(payout.paidAt).toLocaleDateString('fr-FR')}${payout.failureReason ? ` · ${escapeHtml(payout.failureReason)}` : ''}</p>`,
                    )
                    .join('')}</div>`
                : ''
            }
            <button class="btn" id="request-advance" style="width:100%;margin-top:12px">Demander 20 000 XOF</button>
          </div>
        </div>
        ${workerTabbar()}
      </section>
    </div>
  `;
}

function renderWorkerEarningsPhone() {
  const earnings = state.earnings;
  const payouts = earnings?.payoutHistory ?? [];
  const paidCount = payouts.filter((payout) => payout.status === 'paid').length;
  const failedCount = payouts.filter((payout) => payout.status === 'failed').length;
  return `
    <div class="phone">
      <section class="phone-screen">
        <div class="statusbar"><span>9:41</span><span>82%</span></div>
        <div class="worker-header">
          <small>${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}</small>
          <div class="row between">
            <h2>Gains</h2>
            <div style="text-align:right"><small>Reste</small><br><strong>${money(earnings?.netDue?.amountMinor ?? earnings?.total?.amountMinor ?? '40000')}</strong></div>
          </div>
          <span class="pill" style="background:rgb(255 255 255 / 14%);color:var(--green-light)">${earnings?.completedVisits ?? 0} visite(s) terminee(s)</span>
        </div>
        <div class="scroll pad">
          <div class="card" style="border:1.5px solid var(--green);background:var(--green-bg)">
            <strong>Total mensuel</strong>
            <h2 style="margin:8px 0 2px">${money(earnings?.total?.amountMinor ?? '40000')}</h2>
            <p style="color:var(--muted);margin:0">Fixe garanti + primes de visites terminees</p>
            <div class="row between" style="margin-top:12px"><span>Fixe garanti</span><strong>${money(earnings?.floor?.amountMinor ?? '40000')}</strong></div>
            <div class="row between"><span>Prime visites</span><strong>${money(earnings?.visitBonusTotal?.amountMinor ?? '0')}</strong></div>
            <div class="row between"><span>Deja verse</span><strong>${money(earnings?.paidOutTotal?.amountMinor ?? '0')}</strong></div>
            <div class="row between"><span>Reste a payer</span><strong>${money(earnings?.netDue?.amountMinor ?? earnings?.total?.amountMinor ?? '40000')}</strong></div>
          </div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="kpi"><span>Payes</span><strong>${paidCount}</strong></div>
            <div class="kpi"><span>Echecs</span><strong>${failedCount}</strong></div>
          </div>
          <div class="card">
            <div class="row between"><strong>Historique versements</strong><span class="pill muted">${payouts.length}</span></div>
            ${
              payouts.length
                ? payouts
                    .map(
                      (payout) => `
                        <div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px">
                          <div class="row between">
                            <div>
                              <strong>${escapeHtml(payoutLabel(payout.payoutType))}</strong><br>
                              <span style="color:var(--muted)">${new Date(payout.paidAt).toLocaleDateString('fr-FR')} · ${escapeHtml(payout.provider)}</span>
                            </div>
                            <div style="text-align:right">
                              <strong>${money(payout.amount.amountMinor)}</strong><br>
                              <span class="pill ${payout.status === 'failed' ? 'red' : ''}">${escapeHtml(payout.status)}</span>
                            </div>
                          </div>
                          ${payout.failureReason ? `<p style="color:var(--danger);margin:8px 0 0">${escapeHtml(payout.failureReason)}</p>` : ''}
                        </div>
                      `,
                    )
                    .join('')
                : `<p style="color:var(--muted);line-height:1.5">Aucun versement enregistre pour ce mois.</p>`
            }
          </div>
          <button class="btn" id="request-advance" style="width:100%">Demander 20 000 XOF</button>
        </div>
        ${workerTabbar()}
      </section>
    </div>
  `;
}

function renderWorkerProfilePhone() {
  const fallbackWorker = demoWorkers.find((worker) => worker.workerId === state.workerId);
  const profile = state.workerProfile ??
    fallbackWorker ?? {
      displayName: 'Worker',
      maxActiveSubscriptions: 0,
      serviceNeighborhoods: [],
      status: 'unknown',
      workerId: state.workerId,
    };
  const initials = profile.displayName
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const workerAuth = state.auth?.worker;
  return `
    <div class="phone">
      <section class="phone-screen">
        <div class="statusbar"><span>9:41</span><span>82%</span></div>
        <div class="worker-header">
          <small>PROFIL</small>
          <div class="row between">
            <h2>${escapeHtml(profile.displayName)}</h2>
            <div class="avatar">${escapeHtml(initials || 'W')}</div>
          </div>
          <span class="pill" style="background:rgb(255 255 255 / 14%);color:var(--green-light)">${workerAuth ? 'Connecte' : 'Session locale'} · ${escapeHtml(profile.status)}</span>
        </div>
        <div class="scroll pad">
          <div class="card">
            <strong>Connexion</strong>
            ${
              workerAuth
                ? `<p style="color:var(--muted);line-height:1.5">Telephone ${escapeHtml(state.workerAuthPhone)} · session worker active.</p>
                   <p style="color:var(--muted);line-height:1.5">Push: ${state.workerPushDevice ? `${escapeHtml(state.workerPushDevice.platform)} ${escapeHtml(state.workerPushDevice.environment)}` : 'non enregistre'}</p>
                   <button class="btn secondary" id="worker-register-push" style="width:100%">Enregistrer simulateur push</button>`
                : `<input id="worker-login-phone" value="${escapeHtml(state.workerAuthPhone)}" placeholder="+228..." autocomplete="tel" />
                   ${
                     state.workerOtpChallenge
                       ? `<input id="worker-login-code" inputmode="numeric" maxlength="6" value="${escapeHtml(state.workerOtpChallenge.testCode ?? '')}" style="margin-top:8px" />`
                       : ''
                   }
                   <button class="btn" id="${state.workerOtpChallenge ? 'worker-verify-login' : 'worker-start-login'}" style="width:100%;margin-top:10px">${state.workerOtpChallenge ? 'Verifier OTP' : 'Recevoir OTP'}</button>`
            }
          </div>
          <div class="card">
            <strong>Zone de service</strong>
            <p style="color:var(--muted);line-height:1.5">${profile.serviceNeighborhoods.length ? escapeHtml(profile.serviceNeighborhoods.join(' · ')) : 'Aucune zone chargee'}</p>
            <div class="row between"><span>Capacite max</span><strong>${profile.maxActiveSubscriptions}</strong></div>
          </div>
          <div class="card">
            <strong>Performance</strong>
            <div class="row between" style="margin-top:10px"><span>Visites terminees</span><strong>${state.earnings?.completedVisits ?? 0}</strong></div>
            <div class="row between"><span>Issues ouvertes</span><strong>${(state.workerIssues ?? []).filter((issue) => issue.status !== 'resolved').length}</strong></div>
            <div class="row between"><span>Worker ID</span><strong>${escapeHtml(profile.workerId.slice(0, 8))}</strong></div>
          </div>
          <div class="card">
            <strong>Messages operations</strong>
            ${workerIssueThread()}
          </div>
        </div>
        ${workerTabbar()}
      </section>
    </div>
  `;
}

function workerVisitCard(visit, index) {
  const active = index === 0 && visit.status !== 'completed';
  const photoControls = VISIT_PHOTO_TYPES.map((photoType) => {
    const draft = getVisitPhotoDraft(visit.visitId, photoType);
    const queued = state.pendingPhotoUploads.some(
      (photo) => photo.visitId === visit.visitId && photo.photoType === photoType,
    );
    const label = photoType === 'before' ? 'Avant' : 'Apres';
    const status = queued
      ? 'en attente'
      : draft
        ? `${Math.round(draft.byteSize / 1000)} KB`
        : 'a prendre';
    return `<button class="photo-capture ${draft ? 'ready' : ''} ${queued ? 'queued' : ''}" data-capture-photo="${visit.visitId}" data-photo-type="${photoType}" aria-label="Photo ${label.toLowerCase()} pour ${escapeHtml(visit.subscriberPhoneNumber)}">
      <span>${label}</span><strong>${status}</strong>
    </button>`;
  }).join('');
  return `
    <div class="card" style="border:2px solid ${active ? 'var(--green)' : 'var(--border)'};padding:0;overflow:hidden">
      <div style="padding:12px 14px">
        <div class="row between"><strong>${escapeHtml(visit.subscriberPhoneNumber)}</strong><span class="pill ${visit.status === 'completed' ? '' : 'amber'}">${escapeHtml(visit.status)}</span></div>
        <p style="color:var(--muted);margin:6px 0 0">📍 ${escapeHtml(visit.address.neighborhood)} · ${escapeHtml(visit.address.landmark)}</p>
        <p style="color:var(--muted);margin:3px 0 0">🕐 ${escapeHtml(visit.scheduledTimeWindow)} · ${escapeHtml(visit.scheduledDate)}</p>
        ${active ? `<div class="photo-grid">${photoControls}</div>` : ''}
      </div>
      ${
        active
          ? `<div class="row" style="padding:10px 14px;background:var(--green)">
              <button class="btn" style="background:var(--green-light);color:var(--green);flex:1" data-checkin="${visit.visitId}">Check-in</button>
              <button class="btn secondary" style="flex:1" data-checkout="${visit.visitId}">Check-out</button>
              <button class="btn red" style="flex:1" data-worker-issue="${visit.visitId}">Issue</button>
            </div>`
          : ''
      }
    </div>
  `;
}

function workerTabbar() {
  const tabs = [
    ['route', '🗓', "Auj'hui"],
    ['schedule', '📅', 'Planning'],
    ['earnings', '💰', 'Gains'],
    ['profile', '👤', 'Profil'],
  ];
  return `<nav class="worker-tabbar" aria-label="Navigation worker">${tabs.map(([key, icon, label]) => `<button class="${state.activeWorker === key ? 'on' : ''}" data-worker-tab="${key}" aria-label="${escapeHtml(label)}" aria-current="${state.activeWorker === key ? 'page' : 'false'}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav>`;
}

function bindWorker() {
  app.querySelector('#seed-demo')?.addEventListener('click', seedDemo);
  app.querySelector('#refresh-worker')?.addEventListener('click', refreshWorker);
  app.querySelector('#mark-unavailable')?.addEventListener('click', markWorkerUnavailable);
  app.querySelectorAll('[data-worker-tab]').forEach((button) => {
    button.addEventListener('click', () => setState({ activeWorker: button.dataset.workerTab }));
  });
  app.querySelectorAll('[data-checkin]').forEach((button) => {
    button.addEventListener('click', () => checkIn(button.dataset.checkin));
  });
  app.querySelectorAll('[data-capture-photo]').forEach((button) => {
    button.addEventListener('click', () =>
      captureVisitPhoto(button.dataset.capturePhoto, button.dataset.photoType),
    );
  });
  app.querySelectorAll('[data-checkout]').forEach((button) => {
    button.addEventListener('click', () => checkOut(button.dataset.checkout));
  });
  app.querySelectorAll('[data-worker-issue]').forEach((button) => {
    button.addEventListener('click', () => reportWorkerIssue(button.dataset.workerIssue));
  });
  app.querySelector('#request-advance')?.addEventListener('click', requestWorkerAdvance);
  app.querySelector('#worker-start-login')?.addEventListener('click', workerStartLogin);
  app.querySelector('#worker-verify-login')?.addEventListener('click', workerVerifyLogin);
  app
    .querySelector('#worker-register-push')
    ?.addEventListener('click', registerWorkerPushSimulator);
}

function renderOpsMode() {
  return `
    <section class="browser">
      <div class="chrome">${dots()}<div class="addressbar">console.washed.local</div></div>
      <div class="ops-body">
        ${sidebar()}
        ${renderOpsPanel()}
      </div>
    </section>
  `;
}

function renderOpsPanel() {
  if (state.activeOps === 'metrics') return renderBetaMetrics();
  if (state.activeOps === 'matching') return renderMatching();
  if (state.activeOps === 'live') return renderLiveOps();
  if (state.activeOps === 'swaps') return renderSwaps();
  if (state.activeOps === 'advances') return renderAdvances();
  if (state.activeOps === 'onboarding') return renderOnboarding();
  if (state.activeOps === 'notifications') return renderNotifications();
  if (state.activeOps === 'payments') return renderPayments();
  if (state.activeOps === 'support') return renderSupport();
  if (state.activeOps === 'audit') return renderAuditEvents();
  return renderDisputes();
}

function sidebar() {
  const items = [
    ['metrics', '▦', 'Beta'],
    ['matching', '📋', 'Attribution'],
    ['live', '🗺', 'Live ops'],
    ['swaps', '⇄', 'Swaps'],
    ['advances', '💸', 'Avances'],
    ['onboarding', '🪪', 'Onboarding'],
    ['notifications', '✉', 'Notifications'],
    ['payments', '₣', 'Paiements'],
    ['support', '☎', 'Support'],
    ['audit', '◇', 'Audit'],
    ['disputes', '⚖', 'Litiges'],
  ];
  return `
    <aside class="sidebar">
      <div class="brand"><strong>Washed</strong><br><span>Console Operateur · Lome</span></div>
      ${items.map(([key, icon, label]) => `<button class="navitem ${state.activeOps === key ? 'on' : ''}" data-ops="${key}">${icon}<span>${label}</span></button>`).join('')}
      <div style="flex:1"></div>
      <div style="padding:12px 16px;border-top:1px solid rgb(255 255 255 / 8%)"><small>Mode dispatch</small><br><strong style="color:var(--amber)">Manuel + score</strong></div>
    </aside>
  `;
}

function renderMatching() {
  const queue = state.queue ?? [];
  const detail = state.detail;
  return `
    <section class="content">
      <div class="topbar">
        <strong>File d'attribution</strong>
        <span class="pill amber">${queue.length} en attente</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn secondary" id="seed-demo">Seed demo</button>
        <button class="btn" id="refresh-queue">Actualiser</button>
      </div>
      <div class="columns">
        <div class="list">
          ${
            queue.length
              ? queue.map((item) => queueItem(item)).join('')
              : `<div class="card"><strong>Aucune demande</strong><p style="color:var(--muted)">Seed the demo or create a subscriber in the subscriber app.</p></div>`
          }
        </div>
        <div class="detail">
          ${detail ? matchingDetail(detail) : `<div class="card"><strong>Selectionnez une demande</strong><p style="color:var(--muted)">Candidate scores will appear here.</p></div>`}
        </div>
      </div>
    </section>
  `;
}

function renderBetaMetrics() {
  const metrics = state.betaMetrics;
  return `
    <section>
      <div class="toolbar">
        <div>
          <h2>Closed beta metrics</h2>
          <p>Operational proof points for the 30 subscriber / 10 worker beta.</p>
        </div>
        <button class="btn" id="refresh-beta-metrics">Actualiser</button>
      </div>
      ${
        metrics
          ? `
            <div class="kpis">
              <div class="kpi"><span>Subscribers</span><strong>${metrics.subscribers.total}</strong></div>
              <div class="kpi"><span>Completion</span><strong>${percent(metrics.visits.completionRate)}</strong></div>
              <div class="kpi"><span>Avg duration</span><strong>${metrics.visits.averageDurationMinutes ?? '—'}m</strong></div>
              <div class="kpi"><span>No-shows</span><strong>${metrics.visits.noShow}</strong></div>
              <div class="kpi"><span>Payment success</span><strong>${percent(metrics.payments.successRate)}</strong></div>
              <div class="kpi"><span>Refunds</span><strong>${money(metrics.refunds.totalAmountMinor)}</strong></div>
              <div class="kpi"><span>Support load</span><strong>${metrics.supportLoad.totalWorkerIssues}</strong></div>
              <div class="kpi"><span>Worker paid</span><strong>${money(metrics.workerEarnings.totalPaidMinor)}</strong></div>
              <div class="kpi"><span>NPS</span><strong>${metrics.nps ?? '—'}</strong></div>
            </div>
            <div class="columns" style="margin-top:16px">
              <div class="card">
                <h3 style="margin-top:0">Visits</h3>
                <div class="row between"><span>Completed</span><strong>${metrics.visits.completed}</strong></div>
                <div class="row between"><span>Skipped</span><strong>${metrics.visits.skipped}</strong></div>
                <div class="row between"><span>Cancelled</span><strong>${metrics.visits.cancelled}</strong></div>
                <div class="row between"><span>Disputed</span><strong>${metrics.visits.disputed}</strong></div>
              </div>
              <div class="card">
                <h3 style="margin-top:0">Payments</h3>
                <div class="row between"><span>Succeeded</span><strong>${metrics.payments.succeeded}</strong></div>
                <div class="row between"><span>Failed</span><strong>${metrics.payments.failed}</strong></div>
                <div class="row between"><span>Refund count</span><strong>${metrics.refunds.total}</strong></div>
                <div class="row between"><span>Failed payouts</span><strong>${metrics.workerEarnings.failedPayouts}</strong></div>
              </div>
              <div class="card">
                <h3 style="margin-top:0">Support</h3>
                <div class="row between"><span>Open disputes</span><strong>${metrics.disputes.open}</strong></div>
                <div class="row between"><span>Escalated</span><strong>${metrics.disputes.escalated}</strong></div>
                <div class="row between"><span>Open worker issues</span><strong>${metrics.supportLoad.openWorkerIssues}</strong></div>
                <div class="row between"><span>Generated</span><strong>${new Date(metrics.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
              </div>
            </div>
          `
          : `<div class="card"><strong>No beta metrics loaded yet.</strong><p style="color:var(--muted)">Refresh after seeding or connecting beta data.</p></div>`
      }
    </section>
  `;
}

function queueItem(item) {
  const active = item.subscriptionId === state.selectedSubscriptionId;
  return `
    <button class="queue-item ${active ? 'on' : ''}" data-select-subscription="${item.subscriptionId}">
      <div class="row between"><strong>${escapeHtml(item.phoneNumber)}</strong><span>${escapeHtml(item.tierCode)}</span></div>
      <div style="color:var(--muted);font-size:13px;margin-top:4px">${escapeHtml(item.address.neighborhood)} · ${escapeHtml(item.schedulePreference.dayOfWeek)} ${escapeHtml(item.schedulePreference.timeWindow)}</div>
      <div style="color:var(--amber);font-size:12px;margin-top:4px">SLA ${new Date(item.assignmentDueAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    </button>
  `;
}

function matchingDetail(detail) {
  const decisions = (state.auditEvents ?? [])
    .filter((event) => event.payload?.subscriptionId === detail.item.subscriptionId)
    .slice(0, 6);
  return `
    <div class="row between" style="margin-bottom:12px">
      <div><strong>${escapeHtml(detail.item.phoneNumber)} · ${escapeHtml(detail.item.tierCode)}</strong><br><span style="color:var(--muted)">${escapeHtml(detail.item.address.neighborhood)} · ${escapeHtml(detail.item.address.landmark)}</span></div>
      <span class="pill amber">Pending match</span>
    </div>
    <h3>Top candidates</h3>
    ${
      detail.candidates.length
        ? detail.candidates
            .map(
              (candidate, index) => `
                <div class="candidate ${index === 0 ? 'top' : ''}">
                  <div><strong>${escapeHtml(candidate.displayName)}</strong><br><span style="color:var(--muted)">${candidate.activeSubscriptionCount} active · capacity ${candidate.capacityRemaining}</span></div>
                  <div class="score">${candidate.score}</div>
                  <button class="btn" data-assign-worker="${candidate.workerId}">${index === 0 ? 'Assigner' : 'Choisir'}</button>
                  <button class="btn secondary" data-decline-worker="${candidate.workerId}">Decliner</button>
                </div>
              `,
            )
            .join('')
        : `<div class="card">No candidate yet. Seed worker profiles first.</div>`
    }
    <div class="card" style="margin-top:14px">
      <div class="row between">
        <strong>Decision log</strong>
        <span class="pill">${decisions.length}</span>
      </div>
      ${
        decisions.length
          ? decisions
              .map(
                (event) => `
                  <p style="color:var(--muted);margin:8px 0">
                    ${new Date(event.occurredAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} ·
                    ${escapeHtml(event.payload.decision)} ·
                    ${escapeHtml(event.payload.reason)} ·
                    worker ${escapeHtml(String(event.payload.workerId ?? '').slice(0, 8))}
                  </p>
                `,
              )
              .join('')
          : '<p style="color:var(--muted);margin:8px 0 0">No operator decision recorded for this request yet.</p>'
      }
    </div>
    ${capacityMap({
      serviceCells: [],
      title: 'Matching coverage',
      visits: [{ address: detail.item.address, status: 'scheduled' }],
      workerIssues: [],
    })}
  `;
}

function renderLiveOps() {
  const visits = state.route?.visits ?? [];
  const workerIssues = state.workerIssues ?? [];
  const serviceCells = state.serviceCells ?? [];
  const openIssues = workerIssues.filter((issue) => issue.status !== 'resolved');
  return `
    <section class="content">
      <div class="topbar">
        <strong>Live ops board</strong>
        <span class="pill ${openIssues.length ? 'red' : ''}">${openIssues.length} alerte(s)</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn" id="refresh-worker">Refresh</button>
      </div>
      <div class="detail">
        <div class="kpis">
          <div class="kpi"><span>En cours</span><strong>${visits.filter((visit) => visit.status === 'in_progress').length}</strong></div>
          <div class="kpi"><span>Planifiees</span><strong>${visits.filter((visit) => visit.status === 'scheduled').length}</strong></div>
          <div class="kpi"><span>Terminees</span><strong>${visits.filter((visit) => visit.status === 'completed').length}</strong></div>
          <div class="kpi"><span>Problemes</span><strong>${openIssues.length}</strong></div>
          <div class="kpi"><span>Worker total</span><strong>${compactMoney(state.earnings?.total?.amountMinor ?? '40000')}</strong></div>
        </div>
        ${capacityMap({ serviceCells, title: 'Live Lome map', visits, workerIssues: openIssues })}
        <div class="columns">
          <div class="list">
            <div class="card">
              <div class="row between"><strong>Service cells</strong><span class="pill">${serviceCells.length}</span></div>
              ${
                serviceCells.length
                  ? serviceCells.map(serviceCellCard).join('')
                  : '<p style="color:var(--muted)">No service-cell capacity loaded yet.</p>'
              }
            </div>
            <div class="card"><strong>Active worker feed</strong>${visits.map(liveOpsVisitCard).join('') || '<p style="color:var(--muted)">No live route loaded yet.</p>'}</div>
          </div>
          <div class="detail">
            <div class="card">
              <div class="row between"><strong>Worker issue queue</strong><span class="pill ${openIssues.length ? 'amber' : ''}">${workerIssues.length}</span></div>
              ${workerIssues.length ? workerIssues.map(workerIssueCard).join('') : '<p style="color:var(--muted)">No worker issues reported yet.</p>'}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function capacityMap({ serviceCells, title, visits, workerIssues }) {
  const cells = serviceCells.length
    ? serviceCells
    : [...new Set(visits.map((visit) => visit.address?.neighborhood).filter(Boolean))].map(
        (neighborhood) => ({
          activeSubscriptions: visits.filter(
            (visit) => visit.address?.neighborhood === neighborhood,
          ).length,
          activeWorkers: 0,
          capacityRemaining: 0,
          completedVisits: visits.filter(
            (visit) => visit.address?.neighborhood === neighborhood && visit.status === 'completed',
          ).length,
          inProgressVisits: visits.filter(
            (visit) =>
              visit.address?.neighborhood === neighborhood && visit.status === 'in_progress',
          ).length,
          scheduledVisits: visits.filter(
            (visit) => visit.address?.neighborhood === neighborhood && visit.status === 'scheduled',
          ).length,
          serviceCell: neighborhood,
          totalCapacity: 0,
          utilizationPercent: 0,
        }),
      );
  const maxSubscriptions = Math.max(1, ...cells.map((cell) => cell.activeSubscriptions));
  return `
    <div class="map capacity-map" style="border-radius:16px;margin-bottom:14px">
      <div class="map-header">
        <strong>${escapeHtml(title)}</strong>
        <span>${visits.length} visite(s) · ${workerIssues.length} alerte(s)</span>
      </div>
      <div class="map-cells">
        ${
          cells.length
            ? cells
                .map((cell, index) => {
                  const pressure =
                    cell.utilizationPercent >= 90
                      ? 'hot'
                      : cell.utilizationPercent >= 75 ||
                          workerIssues.some(
                            (issue) => issue.address?.neighborhood === cell.serviceCell,
                          )
                        ? 'warm'
                        : 'calm';
                  const size = 72 + Math.round((cell.activeSubscriptions / maxSubscriptions) * 54);
                  const issueCount = workerIssues.filter(
                    (issue) => issue.address?.neighborhood === cell.serviceCell,
                  ).length;
                  return `
                    <div class="map-cell ${pressure}" style="--x:${(index * 29 + 12) % 82}%;--y:${(index * 43 + 18) % 74}%;--s:${size}px">
                      <strong>${escapeHtml(cell.serviceCell)}</strong>
                      <span>${cell.utilizationPercent}% · ${cell.capacityRemaining} free</span>
                      ${issueCount ? `<em>${issueCount} alert</em>` : ''}
                    </div>
                  `;
                })
                .join('')
            : '<div class="map-empty">No route or capacity data loaded yet.</div>'
        }
      </div>
    </div>
  `;
}

function liveOpsVisitCard(visit) {
  const canClose = visit.status === 'scheduled';
  return `
    <div class="issue-card">
      <div class="row between">
        <strong>${escapeHtml(visit.address.neighborhood)}</strong>
        <span class="pill ${visit.status === 'no_show' || visit.status === 'cancelled' ? 'red' : visit.status === 'in_progress' ? 'amber' : ''}">${escapeHtml(visit.status)}</span>
      </div>
      <p style="color:var(--muted);margin:6px 0">${escapeHtml(visit.scheduledDate)} · ${escapeHtml(visit.scheduledTimeWindow)} · ${escapeHtml(visit.subscriberPhoneNumber)}</p>
      <div class="row">
        <button class="btn secondary" data-operator-visit-status="${visit.visitId}" data-visit-status="no_show" ${canClose ? '' : 'disabled'}>No-show</button>
        <button class="btn red" data-operator-visit-status="${visit.visitId}" data-visit-status="cancelled" ${canClose ? '' : 'disabled'}>Cancel</button>
      </div>
    </div>
  `;
}

function serviceCellCard(cell) {
  const pressure =
    cell.utilizationPercent >= 90 ? 'red' : cell.utilizationPercent >= 75 ? 'amber' : '';
  return `
    <div class="service-cell">
      <div class="row between">
        <strong>${escapeHtml(cell.serviceCell)}</strong>
        <span class="pill ${pressure}">${cell.utilizationPercent}%</span>
      </div>
      <div class="capacity-bar"><span style="width:${Math.min(100, cell.utilizationPercent)}%"></span></div>
      <p>${cell.activeSubscriptions}/${cell.totalCapacity} abonnements · ${cell.capacityRemaining} places</p>
      <p>${cell.activeWorkers} worker(s) · ${cell.scheduledVisits} planifiee(s) · ${cell.inProgressVisits} en cours · ${cell.completedVisits} terminee(s)</p>
    </div>
  `;
}

function workerIssueCard(issue) {
  return `
    <div class="issue-card ${issue.issueId === state.selectedWorkerIssueId ? 'on' : ''}">
      <div class="row between">
        <strong>${escapeHtml(workerIssueLabel(issue.issueType))}</strong>
        <span class="pill ${issue.status === 'open' ? 'red' : issue.status === 'acknowledged' ? 'amber' : ''}">${escapeHtml(issue.status)}</span>
      </div>
      <p style="color:var(--muted);margin:6px 0">${escapeHtml(issue.subscriberPhoneNumber ?? issue.subscriptionId.slice(0, 8))} · ${escapeHtml(issue.address?.neighborhood ?? 'quartier inconnu')} · ${escapeHtml(issue.scheduledDate ?? '')}</p>
      <p style="margin:6px 0 10px">${escapeHtml(issue.description)}</p>
      ${issue.resolutionNote ? `<p style="color:var(--muted);margin:0 0 10px">${escapeHtml(issue.resolutionNote)}</p>` : ''}
      <textarea data-worker-issue-note="${issue.issueId}" rows="2" placeholder="Message pour la worker">${issue.resolutionNote ? escapeHtml(issue.resolutionNote) : ''}</textarea>
      <div class="row">
        <button class="btn secondary" data-resolve-worker-issue="${issue.issueId}" data-worker-issue-status="acknowledged" ${issue.status === 'open' ? '' : 'disabled'}>Accuser</button>
        <button class="btn" data-resolve-worker-issue="${issue.issueId}" data-worker-issue-status="resolved" ${issue.status === 'resolved' ? 'disabled' : ''}>Resoudre</button>
      </div>
    </div>
  `;
}

function workerIssueThread() {
  const issues = (state.workerIssues ?? [])
    .filter((issue) => issue.workerId === state.workerId)
    .slice(0, 5);

  return issues.length
    ? issues
        .map(
          (issue) => `
            <div class="chat-line ${issue.status === 'resolved' ? '' : 'open'}">
              <span>${new Date(issue.createdAt).toLocaleDateString('fr-FR')}</span>
              <p>${escapeHtml(issue.description)}</p>
              ${
                issue.resolutionNote
                  ? `<p><strong>Ops:</strong> ${escapeHtml(issue.resolutionNote)}</p>`
                  : '<p><strong>Ops:</strong> En attente de reponse.</p>'
              }
            </div>
          `,
        )
        .join('')
    : '<p style="color:var(--muted);line-height:1.5">Aucun message operations.</p>';
}

function renderSwaps() {
  const requests = state.swapRequests ?? [];
  const selected =
    requests.find((request) => request.requestId === state.selectedSwapRequestId) ?? requests[0];
  const candidates =
    state.swapDetail?.requestId === selected?.requestId ? state.swapDetail.candidates : [];
  return `
    <section class="content">
      <div class="topbar">
        <strong>Demandes de changement</strong>
        <span class="pill ${requests.some((request) => request.status === 'open') ? 'red' : ''}">${requests.length} demande(s)</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn" id="refresh-swaps">Actualiser</button>
      </div>
      <div class="columns">
        <div class="list">
          ${
            requests.length
              ? requests
                  .map(
                    (request) => `
                      <button class="queue-item ${request.requestId === selected?.requestId ? 'on' : request.status === 'open' ? 'urgent' : ''}" data-select-swap="${request.requestId}">
                        <strong>${escapeHtml(request.subscriberPhoneNumber ?? request.subscriptionId.slice(0, 8))}</strong><br>
                        <span>${escapeHtml(request.currentWorkerName ?? request.currentWorkerId.slice(0, 8))}</span><br>
                        <small>${escapeHtml(request.status)} · ${new Date(request.requestedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>
                      </button>
                    `,
                  )
                  .join('')
              : `<div class="card"><strong>Aucune demande</strong><p style="color:var(--muted)">Les demandes de changement de laveuse apparaissent ici.</p></div>`
          }
        </div>
        <div class="detail">
          ${
            selected
              ? `
                <div class="row between">
                  <div><strong>${escapeHtml(selected.subscriberPhoneNumber ?? selected.subscriptionId)}</strong><br><span style="color:var(--muted)">Actuelle: ${escapeHtml(selected.currentWorkerName ?? selected.currentWorkerId.slice(0, 8))}</span></div>
                  <span class="pill ${selected.status === 'open' ? 'amber' : ''}">${escapeHtml(selected.status)}</span>
                </div>
                <div class="card" style="margin-top:12px"><strong>Motif</strong><p>${escapeHtml(selected.reason)}</p></div>
                <h3>Remplaçantes recommandées</h3>
                ${
                  candidates.length
                    ? candidates
                        .map(
                          (candidate, index) => `
                            <div class="candidate ${index === 0 ? 'top' : ''}">
                              <div><strong>${escapeHtml(candidate.displayName)}</strong><br><span style="color:var(--muted)">${candidate.activeSubscriptionCount} active · capacity ${candidate.capacityRemaining}</span></div>
                              <div class="score">${candidate.score}</div>
                              <button class="btn" data-resolve-swap="${selected.requestId}" data-swap-worker="${candidate.workerId}" ${selected.status === 'open' ? '' : 'disabled'}>${index === 0 ? 'Approuver' : 'Choisir'}</button>
                            </div>
                          `,
                        )
                        .join('')
                    : `<div class="card">No candidate yet. Seed worker profiles first.</div>`
                }
                <div class="row" style="margin-top:12px">
                  <button class="btn red" data-decline-swap="${selected.requestId}" ${selected.status === 'open' ? '' : 'disabled'}>Refuser</button>
                </div>
              `
              : `<div class="card"><strong>Selectionnez une demande</strong><p style="color:var(--muted)">Les candidates et actions apparaitront ici.</p></div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderAdvances() {
  const requests = state.advanceRequests ?? [];
  const selected =
    requests.find((request) => request.requestId === state.selectedAdvanceRequestId) ?? requests[0];
  return `
    <section class="content">
      <div class="topbar">
        <strong>Avances worker</strong>
        <span class="pill ${requests.some((request) => request.status === 'open') ? 'amber' : ''}">${requests.length} demande(s)</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn secondary" id="pay-monthly-balance">Payer solde</button>
        <button class="btn" id="refresh-advances">Actualiser</button>
      </div>
      <div class="columns">
        <div class="list">
          ${
            requests.length
              ? requests
                  .map(
                    (request) => `
                      <button class="queue-item ${request.requestId === selected?.requestId ? 'on' : request.status === 'open' ? 'urgent' : ''}" data-select-advance="${request.requestId}">
                        <strong>${escapeHtml(request.workerName ?? request.workerId.slice(0, 8))}</strong><br>
                        <span>${money(request.amount.amountMinor)} · ${escapeHtml(request.month)}</span><br>
                        <small>${escapeHtml(request.status)} · ${new Date(request.requestedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>
                      </button>
                    `,
                  )
                  .join('')
              : `<div class="card"><strong>Aucune avance</strong><p style="color:var(--muted)">Les demandes d'avance mensuelle apparaissent ici.</p></div>`
          }
        </div>
        <div class="detail">
          ${
            selected
              ? `
                <div class="row between">
                  <div><strong>${escapeHtml(selected.workerName ?? selected.workerId)}</strong><br><span style="color:var(--muted)">${escapeHtml(selected.month)} · ${money(selected.amount.amountMinor)}</span></div>
                  <span class="pill ${selected.status === 'open' ? 'amber' : ''}">${escapeHtml(selected.status)}</span>
                </div>
                <div class="card" style="margin-top:12px"><strong>Motif</strong><p>${escapeHtml(selected.reason)}</p></div>
                ${
                  selected.resolutionNote
                    ? `<div class="card"><strong>Resolution</strong><p>${escapeHtml(selected.resolutionNote)}</p></div>`
                    : ''
                }
                <div class="row" style="margin-top:12px">
                  <button class="btn" data-resolve-advance="${selected.requestId}" data-advance-resolution="approved" ${selected.status === 'open' ? '' : 'disabled'}>Approuver</button>
                  <button class="btn red" data-resolve-advance="${selected.requestId}" data-advance-resolution="declined" ${selected.status === 'open' ? '' : 'disabled'}>Refuser</button>
                </div>
              `
              : `<div class="card"><strong>Selectionnez une demande</strong><p style="color:var(--muted)">Les decisions d'avance apparaitront ici.</p></div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderOnboarding() {
  const cases = state.onboardingCases ?? [];
  const selected = cases.find((item) => item.caseId === state.selectedOnboardingCaseId) ?? cases[0];
  const nextStage = selected ? nextOnboardingStage(selected.stage) : null;
  const openStages = cases.filter(
    (item) => item.stage !== 'activated' && item.stage !== 'rejected',
  );
  return `
    <section class="content">
      <div class="topbar">
        <strong>Pipeline laveuses</strong>
        <span class="pill ${openStages.length ? 'amber' : ''}">${openStages.length} actif(s) · ${cases.length} dossier(s)</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn" id="refresh-onboarding">Actualiser</button>
      </div>
      <div class="columns">
        <div class="list">
          <div class="card">
            <div class="row between">
              <strong>Nouvelle candidate</strong>
              <select id="onboarding-stage-filter">
                <option value="">Tous statuts</option>
                ${onboardingStageOrder()
                  .map(
                    (stage) =>
                      `<option value="${stage}" ${state.onboardingStageFilter === stage ? 'selected' : ''}>${escapeHtml(onboardingStageLabel(stage))}</option>`,
                  )
                  .join('')}
                <option value="rejected" ${state.onboardingStageFilter === 'rejected' ? 'selected' : ''}>${escapeHtml(onboardingStageLabel('rejected'))}</option>
              </select>
            </div>
            <div class="form-grid" style="margin-top:12px">
              <input id="onboarding-display-name" placeholder="Nom complet" autocomplete="name" />
              <input id="onboarding-phone-number" placeholder="+228..." autocomplete="tel" />
              <input id="onboarding-neighborhoods" placeholder="Quartiers: Tokoin, Be Kpota" />
              <input id="onboarding-capacity" type="number" min="1" max="100" value="8" />
            </div>
            <button class="btn" id="create-onboarding-case" style="margin-top:10px;width:100%">Creer dossier</button>
          </div>
          ${
            cases.length
              ? cases
                  .map(
                    (item) => `
                      <button class="queue-item ${item.caseId === selected?.caseId ? 'on' : item.stage === 'activated' ? '' : 'urgent'}" data-select-onboarding="${item.caseId}">
                        <strong>${escapeHtml(item.displayName)}</strong><br>
                        <span>${escapeHtml(onboardingStageLabel(item.stage))} · ${escapeHtml(item.phoneNumber)}</span><br>
                        <small>${escapeHtml(item.serviceNeighborhoods.join(', '))}</small>
                      </button>
                    `,
                  )
                  .join('')
              : `<div class="card"><strong>Aucune candidate</strong><p style="color:var(--muted)">Creez un dossier candidate pour suivre CNI, references, casier, formation et uniforme.</p></div>`
          }
        </div>
        <div class="detail">
          ${
            selected
              ? `
                <div class="row between">
                  <div><strong>${escapeHtml(selected.displayName)}</strong><br><span style="color:var(--muted)">${escapeHtml(selected.phoneNumber)} · capacity ${selected.maxActiveSubscriptions}</span></div>
                  <span class="pill ${selected.stage === 'activated' ? '' : selected.stage === 'rejected' ? 'red' : 'amber'}">${escapeHtml(onboardingStageLabel(selected.stage))}</span>
                </div>
                <div class="card" style="margin-top:12px">
                  <strong>Historique</strong>
                  ${selected.notes.map((note) => `<p style="margin:8px 0;color:var(--muted)">${new Date(note.createdAt).toLocaleDateString('fr-FR')} · ${escapeHtml(onboardingStageLabel(note.stage))} · ${escapeHtml(note.note)}</p>`).join('')}
                </div>
                <div class="card">
                  <strong>Note operations</strong>
                  <textarea id="onboarding-note" rows="4" placeholder="Verification CNI, references, casier, formation, uniforme..."></textarea>
                </div>
                <div class="row" style="margin-top:12px">
                  <button class="btn" data-advance-onboarding="${selected.caseId}" data-onboarding-stage="${nextStage ?? ''}" ${nextStage ? '' : 'disabled'}>${nextStage === 'activated' ? 'Activer' : 'Etape suivante'}</button>
                  <button class="btn red" data-advance-onboarding="${selected.caseId}" data-onboarding-stage="rejected" ${selected.stage === 'activated' || selected.stage === 'rejected' ? 'disabled' : ''}>Rejeter</button>
                </div>
              `
              : `<div class="card"><strong>Selectionnez une candidate</strong><p style="color:var(--muted)">Le suivi onboarding apparaitra ici.</p></div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderAuditEvents() {
  const events = state.auditEvents ?? [];
  return `
    <section class="content">
      <div class="topbar">
        <strong>Journal audit</strong>
        <span class="pill">${events.length} evenement(s)</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn" id="refresh-audit">Actualiser</button>
      </div>
      <div class="detail">
        ${
          events.length
            ? events
                .map(
                  (event) => `
                    <div class="card audit-event">
                      <div class="row between">
                        <div>
                          <strong>${escapeHtml(event.eventType)}</strong><br>
                          <span style="color:var(--muted)">${escapeHtml(event.aggregateType)} · ${escapeHtml(event.aggregateId.slice(0, 8))} · ${new Date(event.occurredAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        <span class="pill amber">${escapeHtml(event.actor.role)}</span>
                      </div>
                      <pre>${escapeHtml(JSON.stringify(event.payload, null, 2))}</pre>
                    </div>
                  `,
                )
                .join('')
            : `<div class="card"><strong>Aucun evenement</strong></div>`
        }
      </div>
    </section>
  `;
}

function renderNotifications() {
  const notifications = state.notifications ?? [];
  const pendingCount = notifications.filter(
    (notification) => notification.status === 'pending',
  ).length;
  const failedCount = notifications.filter(
    (notification) => notification.status === 'failed',
  ).length;
  const pushDevices = state.pushDevices ?? [];
  const readiness = state.pushProviderReadiness;
  return `
    <section class="content">
      <div class="topbar">
        <strong>Notifications</strong>
        <span class="pill amber">${pendingCount} pending</span>
        <span class="pill ${failedCount > 0 ? 'red' : ''}">${failedCount} failed</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn secondary" id="deliver-notifications">Traiter dus</button>
        <button class="btn" id="refresh-notifications">Actualiser</button>
      </div>
      <div class="detail">
        <div class="card">
          <div class="row between">
            <div>
              <strong>Push provider</strong><br>
              <span style="color:var(--muted)">${escapeHtml(readiness?.selectedProvider ?? 'unknown')} · ${escapeHtml(readiness?.environment ?? 'unknown')} · send ${readiness?.selectedProviderCanSend ? 'enabled' : 'blocked'}</span>
            </div>
            <span class="pill ${readiness?.selectedProviderCanSend ? '' : 'red'}">${readiness?.selectedProviderCanSend ? 'pret' : 'bloque'}</span>
          </div>
          ${
            readiness?.providers
              ?.map(
                (provider) => `
                  <p style="color:var(--muted);margin:10px 0 0">
                    ${escapeHtml(provider.provider)} · ${provider.configured ? 'configured' : `missing ${escapeHtml(provider.missingKeys.join(', '))}`}
                  </p>
                `,
              )
              .join('') ??
            `<p style="color:var(--muted);margin:10px 0 0">Readiness non chargee.</p>`
          }
        </div>
        <div class="card">
          <div class="row between">
            <div>
              <strong>Appareils push</strong><br>
              <span style="color:var(--muted)">${pushDevices.length} simulateur(s) iOS/Android actif(s)</span>
            </div>
            <span class="pill">${pushDevices.filter((device) => device.status === 'active').length} actifs</span>
          </div>
          ${
            pushDevices.length
              ? pushDevices
                  .map(
                    (device) => `
                      <p style="color:var(--muted);margin:10px 0 0">
                        ${escapeHtml(device.platform)} · ${escapeHtml(device.environment)} · ${escapeHtml(device.role)} · ${escapeHtml(device.deviceId)} · ${escapeHtml(device.tokenPreview)}
                      </p>
                    `,
                  )
                  .join('')
              : `<p style="color:var(--muted);margin:10px 0 0">Aucun appareil push actif.</p>`
          }
        </div>
        ${
          notifications.length
            ? notifications.map(notificationCard).join('')
            : `<div class="card"><strong>Aucune notification en attente</strong></div>`
        }
      </div>
    </section>
  `;
}

function notificationCard(notification) {
  const availableAt = new Date(notification.availableAt);
  const isRetryPending =
    notification.status === 'pending' &&
    notification.failureReason &&
    availableAt.getTime() > Date.now();
  const timingLabel = isRetryPending ? 'prochain essai' : 'disponible';
  return `
    <div class="card audit-event">
      <div class="row between">
        <div>
          <strong>${escapeHtml(notification.templateKey)}</strong><br>
          <span style="color:var(--muted)">
            ${escapeHtml(notification.channel)} · ${escapeHtml(notification.recipientRole)} · ${escapeHtml(notification.status)} · ${timingLabel} ${availableAt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <span class="pill ${notification.status === 'sent' ? '' : notification.status === 'failed' || notification.status === 'suppressed_quiet_hours' ? 'red' : 'amber'}">${escapeHtml(notification.status)}</span>
      </div>
      <p style="color:var(--muted);margin:10px 0 0">
        ${escapeHtml(notification.aggregateType ?? 'aggregate')} · ${escapeHtml(notification.aggregateId ?? '')} · tentative ${escapeHtml(String(notification.attemptCount ?? 0))}
      </p>
      ${
        notification.failureReason
          ? `<p style="color:${notification.status === 'failed' ? 'var(--danger)' : 'var(--muted)'};margin:8px 0 0">${escapeHtml(notification.failureReason)}</p>`
          : ''
      }
      <pre>${escapeHtml(JSON.stringify(notification.payload, null, 2))}</pre>
    </div>
  `;
}

function renderPayments() {
  const attempts = state.paymentAttempts ?? [];
  const reconciliation = state.paymentReconciliationRun;
  const readiness = state.paymentProviderReadiness;
  const failedCount = attempts.filter((attempt) => attempt.status === 'failed').length;
  const overdueCount = attempts.filter(
    (attempt) => attempt.subscriptionStatus === 'payment_overdue',
  ).length;
  const collectedMinor = attempts
    .filter((attempt) => attempt.status === 'succeeded')
    .reduce((total, attempt) => total + Number(attempt.amount.amountMinor), 0);
  return `
    <section class="content">
      <div class="topbar">
        <strong>Paiements</strong>
        <span class="pill ${failedCount > 0 ? 'red' : ''}">${failedCount} failed</span>
        <span class="pill ${overdueCount > 0 ? 'amber' : ''}">${overdueCount} overdue</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn secondary" id="run-payment-reconciliation">Reconcile</button>
        <button class="btn" id="refresh-payments">Actualiser</button>
      </div>
      <div class="grid">
        <div class="kpi"><span>Collecte recente</span><strong>${compactMoney(collectedMinor)}</strong></div>
        <div class="kpi"><span>Tentatives</span><strong>${attempts.length}</strong></div>
        <div class="kpi"><span>Dernier run</span><strong>${escapeHtml(reconciliation?.status ?? 'none')}</strong></div>
      </div>
      <div class="detail" style="margin-top:16px">
        <div class="card">
          <div class="row between">
            <div>
              <strong>Payment provider</strong><br>
              <span style="color:var(--muted)">
                ${escapeHtml(readiness?.selectedProvider ?? 'unknown')} · charge ${readiness?.selectedProviderCanCharge ? 'enabled' : 'blocked'} · refund ${readiness?.selectedProviderCanRefund ? 'enabled' : 'blocked'} · payout ${readiness?.selectedProviderCanPayout ? 'enabled' : 'blocked'}
              </span>
            </div>
            <span class="pill ${readiness?.selectedProviderCanCharge || readiness?.selectedProviderCanRefund || readiness?.selectedProviderCanPayout ? '' : 'red'}">${readiness ? 'loaded' : 'unknown'}</span>
          </div>
          ${
            readiness?.providers
              ?.map(
                (provider) => `
                  <p style="color:var(--muted);margin:10px 0 0">
                    ${escapeHtml(provider.provider)} · charge ${provider.charge.canRun ? 'ready' : provider.charge.configured ? 'disabled' : `missing ${escapeHtml(provider.charge.missingKeys.join(', '))}`} · refund ${provider.refund.canRun ? 'ready' : provider.refund.configured ? 'disabled' : `missing ${escapeHtml(provider.refund.missingKeys.join(', '))}`} · payout ${provider.payout.canRun ? 'ready' : provider.payout.configured ? 'disabled' : `missing ${escapeHtml(provider.payout.missingKeys.join(', '))}`}
                  </p>
                `,
              )
              .join('') ??
            `<p style="color:var(--muted);margin:10px 0 0">Readiness non chargee.</p>`
          }
        </div>
        ${
          reconciliation
            ? `
              <div class="card">
                <div class="row between">
                  <div>
                    <strong>Reconciliation</strong><br>
                    <span style="color:var(--muted)">${new Date(reconciliation.checkedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · ${escapeHtml(reconciliation.provider ?? 'all providers')}</span>
                  </div>
                  <span class="pill ${reconciliation.status === 'clean' ? '' : 'red'}">${escapeHtml(reconciliation.status)}</span>
                </div>
                <p style="color:var(--muted);margin:10px 0 0">
                  collected ${money(reconciliation.totalCollected.amountMinor)} · refunded ${money(reconciliation.totalRefunded.amountMinor)} · ${reconciliation.issueCount} issue(s)
                </p>
                ${
                  reconciliation.issues?.length
                    ? reconciliation.issues.map(paymentIssueCard).join('')
                    : `<p style="color:var(--muted);margin:10px 0 0">Aucune anomalie detectee.</p>`
                }
              </div>
            `
            : `<div class="card"><strong>Aucun run de reconciliation</strong><p style="color:var(--muted)">Lancez une reconciliation pour figer les anomalies actuelles.</p></div>`
        }
        ${
          attempts.length
            ? attempts.map(paymentAttemptCard).join('')
            : `<div class="card"><strong>Aucune tentative recente</strong><p style="color:var(--muted)">Les paiements et webhooks apparaissent ici.</p></div>`
        }
      </div>
    </section>
  `;
}

function paymentAttemptCard(attempt) {
  return `
    <div class="card">
      <div class="row between">
        <div>
          <strong>${money(attempt.amount.amountMinor)}</strong><br>
          <span style="color:var(--muted)">${escapeHtml(attempt.provider)} · ${escapeHtml(attempt.providerReference)} · ${new Date(attempt.chargedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <span class="pill ${attempt.status === 'failed' ? 'red' : ''}">${escapeHtml(attempt.status)}</span>
      </div>
      <p style="color:var(--muted);margin:10px 0 0">
        subscription ${escapeHtml(attempt.subscriptionId.slice(0, 8))} · ${escapeHtml(attempt.subscriptionStatus)} · idempotency ${escapeHtml(attempt.idempotencyKey)}
      </p>
    </div>
  `;
}

function paymentIssueCard(issue) {
  return `
    <div class="card" style="margin-top:10px">
      <div class="row between">
        <div>
          <strong>${escapeHtml(paymentIssueLabel(issue.issueType))}</strong><br>
          <span style="color:var(--muted)">attempt ${escapeHtml(issue.paymentAttemptId.slice(0, 8))} · subscription ${escapeHtml(issue.subscriptionId.slice(0, 8))}</span>
        </div>
        <span class="pill ${issue.severity === 'critical' ? 'red' : 'amber'}">${escapeHtml(issue.severity)}</span>
      </div>
    </div>
  `;
}

function renderSupport() {
  const context = state.supportContext;
  const subscription = context?.subscription;
  const recentVisit = subscription?.recentVisits?.[0] ?? subscription?.upcomingVisits?.[0] ?? null;
  return `
    <section class="content">
      <div class="topbar">
        <strong>Support abonne</strong>
        <span class="pill ${subscription?.status === 'payment_overdue' ? 'red' : ''}">${escapeHtml(subscription?.status ?? 'non charge')}</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <input id="support-phone-query" value="${escapeHtml(state.supportPhoneQuery)}" placeholder="+228..." style="width:170px;max-width:25vw" />
        <button class="btn secondary" id="search-support">Rechercher</button>
        <input id="support-subscription-id" value="${escapeHtml(state.supportSubscriptionId)}" style="width:330px;max-width:40vw" />
        <button class="btn secondary" id="load-support-context">Charger</button>
        <button class="btn" id="refresh-support">Actualiser</button>
      </div>
      ${
        state.supportMatches.length
          ? `<div class="list" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));display:grid;gap:10px;margin-bottom:16px">${state.supportMatches
              .map(
                (match) => `
                  <button class="queue-item" data-support-match="${match.subscriptionId}">
                    <strong>${escapeHtml(match.phoneNumber)}</strong><br>
                    <span>${escapeHtml(match.tierCode)} · ${escapeHtml(match.status)}</span><br>
                    <small>${escapeHtml(match.subscriptionId.slice(0, 8))}</small>
                  </button>
                `,
              )
              .join('')}</div>`
          : ''
      }
      ${
        context
          ? `
            <div class="grid">
              <div class="kpi"><span>Telephone</span><strong>${escapeHtml(subscription.phoneNumber)}</strong></div>
              <div class="kpi"><span>Abonnement</span><strong>${money(subscription.monthlyPriceMinor)}</strong></div>
              <div class="kpi"><span>Litiges</span><strong>${context.disputes.length}</strong></div>
              <div class="kpi"><span>Credits</span><strong>${subscription.supportCredits?.length ?? 0}</strong></div>
            </div>
            <div class="detail" style="margin-top:16px">
              <div class="card">
                <strong>Abonnement</strong>
                <p style="color:var(--muted);line-height:1.5">${escapeHtml(subscription.tierCode)} · ${subscription.visitsPerCycle} visite(s) · ${escapeHtml(subscription.address.neighborhood)} · ${escapeHtml(subscription.address.landmark ?? '')}</p>
                ${
                  subscription.assignedWorker
                    ? `<p style="color:var(--muted);margin:8px 0 0">Worker: ${escapeHtml(subscription.assignedWorker.displayName)} · ${subscription.assignedWorker.averageRating ?? 'new'} rating</p>`
                    : `<p style="color:var(--muted);margin:8px 0 0">Worker non assigne.</p>`
                }
              </div>
              <div class="card">
                <strong>Derniere visite</strong>
                ${
                  recentVisit
                    ? `<p style="color:var(--muted);line-height:1.5">${escapeHtml(recentVisit.status)} · ${escapeHtml(recentVisit.scheduledDate)} · ${escapeHtml(recentVisit.scheduledTimeWindow)}</p>`
                    : `<p style="color:var(--muted);line-height:1.5">Aucune visite disponible.</p>`
                }
              </div>
              <div class="card">
                <strong>Paiements & recus</strong>
                ${
                  context.billingHistory.length
                    ? context.billingHistory
                        .map(
                          (item) => `
                            <p style="color:var(--muted);margin:10px 0 0">${escapeHtml(item.itemType)} · ${money(item.amount.amountMinor)} · ${escapeHtml(item.status)} · ${new Date(item.occurredAt).toLocaleDateString('fr-FR')}</p>
                          `,
                        )
                        .join('')
                    : `<p style="color:var(--muted);line-height:1.5">Aucun paiement ou remboursement.</p>`
                }
                <button class="btn secondary" id="open-support-payments" style="width:100%;margin-top:12px">Voir paiements</button>
              </div>
              <div class="card">
                <strong>Litiges</strong>
                ${
                  context.disputes.length
                    ? context.disputes
                        .map(
                          (dispute) => `
                            <p style="color:var(--muted);margin:10px 0 0">${escapeHtml(issueLabel(dispute.issueType))} · ${escapeHtml(dispute.status)} · ${escapeHtml(dispute.description)}</p>
                          `,
                        )
                        .join('')
                    : `<p style="color:var(--muted);line-height:1.5">Aucun litige pour cet abonnement.</p>`
                }
                <button class="btn secondary" id="open-support-disputes" style="width:100%;margin-top:12px">Voir litiges</button>
              </div>
              <div class="card">
                <strong>Credits support</strong>
                ${
                  subscription.supportCredits?.length
                    ? subscription.supportCredits
                        .map(
                          (credit) => `
                            <p style="color:var(--muted);margin:10px 0 0">${money(credit.amount.amountMinor)} · ${escapeHtml(credit.reason)} · ${new Date(credit.createdAt).toLocaleDateString('fr-FR')}</p>
                          `,
                        )
                        .join('')
                    : `<p style="color:var(--muted);line-height:1.5">Aucun credit support emis.</p>`
                }
              </div>
              <div class="card">
                <strong>Comms</strong>
                ${
                  context.notifications.length
                    ? context.notifications
                        .map(
                          (notification) => `
                            <p style="color:var(--muted);margin:10px 0 0">${escapeHtml(notification.templateKey)} · ${escapeHtml(notification.status)} · ${new Date(notification.createdAt).toLocaleDateString('fr-FR')}</p>
                          `,
                        )
                        .join('')
                    : `<p style="color:var(--muted);line-height:1.5">Aucune notification rattachee.</p>`
                }
                <button class="btn secondary" id="open-support-notifications" style="width:100%;margin-top:12px">Voir communications</button>
              </div>
            </div>
          `
          : `<div class="card"><strong>Chargez un abonnement</strong><p style="color:var(--muted)">Entrez un subscriptionId pour voir abonnement, visites, paiements, litiges et comms au meme endroit.</p></div>`
      }
    </section>
  `;
}

function renderDisputes() {
  const disputes = state.disputes ?? [];
  const selected =
    disputes.find((dispute) => dispute.disputeId === state.selectedDisputeId) ?? disputes[0];
  return `
    <section class="content">
      <div class="topbar">
        <strong>Bureau des litiges</strong>
        <span class="pill ${disputes.some((dispute) => dispute.status === 'open') ? 'red' : ''}">${disputes.length} dossier(s)</span>
        ${state.flash ? `<span class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="btn" id="refresh-disputes">Actualiser</button>
      </div>
      <div class="columns">
        <div class="list">
          ${
            disputes.length
              ? disputes
                  .map(
                    (dispute) => `
                <button class="queue-item ${dispute.disputeId === selected?.disputeId ? 'on' : dispute.status === 'open' ? 'urgent' : ''}" data-select-dispute="${dispute.disputeId}">
                  <strong>${escapeHtml(issueLabel(dispute.issueType))}</strong><br><span>${escapeHtml(dispute.subscriberPhoneNumber ?? dispute.subscriptionId.slice(0, 8))}</span><br><small>${escapeHtml(dispute.status)} · ${new Date(dispute.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>
                </button>
              `,
                  )
                  .join('')
              : `<div class="card"><strong>Aucun litige</strong><p style="color:var(--muted)">Les signalements abonne apparaissent ici apres creation depuis l'app abonne.</p></div>`
          }
        </div>
        <div class="detail">
          ${
            selected
              ? `
                <div class="row between">
                  <div><strong>${escapeHtml(issueLabel(selected.issueType))}</strong><br><span style="color:var(--muted)">Visite ${escapeHtml(selected.visitId.slice(0, 8))} · Worker ${escapeHtml(selected.workerId?.slice(0, 8) ?? 'non assigne')}</span></div>
                  <span class="pill ${selected.status === 'open' ? 'amber' : ''}">${escapeHtml(selected.status)}</span>
                </div>
                <h3>Preuves & contexte</h3>
                <div class="evidence"><div class="photo">Photo client</div><div class="photo">Photo avant</div><div class="photo">Photo apres</div></div>
                <div class="card" style="margin-top:12px"><strong>Description client</strong><p>${escapeHtml(selected.description)}</p></div>
                <div class="card" style="margin-top:12px">
                  <strong>Resolution</strong>
                  <p style="color:var(--muted);margin-bottom:0">${escapeHtml(selected.resolutionNote ?? 'Aucune resolution enregistree.')}</p>
                  ${
                    selected.subscriberCredit
                      ? `<p style="color:var(--green);font-weight:800;margin:8px 0 0">Credit client: ${money(selected.subscriberCredit.amountMinor)}</p>`
                      : ''
                  }
                </div>
                <div class="row" style="margin-top:12px">
                  <button class="btn" data-resolve-dispute="resolved_for_subscriber" ${selected.status === 'open' ? '' : 'disabled'}>Resoudre client</button>
                  <button class="btn secondary" data-resolve-dispute="resolved_for_worker" ${selected.status === 'open' ? '' : 'disabled'}>Resoudre worker</button>
                  <button class="btn red" data-resolve-dispute="escalated" ${selected.status === 'open' ? '' : 'disabled'}>Escalader</button>
                </div>
              `
              : `<div class="card"><strong>Selectionnez un litige</strong><p style="color:var(--muted)">Les actions de resolution apparaitront ici.</p></div>`
          }
        </div>
      </div>
    </section>
  `;
}

function bindOps() {
  app.querySelectorAll('[data-ops]').forEach((button) => {
    button.addEventListener('click', async () => {
      setState({ activeOps: button.dataset.ops });
      if (button.dataset.ops === 'metrics') await refreshBetaMetrics();
      if (button.dataset.ops === 'disputes') await refreshDisputes();
      if (button.dataset.ops === 'live') await refreshWorker();
      if (button.dataset.ops === 'swaps') await refreshSwaps();
      if (button.dataset.ops === 'advances') await refreshAdvances();
      if (button.dataset.ops === 'onboarding') await refreshOnboarding();
      if (button.dataset.ops === 'notifications') await refreshNotifications();
      if (button.dataset.ops === 'payments') await refreshPayments();
      if (button.dataset.ops === 'support') await refreshSupport();
      if (button.dataset.ops === 'audit') await refreshAuditEvents();
    });
  });
  app.querySelector('#seed-demo')?.addEventListener('click', seedDemo);
  app.querySelector('#refresh-disputes')?.addEventListener('click', refreshDisputes);
  app.querySelector('#refresh-queue')?.addEventListener('click', refreshQueue);
  app.querySelector('#refresh-swaps')?.addEventListener('click', refreshSwaps);
  app.querySelector('#refresh-advances')?.addEventListener('click', refreshAdvances);
  app.querySelector('#refresh-audit')?.addEventListener('click', refreshAuditEvents);
  app.querySelector('#deliver-notifications')?.addEventListener('click', deliverNotifications);
  app.querySelector('#refresh-notifications')?.addEventListener('click', refreshNotifications);
  app.querySelector('#refresh-payments')?.addEventListener('click', refreshPayments);
  app.querySelector('#refresh-support')?.addEventListener('click', refreshSupport);
  app.querySelector('#refresh-beta-metrics')?.addEventListener('click', refreshBetaMetrics);
  app.querySelector('#search-support')?.addEventListener('click', searchSupport);
  app.querySelector('#load-support-context')?.addEventListener('click', () => {
    const input = app.querySelector('#support-subscription-id');
    const supportSubscriptionId = input?.value?.trim() || state.supportSubscriptionId;
    setState({ supportSubscriptionId });
    refreshSupport();
  });
  app.querySelectorAll('[data-support-match]').forEach((button) => {
    button.addEventListener('click', () => {
      setState({ supportSubscriptionId: button.dataset.supportMatch });
      refreshSupport();
    });
  });
  app.querySelector('#open-support-disputes')?.addEventListener('click', openSupportDisputes);
  app
    .querySelector('#open-support-notifications')
    ?.addEventListener('click', openSupportNotifications);
  app.querySelector('#open-support-payments')?.addEventListener('click', async () => {
    setState({ activeOps: 'payments' });
    await refreshPayments();
  });
  app
    .querySelector('#run-payment-reconciliation')
    ?.addEventListener('click', runPaymentReconciliation);
  app.querySelector('#refresh-onboarding')?.addEventListener('click', refreshOnboarding);
  app.querySelector('#onboarding-stage-filter')?.addEventListener('change', async (event) => {
    setState({ onboardingStageFilter: event.target.value, selectedOnboardingCaseId: null });
    await refreshOnboarding();
  });
  app.querySelector('#create-onboarding-case')?.addEventListener('click', createOnboardingCase);
  app.querySelector('#pay-monthly-balance')?.addEventListener('click', createMonthlyPayout);
  app.querySelector('#refresh-worker')?.addEventListener('click', refreshWorker);
  app.querySelectorAll('[data-select-subscription]').forEach((button) => {
    button.addEventListener('click', () => selectSubscription(button.dataset.selectSubscription));
  });
  app.querySelectorAll('[data-select-dispute]').forEach((button) => {
    button.addEventListener('click', () =>
      setState({ selectedDisputeId: button.dataset.selectDispute }),
    );
  });
  app.querySelectorAll('[data-select-swap]').forEach((button) => {
    button.addEventListener('click', () => selectSwapRequest(button.dataset.selectSwap));
  });
  app.querySelectorAll('[data-select-advance]').forEach((button) => {
    button.addEventListener('click', () =>
      setState({ selectedAdvanceRequestId: button.dataset.selectAdvance }),
    );
  });
  app.querySelectorAll('[data-select-onboarding]').forEach((button) => {
    button.addEventListener('click', () =>
      setState({ selectedOnboardingCaseId: button.dataset.selectOnboarding }),
    );
  });
  app.querySelectorAll('[data-assign-worker]').forEach((button) => {
    button.addEventListener('click', () => assignWorker(button.dataset.assignWorker));
  });
  app.querySelectorAll('[data-decline-worker]').forEach((button) => {
    button.addEventListener('click', () => declineCandidate(button.dataset.declineWorker));
  });
  app.querySelectorAll('[data-resolve-dispute]').forEach((button) => {
    button.addEventListener('click', () => resolveDispute(button.dataset.resolveDispute));
  });
  app.querySelectorAll('[data-resolve-worker-issue]').forEach((button) => {
    button.addEventListener('click', () =>
      resolveWorkerIssue(button.dataset.resolveWorkerIssue, button.dataset.workerIssueStatus),
    );
  });
  app.querySelectorAll('[data-operator-visit-status]').forEach((button) => {
    button.addEventListener('click', () =>
      updateOperatorVisitStatus(button.dataset.operatorVisitStatus, button.dataset.visitStatus),
    );
  });
  app.querySelectorAll('[data-resolve-swap]').forEach((button) => {
    button.addEventListener('click', () =>
      resolveSwapRequest(button.dataset.resolveSwap, 'approved', button.dataset.swapWorker),
    );
  });
  app.querySelectorAll('[data-decline-swap]').forEach((button) => {
    button.addEventListener('click', () =>
      resolveSwapRequest(button.dataset.declineSwap, 'declined'),
    );
  });
  app.querySelectorAll('[data-resolve-advance]').forEach((button) => {
    button.addEventListener('click', () =>
      resolveAdvanceRequest(button.dataset.resolveAdvance, button.dataset.advanceResolution),
    );
  });
  app.querySelectorAll('[data-advance-onboarding]').forEach((button) => {
    button.addEventListener('click', () =>
      advanceOnboardingCase(button.dataset.advanceOnboarding, button.dataset.onboardingStage),
    );
  });
}

async function seedDemo() {
  await run(async () => {
    await Promise.all(
      demoWorkers.map((worker) =>
        api(`/v1/operator/workers/${worker.workerId}/profile`, {
          body: {
            countryCode: 'TG',
            displayName: worker.displayName,
            maxActiveSubscriptions: worker.maxActiveSubscriptions,
            serviceNeighborhoods: worker.serviceNeighborhoods,
            status: 'active',
          },
          method: 'PUT',
        }),
      ),
    );

    const phoneSuffix = String(Math.floor(Math.random() * 900000) + 100000);
    await api('/v1/subscriptions', {
      body: {
        address: {
          gpsLatitude: 6.1319,
          gpsLongitude: 1.2228,
          landmark: 'Ops demo seed',
          neighborhood: 'Tokoin',
        },
        countryCode: 'TG',
        phoneNumber: `+22894${phoneSuffix}`,
        schedulePreference: { dayOfWeek: 'tuesday', timeWindow: 'morning' },
        tierCode: 'T2',
      },
      method: 'POST',
    });

    await refreshQueue();
    setState({
      activeMode: 'ops',
      activeOps: 'matching',
      flash: { message: 'Demo seeded', type: 'ok' },
    });
  });
}

async function workerStartLogin() {
  await run(async () => {
    const phoneNumber = app.querySelector('#worker-login-phone')?.value?.trim();

    if (!phoneNumber) {
      throw new Error('Telephone worker requis.');
    }

    const challenge = await rawApi('/v1/auth/otp/start', {
      body: {
        countryCode: 'TG',
        phoneNumber,
      },
      method: 'POST',
    });
    setState({ workerAuthPhone: phoneNumber, workerOtpChallenge: challenge });
  });
}

async function workerVerifyLogin() {
  await run(async () => {
    const code = app.querySelector('#worker-login-code')?.value?.trim();

    if (!state.workerOtpChallenge || !code) {
      throw new Error('Code OTP requis.');
    }

    const auth = await rawApi('/v1/auth/otp/verify', {
      body: {
        challengeId: state.workerOtpChallenge.challengeId,
        code,
        deviceId: `worker-web-${state.workerId}`,
        role: 'worker',
      },
      method: 'POST',
    });
    setState({
      auth: { ...(state.auth ?? {}), worker: auth },
      workerOtpChallenge: null,
    });
    await registerWorkerPushSimulator();
    await refreshWorker();
  });
}

async function registerWorkerPushSimulator() {
  await run(async () => {
    const auth = state.auth?.worker;

    if (!auth?.accessToken) {
      throw new Error('Connectez le worker avant push.');
    }

    const device = await api('/v1/devices/push-token', {
      authToken: auth.accessToken,
      body: {
        app: 'worker',
        deviceId: `worker-web-${state.workerId}`,
        environment: 'simulator',
        platform: 'ios',
        token: `apns-simulator-worker-${auth.userId}`,
      },
      method: 'POST',
    });
    setState({
      flash: { message: 'Simulateur push worker enregistre', type: 'ok' },
      workerPushDevice: device,
    });
  });
}

async function refreshQueue() {
  const [queue, audit] = await Promise.all([
    api('/v1/operator/matching-queue?countryCode=TG&limit=25'),
    api('/v1/operator/audit-events?countryCode=TG&eventType=AssignmentDecisionRecorded&limit=50'),
  ]);
  const selectedSubscriptionId =
    state.selectedSubscriptionId ?? queue.items[0]?.subscriptionId ?? null;
  setState({ auditEvents: audit.items, queue: queue.items, selectedSubscriptionId });
  if (selectedSubscriptionId) await selectSubscription(selectedSubscriptionId);
}

async function selectSubscription(subscriptionId) {
  const item = state.queue.find((candidate) => candidate.subscriptionId === subscriptionId);
  if (!item) return;
  const candidates = await api(
    `/v1/operator/subscriptions/${subscriptionId}/matching-candidates?limit=5&anchorDate=2026-05-05`,
  );
  setState({
    detail: { candidates: candidates.candidates, item },
    selectedSubscriptionId: subscriptionId,
  });
}

async function assignWorker(workerId) {
  if (!state.selectedSubscriptionId) return;
  await run(async () => {
    await api(`/v1/subscriptions/${state.selectedSubscriptionId}/assignment`, {
      body: {
        anchorDate: '2026-05-05',
        operatorUserId: crypto.randomUUID(),
        workerId,
      },
      method: 'POST',
    });
    setState({ workerId });
    await refreshQueue();
    await refreshWorker();
    setState({
      activeMode: 'worker',
      flash: { message: 'Worker assigned and route generated', type: 'ok' },
    });
  });
}

async function declineCandidate(workerId) {
  if (!state.selectedSubscriptionId) return;
  await run(async () => {
    await api(`/v1/operator/subscriptions/${state.selectedSubscriptionId}/assignment-decisions`, {
      body: {
        anchorDate: '2026-05-05',
        operatorUserId: crypto.randomUUID(),
        workerId,
      },
      method: 'POST',
    });
    await refreshAuditEvents();
    await selectSubscription(state.selectedSubscriptionId);
    setState({ flash: { message: 'Candidate declined', type: 'ok' } });
  });
}

async function refreshWorker() {
  try {
    await syncPendingPhotoUploads();
    const [route, earnings, workerIssues, serviceCells, workerProfile] = await Promise.all([
      api(`/v1/workers/${state.workerId}/route?date=2026-05-05`),
      api(`/v1/workers/${state.workerId}/earnings?month=2026-05`),
      api('/v1/operator/worker-issues?limit=25'),
      api('/v1/operator/service-cells?date=2026-05-05&limit=20'),
      api(`/v1/workers/${state.workerId}/profile`).catch(() => null),
    ]);
    setState({
      earnings,
      route,
      routeCachedAt: new Date().toISOString(),
      routeCacheStatus: 'fresh',
      serviceCells: serviceCells.items,
      selectedWorkerIssueId: state.selectedWorkerIssueId ?? workerIssues.items[0]?.issueId ?? null,
      workerIssues: workerIssues.items,
      workerProfile,
    });
  } catch (error) {
    if (state.route || state.earnings) {
      setState({
        flash: { message: 'Mode hors ligne: route mise en cache conservee', type: 'error' },
        routeCacheStatus: 'stale',
      });
      return;
    }

    throw error;
  }
}

async function refreshBetaMetrics() {
  await run(async () => {
    const metrics = await api('/v1/operator/beta-metrics?countryCode=TG');
    setState({ betaMetrics: metrics });
  });
}

async function requestWorkerAdvance() {
  await run(async () => {
    const request = await api(`/v1/workers/${state.workerId}/advance-requests`, {
      body: {
        amountMinor: '20000',
        month: '2026-05',
        reason: "Demande d'avance depuis l'app worker.",
        requestedAt: new Date().toISOString(),
      },
      method: 'POST',
    });
    setState({
      activeMode: 'ops',
      activeOps: 'advances',
      selectedAdvanceRequestId: request.requestId,
    });
    await refreshAdvances();
    setState({ flash: { message: "Demande d'avance envoyee", type: 'ok' } });
  });
}

async function refreshAdvances() {
  const response = await api('/v1/operator/worker-advance-requests?limit=25');
  setState({
    advanceRequests: response.items,
    selectedAdvanceRequestId:
      state.selectedAdvanceRequestId ?? response.items[0]?.requestId ?? null,
  });
}

async function resolveAdvanceRequest(requestId, resolution) {
  if (!requestId) return;

  await run(async () => {
    await api(`/v1/operator/worker-advance-requests/${requestId}/resolve`, {
      body: {
        operatorUserId: crypto.randomUUID(),
        resolution,
        resolutionNote:
          resolution === 'approved'
            ? 'Avance approuvee par operations.'
            : 'Avance refusee par operations.',
        resolvedAt: new Date().toISOString(),
      },
      method: 'POST',
    });
    await refreshAdvances();
    setState({ flash: { message: "Demande d'avance mise a jour", type: 'ok' } });
  });
}

async function createMonthlyPayout() {
  await run(async () => {
    const payout = await api(`/v1/operator/workers/${state.workerId}/monthly-payouts`, {
      body: {
        month: '2026-05',
        note: 'Solde mensuel manuel.',
        operatorUserId: crypto.randomUUID(),
        paidAt: new Date().toISOString(),
        providerReference: `manual-${Date.now()}`,
      },
      method: 'POST',
    });
    await refreshWorker();
    setState({
      flash: { message: `Paiement enregistre: ${money(payout.amount.amountMinor)}`, type: 'ok' },
    });
  });
}

async function refreshOnboarding() {
  const stage = state.onboardingStageFilter
    ? `&stage=${encodeURIComponent(state.onboardingStageFilter)}`
    : '';
  const response = await api(`/v1/operator/worker-onboarding-cases?limit=25${stage}`);
  setState({
    onboardingCases: response.items,
    selectedOnboardingCaseId: state.selectedOnboardingCaseId ?? response.items[0]?.caseId ?? null,
  });
}

async function createOnboardingCase() {
  await run(async () => {
    const displayName = app.querySelector('#onboarding-display-name')?.value?.trim();
    const phoneNumber = app.querySelector('#onboarding-phone-number')?.value?.trim();
    const neighborhoodsText = app.querySelector('#onboarding-neighborhoods')?.value?.trim();
    const maxActiveSubscriptions = Number(app.querySelector('#onboarding-capacity')?.value ?? 8);

    if (!displayName || !phoneNumber || !neighborhoodsText) {
      throw new Error('Nom, telephone et quartiers sont obligatoires.');
    }

    const serviceNeighborhoods = neighborhoodsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!serviceNeighborhoods.length) {
      throw new Error('Ajoutez au moins un quartier de service.');
    }

    const onboardingCase = await api('/v1/operator/worker-onboarding-cases', {
      body: {
        appliedAt: new Date().toISOString(),
        countryCode: 'TG',
        displayName,
        maxActiveSubscriptions,
        operatorUserId: crypto.randomUUID(),
        phoneNumber,
        serviceNeighborhoods,
        workerId: crypto.randomUUID(),
      },
      method: 'POST',
    });
    setState({ selectedOnboardingCaseId: onboardingCase.caseId });
    await refreshOnboarding();
    setState({ flash: { message: 'Dossier candidate cree', type: 'ok' } });
  });
}

async function advanceOnboardingCase(caseId, stage) {
  if (!caseId || !stage) return;

  await run(async () => {
    const noteInput = app.querySelector('#onboarding-note');
    const note = noteInput?.value?.trim() || onboardingDefaultNote(stage);
    const updated = await api(`/v1/operator/worker-onboarding-cases/${caseId}/advance`, {
      body: {
        note,
        occurredAt: new Date().toISOString(),
        operatorUserId: crypto.randomUUID(),
        stage,
      },
      method: 'POST',
    });
    if (updated.stage === 'activated') setState({ workerId: updated.workerId });
    await refreshOnboarding();
    setState({ flash: { message: 'Onboarding mis a jour', type: 'ok' } });
  });
}

async function refreshDisputes() {
  const response = await api('/v1/operator/disputes?limit=25');
  setState({
    disputes: response.items,
    selectedDisputeId: state.selectedDisputeId ?? response.items[0]?.disputeId ?? null,
  });
}

async function openSupportDisputes() {
  const subscriptionId =
    state.supportContext?.subscription?.subscriptionId ?? state.supportSubscriptionId;
  const response = await api(
    `/v1/operator/disputes?subscriptionId=${encodeURIComponent(subscriptionId)}&limit=25`,
  );
  setState({
    activeOps: 'disputes',
    disputes: response.items,
    selectedDisputeId: response.items[0]?.disputeId ?? null,
  });
}

async function openSupportNotifications() {
  const subscriptionId =
    state.supportContext?.subscription?.subscriptionId ?? state.supportSubscriptionId;
  const response = await api(
    `/v1/operator/notifications?countryCode=TG&aggregateType=subscription&aggregateId=${encodeURIComponent(subscriptionId)}&limit=25`,
  );
  setState({
    activeOps: 'notifications',
    notifications: response.items,
  });
}

async function refreshAuditEvents() {
  const response = await api(
    '/v1/operator/audit-events?countryCode=TG&eventType=AssignmentDecisionRecorded&limit=25',
  );
  setState({ auditEvents: response.items });
}

async function refreshNotifications() {
  const [pendingNotifications, failedNotifications, pushDevices, readiness] = await Promise.all([
    api('/v1/operator/notifications?countryCode=TG&status=pending&limit=25'),
    api('/v1/operator/notifications?countryCode=TG&status=failed&limit=25'),
    api('/v1/operator/push-devices?countryCode=TG&status=active&limit=25'),
    api('/v1/operator/push-provider-readiness'),
  ]);
  setState({
    notifications: [...pendingNotifications.items, ...failedNotifications.items],
    pushDevices: pushDevices.items,
    pushProviderReadiness: readiness,
  });
}

async function deliverNotifications() {
  const response = await api('/v1/operator/notifications/deliver-due', {
    body: { countryCode: 'TG', limit: 25 },
    method: 'POST',
  });
  await refreshNotifications();
  setState({
    flash: { message: `${response.items.length} notification(s) traitee(s)`, type: 'ok' },
  });
}

async function refreshPayments() {
  const [failedAttempts, succeededAttempts, readiness] = await Promise.all([
    api('/v1/operator/payment-attempts?countryCode=TG&status=failed&limit=25'),
    api('/v1/operator/payment-attempts?countryCode=TG&status=succeeded&limit=25'),
    api('/v1/operator/payment-provider-readiness'),
  ]);
  setState({
    paymentAttempts: [...failedAttempts.items, ...succeededAttempts.items].sort(
      (left, right) => new Date(right.chargedAt).getTime() - new Date(left.chargedAt).getTime(),
    ),
    paymentProviderReadiness: readiness,
  });
}

async function refreshSupport() {
  const context = await api(
    `/v1/operator/subscriptions/${state.supportSubscriptionId}/support-context`,
  );
  setState({ supportContext: context });
}

async function searchSupport() {
  const input = app.querySelector('#support-phone-query');
  const supportPhoneQuery = input?.value?.trim() ?? '';
  const response = await api(
    `/v1/operator/subscriber-support-matches?countryCode=TG&phoneNumber=${encodeURIComponent(supportPhoneQuery)}&limit=10`,
  );
  setState({
    supportMatches: response.items,
    supportPhoneQuery,
    supportSubscriptionId: response.items[0]?.subscriptionId ?? state.supportSubscriptionId,
  });
}

async function runPaymentReconciliation() {
  await run(async () => {
    const response = await api('/v1/operator/payment-reconciliation-runs', {
      body: {
        checkedAt: new Date().toISOString(),
        countryCode: 'TG',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
      },
      method: 'POST',
    });
    await refreshPayments();
    setState({
      flash: {
        message: `Reconciliation: ${response.status} · ${response.issueCount} issue(s)`,
        type: response.status === 'clean' ? 'ok' : 'error',
      },
      paymentReconciliationRun: response,
    });
  });
}

async function refreshSwaps() {
  const response = await api('/v1/operator/worker-swap-requests?limit=25');
  const selectedSwapRequestId = state.selectedSwapRequestId ?? response.items[0]?.requestId ?? null;
  setState({
    selectedSwapRequestId,
    swapRequests: response.items,
  });
  if (selectedSwapRequestId) await selectSwapRequest(selectedSwapRequestId);
}

async function selectSwapRequest(requestId) {
  const request = state.swapRequests.find((candidate) => candidate.requestId === requestId);
  if (!request) return;
  const candidates = await api(
    `/v1/operator/subscriptions/${request.subscriptionId}/matching-candidates?limit=5&anchorDate=2026-05-05`,
  );
  setState({
    selectedSwapRequestId: requestId,
    swapDetail: { candidates: candidates.candidates, requestId },
  });
}

async function resolveSwapRequest(requestId, resolution, replacementWorkerId) {
  if (!requestId) return;

  await run(async () => {
    await api(`/v1/operator/worker-swap-requests/${requestId}/resolve`, {
      body: {
        operatorUserId: crypto.randomUUID(),
        replacementWorkerId: resolution === 'approved' ? replacementWorkerId : undefined,
        resolution,
        resolutionNote:
          resolution === 'approved'
            ? 'Changement de laveuse approuve par operations.'
            : 'Demande refusee par operations.',
        resolvedAt: new Date().toISOString(),
      },
      method: 'POST',
    });
    await refreshSwaps();
    if (resolution === 'approved' && replacementWorkerId) {
      setState({ workerId: replacementWorkerId });
      await refreshWorker();
    }
    setState({ flash: { message: 'Demande de changement mise a jour', type: 'ok' } });
  });
}

async function resolveDispute(resolution) {
  const dispute =
    state.disputes.find((candidate) => candidate.disputeId === state.selectedDisputeId) ??
    state.disputes[0];
  if (!dispute) return;

  await run(async () => {
    await api(`/v1/operator/disputes/${dispute.disputeId}/resolve`, {
      body: {
        operatorUserId: crypto.randomUUID(),
        resolution,
        resolutionNote:
          resolution === 'escalated'
            ? 'Escalade vers supervision operations.'
            : resolution === 'resolved_for_worker'
              ? 'Dossier tranche en faveur de la worker.'
              : 'Dossier tranche en faveur du client.',
        resolvedAt: new Date().toISOString(),
        subscriberCreditAmountMinor: resolution === 'resolved_for_subscriber' ? '2500' : undefined,
      },
      method: 'POST',
    });
    await refreshDisputes();
    setState({ flash: { message: 'Litige mis a jour', type: 'ok' } });
  });
}

async function resolveWorkerIssue(issueId, status) {
  if (!issueId || !status) return;

  await run(async () => {
    const noteInput = app.querySelector(`[data-worker-issue-note="${issueId}"]`);
    const resolutionNote =
      noteInput?.value?.trim() ||
      (status === 'resolved'
        ? 'Probleme worker resolu par operations.'
        : 'Probleme worker pris en charge par operations.');
    await api(`/v1/operator/worker-issues/${issueId}/resolve`, {
      body: {
        operatorUserId: crypto.randomUUID(),
        resolutionNote,
        resolvedAt: new Date().toISOString(),
        status,
      },
      method: 'POST',
    });
    await refreshWorker();
    setState({ flash: { message: 'Signalement worker mis a jour', type: 'ok' } });
  });
}

async function updateOperatorVisitStatus(visitId, status) {
  if (!visitId || !status) return;

  await run(async () => {
    await api(`/v1/operator/visits/${visitId}/status`, {
      body: {
        note:
          status === 'no_show'
            ? 'Client absent confirme par operations.'
            : 'Visite annulee depuis le live ops board.',
        operatorUserId: crypto.randomUUID(),
        status,
        updatedAt: new Date().toISOString(),
      },
      method: 'POST',
    });
    await refreshWorker();
    setState({ flash: { message: 'Statut visite mis a jour', type: 'ok' } });
  });
}

async function checkIn(visitId) {
  await run(async () => {
    await api(`/v1/visits/${visitId}/check-in`, {
      body: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: state.workerId,
      },
      method: 'POST',
    });
    await refreshWorker();
  });
}

async function checkOut(visitId) {
  await run(async () => {
    await uploadVisitPhotos(visitId);
    await api(`/v1/visits/${visitId}/check-out`, {
      body: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.132, longitude: 1.223 },
        workerId: state.workerId,
      },
      method: 'POST',
    });
    await refreshWorker();
  });
}

async function uploadVisitPhotos(visitId) {
  for (const photoType of VISIT_PHOTO_TYPES) {
    const draft = getVisitPhotoDraft(visitId, photoType);

    if (!draft) {
      throw new Error('Capture before and after photos before checkout.');
    }

    await uploadOrQueueVisitPhoto(draft);
  }
}

async function captureVisitPhoto(visitId, photoType) {
  if (!visitId || !VISIT_PHOTO_TYPES.includes(photoType)) return;

  try {
    const file = await pickVisitPhotoFile();
    const photo = await compressVisitPhoto(file, visitId, photoType);
    const nextDrafts = { ...state.visitPhotoDrafts };
    nextDrafts[visitPhotoKey(visitId, photoType)] = photo;
    setState({
      flash: {
        message: `${photoType === 'before' ? 'Photo avant' : 'Photo apres'} capturee`,
        type: 'ok',
      },
      visitPhotoDrafts: nextDrafts,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'photo_pick_cancelled') return;
    setState({
      flash: {
        message: error instanceof Error ? error.message : 'Photo capture failed',
        type: 'error',
      },
    });
  }
}

function pickVisitPhotoFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) {
          reject(new Error('photo_pick_cancelled'));
          return;
        }
        resolve(file);
      },
      { once: true },
    );
    document.body.append(input);
    input.click();
  });
}

async function compressVisitPhoto(file, visitId, photoType) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file must be an image.');
  }

  const image = await loadImage(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Photo compression is not available on this device.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.72);

  const dataUrl = await blobToDataUrl(blob);

  return {
    byteSize: blob.size,
    capturedAt: new Date().toISOString(),
    contentType: blob.type || 'image/jpeg',
    dataUrl,
    objectKey: `visits/${visitId}/${photoType}-${Date.now()}.jpg`,
    photoType,
    visitId,
    workerId: state.workerId,
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Photo could not be read.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Photo compression failed.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function getVisitPhotoDraft(visitId, photoType) {
  return state.visitPhotoDrafts[visitPhotoKey(visitId, photoType)];
}

function visitPhotoKey(visitId, photoType) {
  return `${visitId}:${photoType}`;
}

async function uploadOrQueueVisitPhoto(photo) {
  try {
    await uploadVisitPhotoBinary(photo);
    await api(`/v1/visits/${photo.visitId}/photos`, {
      body: {
        byteSize: photo.byteSize,
        capturedAt: photo.capturedAt,
        contentType: photo.contentType,
        objectKey: photo.objectKey,
        photoType: photo.photoType,
        workerId: photo.workerId,
      },
      method: 'POST',
    });
    setState({
      pendingPhotoUploads: state.pendingPhotoUploads.filter(
        (queued) => queued.objectKey !== photo.objectKey,
      ),
    });
  } catch (error) {
    const alreadyQueued = state.pendingPhotoUploads.some(
      (queued) => queued.objectKey === photo.objectKey,
    );
    if (!alreadyQueued) {
      setState({ pendingPhotoUploads: [...state.pendingPhotoUploads, photo] });
    }
    throw error;
  }
}

async function uploadVisitPhotoBinary(photo) {
  if (!photo.dataUrl) {
    return;
  }

  const blob = dataUrlToBlob(photo.dataUrl, photo.contentType);
  const upload = await api(`/v1/visits/${photo.visitId}/photo-uploads`, {
    body: {
      byteSize: photo.byteSize,
      contentType: photo.contentType,
      objectKey: photo.objectKey,
    },
    method: 'POST',
  });

  await putPhotoBlob(upload, blob);
}

async function putPhotoBlob(upload, blob) {
  const response = await fetch(upload.uploadUrl, {
    body: blob,
    headers: upload.headers ?? { 'content-type': blob.type || 'image/jpeg' },
    method: upload.method ?? 'PUT',
  });

  if (!response.ok) {
    throw new Error(`Photo storage upload failed with status ${response.status}.`);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Photo could not be prepared for offline sync.'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl, contentType) {
  const [header, encoded] = dataUrl.split(',', 2);

  if (!header?.startsWith('data:') || !encoded) {
    throw new Error('Queued photo data is invalid.');
  }

  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: contentType });
}

async function syncPendingPhotoUploads() {
  const pending = [...state.pendingPhotoUploads];
  for (const photo of pending) {
    try {
      await uploadOrQueueVisitPhoto(photo);
    } catch {
      return;
    }
  }
}

async function reportWorkerIssue(visitId) {
  await run(async () => {
    const visit = (state.route?.visits ?? []).find((candidate) => candidate.visitId === visitId);
    await api(`/v1/visits/${visitId}/worker-issues`, {
      body: {
        createdAt: new Date().toISOString(),
        description: visit
          ? `Signalement depuis ${visit.address.neighborhood}: besoin assistance operations.`
          : 'Signalement worker depuis la route.',
        issueType: 'other',
        workerId: state.workerId,
      },
      method: 'POST',
    });
    await refreshWorker();
    setState({
      activeWorker: 'profile',
      flash: { message: 'Signalement envoye aux operations', type: 'ok' },
    });
  });
}

async function markWorkerUnavailable() {
  await run(async () => {
    await api(`/v1/workers/${state.workerId}/unavailability`, {
      body: {
        createdAt: new Date().toISOString(),
        date: '2026-05-05',
        reason: 'Indisponible signale depuis app worker.',
      },
      method: 'POST',
    });
    setState({
      activeMode: 'ops',
      activeOps: 'matching',
      flash: { message: 'Indisponibilite worker enregistree', type: 'ok' },
    });
    await refreshQueue();
  });
}

async function run(action) {
  setState({ flash: null, loading: true });
  try {
    await action();
  } catch (error) {
    setState({
      flash: {
        message: error instanceof Error ? error.message : 'Unexpected error',
        type: 'error',
      },
    });
  } finally {
    state.loading = false;
    render();
  }
}

async function api(path, options = {}) {
  const authToken = options.authToken ?? (await authTokenForPath(path));
  const response = await fetch(`/api${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      'content-type': 'application/json',
      ...(authToken === null ? {} : { authorization: `Bearer ${authToken}` }),
    },
    method: options.method ?? 'GET',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? `HTTP ${response.status}`);
  return data;
}

async function authTokenForPath(path) {
  const role = requiredRoleForPath(path);

  if (role === null) return null;

  const session = state.auth?.[role];

  if (
    session?.accessToken &&
    new Date(session.accessTokenExpiresAt).getTime() > Date.now() + 30_000
  ) {
    return session.accessToken;
  }

  const auth = await createDemoSession(role);
  setState({ auth: { ...(state.auth ?? {}), [role]: auth } });
  return auth.accessToken;
}

function requiredRoleForPath(path) {
  const pathname = path.split('?')[0] ?? path;

  if (pathname.startsWith('/v1/operator/')) return 'operator';
  if (pathname.startsWith('/v1/workers/') || pathname.startsWith('/v1/visits/')) return 'worker';
  if (pathname.startsWith('/v1/subscriptions/') && pathname.endsWith('/assignment'))
    return 'operator';
  if (
    pathname.startsWith('/v1/subscriptions/') &&
    (pathname.includes('/visits/') ||
      pathname.endsWith('/cancel') ||
      pathname.endsWith('/mock-charge') ||
      pathname.endsWith('/tier') ||
      pathname.endsWith('/worker-swap-requests') ||
      pathname.split('/').length === 4)
  ) {
    return 'subscriber';
  }

  return null;
}

async function createDemoSession(role) {
  const phoneByRole = {
    operator: '+22890000001',
    subscriber: '+22890123456',
    worker: '+22890000002',
  };
  const challenge = await rawApi('/v1/auth/otp/start', {
    body: {
      countryCode: 'TG',
      phoneNumber: phoneByRole[role],
    },
    method: 'POST',
  });

  return rawApi('/v1/auth/otp/verify', {
    body: {
      challengeId: challenge.challengeId,
      code: challenge.testCode,
      deviceId: `ops-web-${role}`,
      role,
    },
    method: 'POST',
  });
}

async function rawApi(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: { 'content-type': 'application/json' },
    method: options.method ?? 'GET',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? `HTTP ${response.status}`);
  return data;
}

function dots() {
  return `
    <span class="dot" style="background:#ff5f57"></span>
    <span class="dot" style="background:#febc2e"></span>
    <span class="dot" style="background:#28c840"></span>
  `;
}

function money(amountMinor) {
  return `${Number(amountMinor).toLocaleString('fr-FR')} XOF`;
}

function compactMoney(amountMinor) {
  const amount = Number(amountMinor);
  return amount >= 1000 ? `${Math.round(amount / 1000)}k` : String(amount);
}

function percent(value) {
  return value === null || value === undefined ? '—' : `${Math.round(Number(value) * 100)}%`;
}

function issueLabel(issueType) {
  const labels = {
    damaged_item: 'Vetement endommage',
    missing_item: 'Objet manquant',
    other: 'Autre probleme',
    worker_no_show: 'Worker absente',
  };
  return labels[issueType] ?? issueType;
}

function paymentIssueLabel(issueType) {
  const labels = {
    overdue_failed_payment: 'Paiement echoue overdue',
    refund_exceeds_payment_amount: 'Remboursement trop eleve',
  };
  return labels[issueType] ?? issueType;
}

function workerIssueLabel(issueType) {
  const labels = {
    access_issue: 'Acces bloque',
    client_unavailable: 'Client absent',
    other: 'Autre probleme',
    safety_concern: 'Securite',
    supplies_missing: 'Materiel manquant',
  };
  return labels[issueType] ?? issueType;
}

function payoutLabel(payoutType) {
  const labels = {
    advance: 'Avance',
    monthly_settlement: 'Solde mensuel',
  };
  return labels[payoutType] ?? payoutType;
}

function nextOnboardingStage(stage) {
  const order = onboardingStageOrder();
  const index = order.indexOf(stage);
  return index === -1 || index === order.length - 1 ? null : order[index + 1];
}

function onboardingStageOrder() {
  return [
    'application_received',
    'cni_uploaded',
    'references_called',
    'casier_received',
    'training_scheduled',
    'uniform_issued',
    'activated',
  ];
}

function onboardingDefaultNote(stage) {
  const notes = {
    activated: 'Candidate activee apres verification finale.',
    casier_received: 'Casier judiciaire recu et controle.',
    cni_uploaded: 'CNI recue et verifiee.',
    references_called: 'References appelees et notes ajoutees.',
    rejected: 'Candidate rejetee par operations.',
    training_scheduled: 'Formation planifiee avec operations.',
    uniform_issued: 'Uniforme remis a la candidate.',
  };
  return notes[stage] ?? onboardingStageLabel(stage);
}

function onboardingStageLabel(stage) {
  const labels = {
    activated: 'Activee',
    application_received: 'Candidature recue',
    casier_received: 'Casier recu',
    cni_uploaded: 'CNI chargee',
    references_called: 'References appelees',
    rejected: 'Rejetee',
    training_scheduled: 'Formation planifiee',
    uniform_issued: 'Uniforme remis',
  };
  return labels[stage] ?? stage;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
