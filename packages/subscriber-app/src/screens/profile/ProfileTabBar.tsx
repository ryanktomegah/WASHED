import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

// Bottom-nav tab bar for X-24 / X-19.R-style screens that live in the
// profile slice. Profil is active here. Mirrors PlanTabBar — the .hub-nav
// classes are shared across hub, history, plan, and profile.
export function ProfileTabBar(): ReactElement {
  const navigate = useNavigate();
  return (
    <nav className="hub-nav" aria-label={translate('common.navigation.main')}>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/hub')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.home')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/history')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.visits')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/plan')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.plan')}
      </button>
      <button className="hub-nav-item active" type="button" aria-current="page">
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.profile')}
      </button>
    </nav>
  );
}
