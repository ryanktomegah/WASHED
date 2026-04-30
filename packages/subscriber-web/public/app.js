const STORAGE_KEY = 'washed.subscriber-web.v1';
const app = document.querySelector('#app');

const state = loadState();

const tiers = [
  {
    code: 'T1',
    description: 'Idéal pour une personne seule',
    monthlyPriceMinor: '2500',
    visitsPerCycle: 1,
  },
  {
    code: 'T2',
    description: 'Économisez 10%',
    monthlyPriceMinor: '4500',
    visitsPerCycle: 2,
  },
];

const days = [
  ['monday', 'Lundi'],
  ['tuesday', 'Mardi'],
  ['wednesday', 'Mercredi'],
  ['thursday', 'Jeudi'],
  ['friday', 'Vendredi'],
  ['saturday', 'Samedi'],
];

const windows = [
  ['morning', 'Matin', '7h00 - 11h00'],
  ['afternoon', 'Après-midi', '13h00 - 17h00'],
];

const routes = {
  address: renderAddress,
  home: renderHome,
  otp: renderOtp,
  phone: renderPhone,
  profile: renderProfile,
  schedule: renderSchedule,
  splash: renderSplash,
  subscription: renderSubscription,
  support: renderSupport,
  tier: renderTier,
};

render();

function loadState() {
  const defaults = {
    address: {
      gpsLatitude: 6.1319,
      gpsLongitude: 1.2228,
      landmark: '',
      neighborhood: 'Tokoin',
    },
    auth: null,
    challenge: null,
    detail: null,
    flash: null,
    billingHistory: [],
    loading: false,
    paymentAttempt: null,
    paymentMethod: null,
    phoneNumber: '+22890123456',
    pushDevice: null,
    route: 'splash',
    schedulePreference: { dayOfWeek: 'tuesday', timeWindow: 'morning' },
    subscription: null,
    tierCode: 'T2',
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
      address: state.address,
      auth: state.auth,
      challenge: state.challenge,
      detail: state.detail,
      billingHistory: state.billingHistory,
      paymentAttempt: state.paymentAttempt,
      paymentMethod: state.paymentMethod,
      phoneNumber: state.phoneNumber,
      pushDevice: state.pushDevice,
      route: state.route,
      schedulePreference: state.schedulePreference,
      subscription: state.subscription,
      tierCode: state.tierCode,
    }),
  );
}

function setState(patch) {
  Object.assign(state, patch);
  saveState();
  render();
}

function go(route) {
  setState({ flash: null, route });
}

function render() {
  const renderer = routes[state.route] ?? renderSplash;
  app.innerHTML = renderer();
  bindCommon();
  bindRoute();
}

function bindCommon() {
  app.querySelectorAll('[data-go]').forEach((node) => {
    node.addEventListener('click', () => go(node.dataset.go));
  });
  app.querySelectorAll('[data-back]').forEach((node) => {
    node.addEventListener('click', () => go(node.dataset.back));
  });
}

function bindRoute() {
  const binders = {
    address: bindAddress,
    home: bindHome,
    otp: bindOtp,
    phone: bindPhone,
    profile: bindProfile,
    schedule: bindSchedule,
    subscription: bindSubscription,
    support: bindSupport,
    tier: bindTier,
  };
  binders[state.route]?.();
}

function statusBar(dark = false) {
  return `
    <div class="statusbar" style="${dark ? 'color:var(--white)' : ''}">
      <span>9:41</span><span class="notch"></span><span>5G 82%</span>
    </div>
  `;
}

function steps(current) {
  return `<div class="steps">${Array.from({ length: 5 }, (_, index) => `<span class="step ${index <= current ? 'on' : ''}"></span>`).join('')}</div>`;
}

function toast() {
  if (!state.flash) return '';
  return `<div class="toast ${state.flash.type === 'error' ? 'error' : ''}">${escapeHtml(state.flash.message)}</div>`;
}

function money(amountMinor) {
  return `${Number(amountMinor).toLocaleString('fr-FR')} XOF`;
}

function selectedTier() {
  return tiers.find((tier) => tier.code === state.tierCode) ?? tiers[1];
}

function nextVisit() {
  return state.detail?.upcomingVisits?.[0] ?? null;
}

function renderSplash() {
  return `
    <section class="splash">
      ${statusBar(true)}
      <div class="splash-body">
        <div>
          <div class="brand-mark">${waveIcon()}</div>
          <h1 class="brand-title">Washed</h1>
          <p style="color:rgb(255 253 248 / 56%);font-size:17px;line-height:1.55;margin:0 auto 22px;max-width:260px">Votre laveuse à domicile. Fiable, régulière, abordable.</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <span class="pill muted">Lomé · Togo</span>
            <span class="pill muted">2 500 - 4 500 XOF/mois</span>
          </div>
        </div>
        <button class="btn" data-go="${state.subscription ? 'home' : 'phone'}">${state.subscription ? 'Ouvrir mon tableau de bord' : 'Commencer'}</button>
      </div>
    </section>
  `;
}

function renderPhone() {
  return `
    <section class="screen">
      ${statusBar()}<button class="back" data-back="splash">← Retour</button>${steps(0)}${toast()}
      <div class="scroll page">
        <h1 class="title">Votre numéro</h1>
        <p class="subtitle">Nous vous envoyons un code test pour ouvrir votre session abonné.</p>
        <form id="phone-form">
          <div class="field">
            <label>Numéro mobile</label>
            <input id="phone-number" inputmode="tel" value="${escapeAttr(state.phoneNumber)}" />
          </div>
          <button class="btn" ${state.loading ? 'disabled' : ''}>Envoyer le code</button>
        </form>
      </div>
    </section>
  `;
}

function bindPhone() {
  document.querySelector('#phone-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phoneNumber = document.querySelector('#phone-number').value.trim();
    await run(async () => {
      const challenge = await api('/v1/auth/otp/start', {
        body: { countryCode: 'TG', phoneNumber },
        method: 'POST',
      });
      const testCodeMessage =
        challenge.testCode === null ? 'Code envoye par SMS.' : `Code test: ${challenge.testCode}`;
      setState({
        challenge,
        flash: { message: testCodeMessage, type: 'ok' },
        phoneNumber,
        route: 'otp',
      });
    });
  });
}

function renderOtp() {
  return `
    <section class="screen">
      ${statusBar()}<button class="back" data-back="phone">← Retour</button>${steps(0)}${toast()}
      <div class="scroll page">
        <h1 class="title">Code de vérification</h1>
        <p class="subtitle">Entrez le code envoyé au ${escapeHtml(state.phoneNumber)}.</p>
        <form id="otp-form">
          <div class="field">
            <label>Code OTP</label>
            <input id="otp-code" inputmode="numeric" maxlength="6" value="${escapeAttr(state.challenge?.testCode ?? '')}" />
          </div>
          <button class="btn" ${state.loading || !state.challenge ? 'disabled' : ''}>Confirmer</button>
        </form>
      </div>
    </section>
  `;
}

function bindOtp() {
  document.querySelector('#otp-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = document.querySelector('#otp-code').value.trim();
    await run(async () => {
      const auth = await api('/v1/auth/otp/verify', {
        body: {
          challengeId: state.challenge.challengeId,
          code,
          deviceId: 'subscriber-web-local',
          role: 'subscriber',
        },
        method: 'POST',
      });
      const pushDevice = await api('/v1/devices/push-token', {
        authToken: auth.accessToken,
        body: {
          app: 'subscriber',
          deviceId: 'subscriber-ios-simulator-local',
          environment: 'simulator',
          platform: 'ios',
          token: `apns-simulator-${auth.userId}`,
        },
        method: 'POST',
      });
      setState({ auth, pushDevice, route: 'address' });
    });
  });
}

function renderAddress() {
  return `
    <section class="screen">
      ${statusBar()}<button class="back" data-back="otp">← Retour</button>${steps(1)}${toast()}
      <div class="scroll page">
        <h1 class="title">Votre adresse</h1>
        <p class="subtitle">Pour que votre laveuse vous trouve facilement.</p>
        <div class="map" style="margin-bottom:16px"><div><strong>📍 Lomé</strong><br />Position GPS enregistrée</div></div>
        <form id="address-form">
          <div class="field"><label>Quartier</label><input id="neighborhood" value="${escapeAttr(state.address.neighborhood)}" /></div>
          <div class="field"><label>Repère</label><textarea id="landmark" placeholder="Derrière l'église, portail noir...">${escapeHtml(state.address.landmark)}</textarea></div>
          <button class="btn secondary" type="button" id="use-gps" style="margin-bottom:10px">Utiliser ma position GPS</button>
          <button class="btn">Continuer</button>
        </form>
      </div>
    </section>
  `;
}

function bindAddress() {
  document.querySelector('#use-gps')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setState({ flash: { message: 'GPS indisponible sur cet appareil', type: 'error' } });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          address: {
            ...state.address,
            gpsLatitude: Number(position.coords.latitude.toFixed(6)),
            gpsLongitude: Number(position.coords.longitude.toFixed(6)),
          },
          flash: { message: 'Position GPS mise à jour', type: 'ok' },
        });
      },
      () => setState({ flash: { message: 'Impossible de lire la position GPS', type: 'error' } }),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  });
  document.querySelector('#address-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    setState({
      address: {
        ...state.address,
        landmark: document.querySelector('#landmark').value.trim(),
        neighborhood: document.querySelector('#neighborhood').value.trim(),
      },
      route: 'tier',
    });
  });
}

function renderTier() {
  return `
    <section class="screen">
      ${statusBar()}<button class="back" data-back="${state.subscription ? 'subscription' : 'address'}">← Retour</button>${state.subscription ? '' : steps(2)}${toast()}
      <div class="scroll page">
        <h1 class="title">Votre formule</h1>
        <p class="subtitle">Sans engagement. Le changement est enregistré immédiatement dans votre abonnement.</p>
        <div class="tier-grid">
          ${tiers
            .map(
              (tier) => `
                <button class="choice ${tier.code === state.tierCode ? 'on' : ''}" data-tier="${tier.code}">
                  <div class="choice-title"><span><strong>${money(tier.monthlyPriceMinor).replace(' XOF', '')}</strong> XOF/mois</span><span>${tier.code === state.tierCode ? '✓' : ''}</span></div>
                  <p>${tier.visitsPerCycle} visite${tier.visitsPerCycle > 1 ? 's' : ''}/mois · ${tier.description}</p>
                </button>
              `,
            )
            .join('')}
        </div>
        <button class="btn" id="tier-next" style="margin-top:24px">${state.subscription ? 'Appliquer la formule' : 'Continuer'}</button>
      </div>
    </section>
  `;
}

function bindTier() {
  app.querySelectorAll('[data-tier]').forEach((button) => {
    button.addEventListener('click', () => setState({ tierCode: button.dataset.tier }));
  });
  document.querySelector('#tier-next')?.addEventListener('click', async () => {
    if (!state.subscription) {
      go('schedule');
      return;
    }
    await run(async () => {
      await api(`/v1/subscriptions/${state.subscription.subscriptionId}/tier`, {
        body: {
          effectiveAt: new Date().toISOString(),
          subscriberUserId: state.subscription.subscriberId,
          tierCode: state.tierCode,
        },
        method: 'POST',
      });
      await refreshDetail();
      setState({ flash: { message: 'Formule mise à jour', type: 'ok' }, route: 'subscription' });
    });
  });
}

function renderSchedule() {
  const visit = state.subscription ? nextVisit() : null;
  return `
    <section class="screen">
      ${statusBar()}<button class="back" data-back="${state.subscription ? 'subscription' : 'tier'}">← Retour</button>${state.subscription ? '' : steps(3)}${toast()}
      <div class="scroll page">
        <h1 class="title">${state.subscription ? 'Reporter la prochaine visite' : 'Créneau habituel'}</h1>
        <p class="subtitle">${
          state.subscription
            ? visit
              ? `Prochaine visite actuelle: ${formatDate(visit.scheduledDate)} · ${windowLabel(visit.scheduledTimeWindow)}.`
              : 'Aucune visite planifiée à reporter pour le moment.'
            : 'Même jour et même fenêtre à chaque visite.'
        }</p>
        <form id="schedule-form">
          <div class="field">
            <label>Jour</label>
            <select id="day">${days.map(([value, label]) => `<option value="${value}" ${state.schedulePreference.dayOfWeek === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
          </div>
          <div class="option-list">
            ${windows
              .map(
                ([value, label, time]) => `
                  <button type="button" class="choice ${state.schedulePreference.timeWindow === value ? 'on' : ''}" data-window="${value}">
                    <div class="choice-title"><span>${label}</span><span>${time}</span></div>
                  </button>
                `,
              )
              .join('')}
          </div>
          <button class="btn" style="margin-top:24px" ${state.loading || (state.subscription && !visit) ? 'disabled' : ''}>${state.subscription ? 'Reporter cette visite' : 'Créer mon abonnement'}</button>
        </form>
      </div>
    </section>
  `;
}

function bindSchedule() {
  app.querySelectorAll('[data-window]').forEach((button) => {
    button.addEventListener('click', () => {
      setState({
        schedulePreference: { ...state.schedulePreference, timeWindow: button.dataset.window },
      });
    });
  });
  document.querySelector('#schedule-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const dayOfWeek = document.querySelector('#day').value;
    const schedulePreference = { ...state.schedulePreference, dayOfWeek };
    if (state.subscription) {
      const visit = nextVisit();
      if (!visit) return;
      await run(async () => {
        const scheduledDate = nextDateForDay(visit.scheduledDate, dayOfWeek);
        await api(
          `/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visit.visitId}/reschedule`,
          {
            body: {
              scheduledDate,
              scheduledTimeWindow: schedulePreference.timeWindow,
              subscriberUserId: state.subscription.subscriberId,
            },
            method: 'POST',
          },
        );
        setState({ schedulePreference });
        await refreshDetail();
        setState({
          flash: { message: `Visite reportée au ${formatDate(scheduledDate)}`, type: 'ok' },
          route: 'home',
        });
      });
      return;
    }

    await run(async () => {
      const subscription = await api('/v1/subscriptions', {
        body: {
          address: state.address,
          countryCode: 'TG',
          phoneNumber: state.phoneNumber,
          schedulePreference,
          tierCode: state.tierCode,
        },
        method: 'POST',
      });
      setState({
        schedulePreference,
        subscription,
      });
      await refreshDetail(subscription.subscriptionId);
      setState({ route: 'home' });
    });
  });
}

function renderHome() {
  const detail = state.detail;
  const visit = nextVisit();
  const worker = detail?.assignedWorker;
  const displayName = subscriberDisplayName();
  const initialsText = initials(displayName);
  return `
    <section class="screen">
      ${statusBar()}${toast()}
      <div class="header">
        <div><div class="subtitle" style="margin:0">Bonjour,</div><h1 style="font-size:22px;margin:0">${escapeHtml(displayName)}</h1></div>
        <button class="icon-btn" data-go="profile">${escapeHtml(initialsText)}</button>
      </div>
      <div class="scroll">
        <div style="padding:0 16px 16px">
          <div class="hero">
            <span class="pill muted">${statusLabel(detail?.status)}</span>
            <h1>${visit ? `${formatDate(visit.scheduledDate)}<br />${windowLabel(visit.scheduledTimeWindow)}` : 'Aucune visite planifiée'}</h1>
            ${
              worker
                ? `<div class="worker-row"><div class="avatar">${initials(worker.displayName)}</div><div style="flex:1"><strong>${escapeHtml(worker.displayName)}</strong><br /><span style="color:rgb(255 253 248 / 55%);font-size:13px">${workerQualityLabel(worker)}</span></div><span class="pill ok">Confirmée</span></div>`
                : `<p style="color:rgb(255 253 248 / 60%);line-height:1.55;margin:0 0 18px">Votre laveuse sera attribuée par l'équipe Washed.</p>`
            }
            <div class="split" style="margin-top:18px">
              <button class="btn secondary" id="reschedule-next" ${visit ? '' : 'disabled'}>Reporter</button>
              <button class="btn danger" id="skip-next" ${visit ? '' : 'disabled'}>Sauter</button>
            </div>
            <button class="btn secondary" id="dispute-next" style="margin-top:8px" ${visit ? '' : 'disabled'}>Signaler un problème</button>
          </div>
        </div>
        <div style="padding:0 16px 16px">
          ${supportCreditCard(detail)}
        </div>
        <div style="padding:0 16px 16px">
          ${paymentStatusCard(detail, state.paymentAttempt)}
        </div>
        <div style="padding:0 16px 16px">
          ${paymentMethodCard(state.paymentMethod)}
        </div>
        <div style="padding:0 16px 16px">
          ${billingHistoryCard(state.billingHistory)}
        </div>
        <div style="padding:0 16px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <strong>Visites · ${escapeHtml(detail?.tierCode ?? state.tierCode)}</strong>
            <button class="back" style="padding:0" id="refresh-detail">Actualiser</button>
          </div>
          ${
            detail?.upcomingVisits?.length
              ? `<div class="visit-list">${detail.upcomingVisits
                  .map(
                    (item, index) => `
                      <div class="visit-tile ${index === 0 ? 'next' : ''}">
                        <div style="color:var(--muted);font-size:11px">${monthLabel(item.scheduledDate)}</div>
                        <strong style="color:${index === 0 ? 'var(--p)' : 'var(--dark)'}">${dayLabel(item.scheduledDate)}</strong>
                      </div>
                    `,
                  )
                  .join('')}</div>`
              : `<div class="card empty">Les prochaines visites apparaîtront ici après affectation.</div>`
          }
        </div>
        <div style="padding:0 16px 24px">
          ${
            detail?.recentVisits?.length
              ? `<div style="margin-bottom:12px"><strong>Activité récente</strong></div>
                <div class="option-list" style="margin-bottom:16px">
                  ${detail.recentVisits
                    .map(
                      (item) => `
                        <div class="choice">
                          <div class="choice-title"><span>${formatDate(item.scheduledDate)}</span><span>${statusLabel(item.status)}</span></div>
                          <p>${windowLabel(item.scheduledTimeWindow)} · Worker ${escapeHtml(item.workerId?.slice(0, 8) ?? 'non assigné')}</p>
                          ${
                            item.status === 'completed' || item.status === 'disputed'
                              ? `<div class="split" style="margin-top:12px">
                                  <button class="btn secondary" data-rate-visit="${item.visitId}">Noter 5★</button>
                                  <button class="btn danger" data-dispute-visit="${item.visitId}">Signaler</button>
                                </div>`
                              : ''
                          }
                        </div>
                      `,
                    )
                    .join('')}
                </div>`
              : ''
          }
          <div class="card">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
              <div><div class="subtitle" style="margin:0">Abonnement</div><strong>${money(detail?.monthlyPriceMinor ?? selectedTier().monthlyPriceMinor)} · ${detail?.visitsPerCycle ?? selectedTier().visitsPerCycle} visite(s)/mois</strong></div>
              <button class="btn secondary" style="width:auto" data-go="subscription">Gérer</button>
            </div>
          </div>
        </div>
      </div>
      ${tabbar('home')}
    </section>
  `;
}

function bindHome() {
  document.querySelector('#refresh-detail')?.addEventListener('click', () => refreshDetail());
  document
    .querySelector('#pay-subscription')
    ?.addEventListener('click', () => chargeSubscription('succeeded'));
  document.querySelector('#link-payment-method')?.addEventListener('click', linkPaymentMethod);
  document.querySelector('#skip-next')?.addEventListener('click', async () => {
    const visit = nextVisit();
    if (!visit) return;
    await run(async () => {
      await api(
        `/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visit.visitId}/skip`,
        {
          body: { subscriberUserId: state.subscription.subscriberId },
          method: 'POST',
        },
      );
      await refreshDetail();
      setState({ flash: { message: 'Visite sautée', type: 'ok' } });
    });
  });
  document.querySelector('#reschedule-next')?.addEventListener('click', async () => {
    const visit = nextVisit();
    if (!visit) return;
    const scheduledDate = nextDay(visit.scheduledDate);
    await run(async () => {
      await api(
        `/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visit.visitId}/reschedule`,
        {
          body: {
            scheduledDate,
            scheduledTimeWindow: visit.scheduledTimeWindow === 'morning' ? 'afternoon' : 'morning',
            subscriberUserId: state.subscription.subscriberId,
          },
          method: 'POST',
        },
      );
      await refreshDetail();
      setState({
        flash: { message: `Visite reportée au ${formatDate(scheduledDate)}`, type: 'ok' },
      });
    });
  });
  document.querySelector('#dispute-next')?.addEventListener('click', async () => {
    const visit = nextVisit();
    if (!visit) return;
    await run(async () => {
      await api(
        `/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visit.visitId}/disputes`,
        {
          body: {
            createdAt: new Date().toISOString(),
            description: 'Signalement depuis l app abonne.',
            issueType: 'other',
            subscriberUserId: state.subscription.subscriberId,
          },
          method: 'POST',
        },
      );
      await refreshDetail();
      setState({ flash: { message: 'Signalement transmis au support', type: 'ok' } });
    });
  });
  app.querySelectorAll('[data-rate-visit]').forEach((button) => {
    button.addEventListener('click', () => rateVisit(button.dataset.rateVisit));
  });
  app.querySelectorAll('[data-dispute-visit]').forEach((button) => {
    button.addEventListener('click', () => disputeVisit(button.dataset.disputeVisit));
  });
}

async function rateVisit(visitId) {
  if (!state.subscription || !visitId) return;
  await run(async () => {
    await api(`/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visitId}/rating`, {
      body: {
        comment: 'Service note depuis l app abonne.',
        createdAt: new Date().toISOString(),
        rating: 5,
        subscriberUserId: state.subscription.subscriberId,
      },
      method: 'POST',
    });
    await refreshDetail();
    setState({ flash: { message: 'Merci pour votre note', type: 'ok' } });
  });
}

async function disputeVisit(visitId) {
  if (!state.subscription || !visitId) return;
  await run(async () => {
    await api(`/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visitId}/disputes`, {
      body: {
        createdAt: new Date().toISOString(),
        description: 'Signalement depuis l app abonne.',
        issueType: 'other',
        subscriberUserId: state.subscription.subscriberId,
      },
      method: 'POST',
    });
    await refreshDetail();
    setState({ flash: { message: 'Signalement transmis au support', type: 'ok' } });
  });
}

function renderSubscription() {
  const detail = state.detail;
  return `
    <section class="screen">
      ${statusBar()}${toast()}
      <div class="scroll page">
        <h1 class="title">Mon abonnement</h1>
        <div class="hero" style="margin-bottom:16px">
          <span class="pill muted">${statusLabel(detail?.status)}</span>
          <h1>${escapeHtml(detail?.tierCode ?? state.tierCode)} · ${money(detail?.monthlyPriceMinor ?? selectedTier().monthlyPriceMinor)}</h1>
          <p style="color:rgb(255 253 248 / 60%);line-height:1.55">${detail?.visitsPerCycle ?? selectedTier().visitsPerCycle} visite(s)/mois · ${escapeHtml(dayName(detail?.schedulePreference?.dayOfWeek ?? state.schedulePreference.dayOfWeek))} · ${windowLabel(detail?.schedulePreference?.timeWindow ?? state.schedulePreference.timeWindow)}</p>
        </div>
        ${supportCreditCard(detail)}
        ${paymentStatusCard(detail, state.paymentAttempt)}
        ${paymentMethodCard(state.paymentMethod)}
        <div class="option-list">
          <button class="choice" data-go="tier"><div class="choice-title"><span>Changer de formule</span><span>→</span></div><p>T1 ou T2 selon vos besoins.</p></button>
          <button class="choice" data-go="schedule"><div class="choice-title"><span>Modifier le créneau</span><span>→</span></div><p>Préférence utilisée pour les prochaines affectations.</p></button>
          <button class="choice" id="request-worker-swap"><div class="choice-title"><span>Changer de laveuse</span><span>→</span></div><p>Jusqu'à 2 demandes par trimestre, traitées par l'équipe opérations.</p></button>
          <button class="choice" id="cancel-subscription"><div class="choice-title"><span style="color:var(--red)">Résilier l'abonnement</span><span>→</span></div><p>Les visites planifiées restantes seront annulées.</p></button>
        </div>
      </div>
      ${tabbar('subscription')}
    </section>
  `;
}

function bindSubscription() {
  document
    .querySelector('#pay-subscription')
    ?.addEventListener('click', () => chargeSubscription('succeeded'));
  document.querySelector('#link-payment-method')?.addEventListener('click', linkPaymentMethod);
  document.querySelector('#request-worker-swap')?.addEventListener('click', requestWorkerSwap);
  document.querySelector('#cancel-subscription')?.addEventListener('click', async () => {
    if (!state.subscription) return;
    await run(async () => {
      await api(`/v1/subscriptions/${state.subscription.subscriptionId}/cancel`, {
        body: {
          cancelledAt: new Date().toISOString(),
          subscriberUserId: state.subscription.subscriberId,
        },
        method: 'POST',
      });
      await refreshDetail();
      setState({ flash: { message: 'Abonnement résilié', type: 'ok' }, route: 'subscription' });
    });
  });
}

async function requestWorkerSwap() {
  if (!state.subscription) return;
  await run(async () => {
    await api(`/v1/subscriptions/${state.subscription.subscriptionId}/worker-swap-requests`, {
      body: {
        reason: 'Demande de changement de laveuse depuis l app abonne.',
        requestedAt: new Date().toISOString(),
        subscriberUserId: state.subscription.subscriberId,
      },
      method: 'POST',
    });
    setState({
      flash: { message: 'Demande envoyée aux opérations', type: 'ok' },
      route: 'subscription',
    });
  });
}

function paymentStatusCard(detail, paymentAttempt) {
  const overdue = detail?.status === 'payment_overdue';
  const disabled = !state.subscription || state.loading || detail?.status === 'cancelled';
  return `
    <div class="card payment-card ${overdue ? 'overdue' : ''}">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <div class="subtitle" style="margin:0">Paiement</div>
          <strong>${money(detail?.monthlyPriceMinor ?? selectedTier().monthlyPriceMinor)}</strong>
          <p class="empty" style="margin:4px 0 0">${paymentAttempt ? paymentAttemptLabel(paymentAttempt) : overdue ? 'Paiement requis pour réactiver les visites.' : 'Votre abonnement est à jour.'}</p>
        </div>
        <span class="pill ${overdue ? 'danger' : 'ok'}">${overdue ? 'À régler' : 'OK'}</span>
      </div>
      <button class="btn ${overdue ? '' : 'secondary'}" id="pay-subscription" style="margin-top:14px" ${disabled ? 'disabled' : ''}>${overdue ? 'Régulariser' : 'Payer maintenant'}</button>
    </div>
  `;
}

function paymentMethodCard(paymentMethod) {
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <div class="subtitle" style="margin:0">Moyen de paiement</div>
          <strong>${paymentMethod ? `${escapeHtml(paymentMethod.provider)} · ${escapeHtml(paymentMethod.accountLabel)}` : 'Non lié'}</strong>
          <p class="empty" style="margin:4px 0 0">${paymentMethod ? `Sandbox lié le ${new Date(paymentMethod.linkedAt).toLocaleDateString('fr-FR')}` : 'Ajoutez T-Money ou Flooz avant le lancement payant.'}</p>
        </div>
        <span class="pill ${paymentMethod ? 'ok' : 'muted'}">${paymentMethod ? 'Lié' : 'Sandbox'}</span>
      </div>
      <button class="btn secondary" id="link-payment-method" style="margin-top:14px" ${state.loading ? 'disabled' : ''}>${paymentMethod ? 'Changer' : 'Lier sandbox'}</button>
    </div>
  `;
}

function supportCreditCard(detail) {
  const credits = detail?.supportCredits ?? [];
  if (!credits.length) return '';
  const total = credits.reduce((sum, credit) => sum + Number(credit.amount.amountMinor), 0);
  return `
    <div class="card credit-card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <div class="subtitle" style="margin:0">Crédits support</div>
          <strong>${money(String(total))}</strong>
          <p class="empty" style="margin:4px 0 0">${escapeHtml(credits[0].reason)}</p>
        </div>
        <span class="pill ok">${credits.length}</span>
      </div>
    </div>
  `;
}

function billingHistoryCard(items = []) {
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px">
        <div>
          <div class="subtitle" style="margin:0">Reçus</div>
          <strong>Historique</strong>
        </div>
        <span class="pill muted">${items.length}</span>
      </div>
      ${
        items.length
          ? items
              .slice(0, 4)
              .map(
                (item) => `
                  <div class="row between" style="align-items:flex-start;border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
                    <div>
                      <strong>${escapeHtml(billingItemLabel(item))}</strong><br>
                      <span class="empty">${new Date(item.occurredAt).toLocaleDateString('fr-FR')} · ${escapeHtml(item.provider)}</span>
                    </div>
                    <div style="text-align:right">
                      <strong>${item.itemType === 'refund' ? '-' : ''}${money(item.amount.amountMinor)}</strong><br>
                      <span class="pill ${item.status === 'failed' ? 'danger' : 'ok'}">${escapeHtml(billingStatusLabel(item.status))}</span>
                    </div>
                  </div>
                `,
              )
              .join('')
          : `<p class="empty" style="margin:0">Les paiements et remboursements apparaîtront ici.</p>`
      }
    </div>
  `;
}

async function chargeSubscription(mockOutcome) {
  if (!state.subscription) return;
  await run(async () => {
    const paymentAttempt = await api(
      `/v1/subscriptions/${state.subscription.subscriptionId}/mock-charge`,
      {
        body: {
          chargedAt: new Date().toISOString(),
          idempotencyKey: crypto.randomUUID(),
          mockOutcome,
          operatorUserId: crypto.randomUUID(),
        },
        method: 'POST',
      },
    );
    setState({ paymentAttempt });
    await refreshDetail();
    setState({
      flash: {
        message:
          paymentAttempt.status === 'succeeded'
            ? 'Paiement enregistré'
            : 'Paiement refusé, abonnement en retard',
        type: paymentAttempt.status === 'succeeded' ? 'ok' : 'error',
      },
    });
  });
}

async function linkPaymentMethod() {
  await run(async () => {
    setState({
      paymentMethod: {
        accountLabel: state.phoneNumber.slice(-4).padStart(state.phoneNumber.length, '•'),
        linkedAt: new Date().toISOString(),
        provider: 'mobile_money_sandbox',
      },
      flash: { message: 'Moyen de paiement sandbox lié', type: 'ok' },
    });
  });
}

function renderProfile() {
  const displayName = subscriberDisplayName();
  const initialsText = initials(displayName);
  return `
    <section class="screen">
      ${statusBar()}
      <div class="scroll page">
        <div class="hero" style="text-align:center;margin-bottom:16px">
          <div class="avatar" style="margin:0 auto 12px;background:var(--p);color:var(--white)">${escapeHtml(initialsText)}</div>
          <h1 style="margin:0 0 6px">${escapeHtml(displayName)}</h1>
          <p style="color:rgb(255 253 248 / 55%);margin:0">${escapeHtml(state.phoneNumber)}</p>
        </div>
        <div class="card" style="margin-bottom:12px"><div class="subtitle" style="margin:0">Adresse</div><strong>${escapeHtml(state.address.neighborhood)}</strong><p class="empty" style="margin:4px 0 0">${escapeHtml(state.address.landmark || 'Repère non renseigné')}</p></div>
        ${paymentMethodCard(state.paymentMethod)}
        <button class="btn secondary" id="reset-app">Réinitialiser</button>
      </div>
      ${tabbar('profile')}
    </section>
  `;
}

function renderSupport() {
  const detail = state.detail;
  return `
    <section class="screen">
      ${statusBar()}${toast()}
      <div class="scroll page">
        <h1 class="title">Messages support</h1>
        <p class="subtitle">Retrouvez les litiges, crédits et derniers échanges avec Washed.</p>
        ${supportCreditCard(detail)}
        <div class="card" style="margin-bottom:12px">
          <div class="subtitle" style="margin:0">Support</div>
          <strong>Besoin d'aide ?</strong>
          <p class="empty" style="margin:4px 0 12px">Envoyez un signalement depuis votre prochaine visite ou demandez un rappel.</p>
          <button class="btn" id="support-contact">Demander un rappel</button>
        </div>
        <div class="card">
          <div class="subtitle" style="margin:0">Historique</div>
          ${
            detail?.recentVisits?.length
              ? detail.recentVisits
                  .slice(0, 5)
                  .map(
                    (visit) => `
                      <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px">
                        <strong>${escapeHtml(statusLabel(visit.status))}</strong>
                        <p class="empty" style="margin:4px 0 0">${formatDate(visit.scheduledDate)} · ${windowLabel(visit.scheduledTimeWindow)}</p>
                      </div>
                    `,
                  )
                  .join('')
              : '<p class="empty">Aucun message support pour le moment.</p>'
          }
        </div>
      </div>
      ${tabbar('support')}
    </section>
  `;
}

function bindSupport() {
  document.querySelector('#support-contact')?.addEventListener('click', async () => {
    const visit = nextVisit() ?? state.detail?.recentVisits?.[0];
    if (!state.subscription || !visit) {
      setState({
        flash: { message: 'Aucune visite disponible pour rattacher le support', type: 'error' },
      });
      return;
    }

    await run(async () => {
      await api(
        `/v1/subscriptions/${state.subscription.subscriptionId}/visits/${visit.visitId}/disputes`,
        {
          body: {
            createdAt: new Date().toISOString(),
            description: 'Demande de rappel support depuis l app abonne.',
            issueType: 'other',
            subscriberUserId: state.subscription.subscriberId,
          },
          method: 'POST',
        },
      );
      await refreshDetail();
      setState({ flash: { message: 'Demande transmise au support', type: 'ok' } });
    });
  });
}

function bindProfile() {
  document.querySelector('#link-payment-method')?.addEventListener('click', linkPaymentMethod);
  document.querySelector('#reset-app')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function tabbar(active) {
  const tabs = [
    ['home', '⌂', 'Accueil'],
    ['subscription', '≡', 'Abonnem.'],
    ['support', '●', 'Messages'],
    ['profile', '◉', 'Profil'],
  ];
  return `<nav class="tabbar">${tabs.map(([route, icon, label]) => `<button class="tab ${active === route || (active === 'profile' && route === 'profile') ? 'on' : ''}" data-go="${route}"><span class="tab-icon">${icon}</span>${label}</button>`).join('')}</nav>`;
}

async function refreshDetail(subscriptionId = state.subscription?.subscriptionId) {
  if (!subscriptionId) return;
  const [detail, billing] = await Promise.all([
    api(`/v1/subscriptions/${subscriptionId}`),
    api(`/v1/subscriptions/${subscriptionId}/billing-history?limit=10`),
  ]);
  setState({
    billingHistory: billing.items,
    detail,
    tierCode: detail.tierCode,
  });
}

async function run(action) {
  setState({ flash: null, loading: true });
  try {
    await action();
  } catch (error) {
    setState({
      flash: {
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        type: 'error',
      },
    });
  } finally {
    state.loading = false;
    render();
  }
}

async function api(path, options = {}) {
  const authToken = options.authToken ?? state.auth?.accessToken;
  const response = await fetch(`/api${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      'content-type': 'application/json',
      ...(authToken === undefined ? {} : { authorization: `Bearer ${authToken}` }),
    },
    method: options.method ?? 'GET',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? `HTTP ${response.status}`);
  }
  return data;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function dayLabel(value) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function nextDay(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function nextDateForDay(value, dayOfWeek) {
  const targetIndex = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }[dayOfWeek];
  const date = new Date(`${value}T00:00:00.000Z`);
  const currentIndex = date.getUTCDay();
  const daysUntilTarget = (targetIndex - currentIndex + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilTarget);
  return date.toISOString().slice(0, 10);
}

function windowLabel(value) {
  return value === 'afternoon' ? 'Après-midi' : 'Matin';
}

function dayName(value) {
  return days.find(([day]) => day === value)?.[1] ?? value;
}

function statusLabel(value) {
  const labels = {
    active: 'ACTIF',
    cancelled: 'RÉSILIÉ',
    completed: 'TERMINÉE',
    disputed: 'LITIGE',
    in_progress: 'EN COURS',
    no_show: 'ABSENCE',
    paused: 'EN PAUSE',
    payment_overdue: 'PAIEMENT EN RETARD',
    pending_match: 'AFFECTATION EN COURS',
    scheduled: 'PLANIFIÉE',
  };
  return labels[value] ?? 'NOUVEL ABONNEMENT';
}

function paymentAttemptLabel(attempt) {
  const chargedAt = new Date(attempt.chargedAt).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return attempt.status === 'succeeded' ? `Payé le ${chargedAt}` : `Refusé le ${chargedAt}`;
}

function billingItemLabel(item) {
  if (item.itemType === 'refund')
    return item.reason ? `Remboursement · ${item.reason}` : 'Remboursement';
  return item.status === 'succeeded' ? 'Paiement abonnement' : 'Paiement refusé';
}

function billingStatusLabel(status) {
  const labels = {
    failed: 'refusé',
    issued: 'remboursé',
    succeeded: 'payé',
  };
  return labels[status] ?? status;
}

function workerQualityLabel(worker) {
  const rating =
    worker.averageRating === null ? 'Nouveau profil' : `${worker.averageRating.toFixed(1)}/5`;
  return `${rating} · ${worker.completedVisitCount ?? 0} visite(s) · ${worker.disputeCount ?? 0} litige(s)`;
}

function subscriberDisplayName() {
  const suffix = state.phoneNumber.slice(-4);
  return suffix ? `Client ${suffix}` : 'Abonné Washed';
}

function initials(value) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function waveIcon() {
  return `
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <path d="M5 14c6-6 10 6 16 0s10-10 18-4" stroke="var(--white)" stroke-width="3" stroke-linecap="round"/>
      <path d="M5 21c6-6 10 6 16 0s10-10 18-4" stroke="var(--white)" stroke-width="3" stroke-linecap="round"/>
      <path d="M5 28c6-6 10 6 16 0s10-10 18-4" stroke="var(--white)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}
