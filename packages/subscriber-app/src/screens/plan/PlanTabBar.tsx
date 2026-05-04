import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

// Bottom-nav tab bar for the X-19 / X-19.R plan screens. Forfait is active
// here; reuses the .hub-nav class so the visual treatment is shared with
// the hub and history surfaces.
export function PlanTabBar(): ReactElement {
  const navigate = useNavigate();
  return (
    <nav className="hub-nav" aria-label="Navigation principale">
      <button className="hub-nav-item" type="button" onClick={() => navigate('/hub')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.home')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/history')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.visits')}
      </button>
      <button className="hub-nav-item active" type="button" aria-current="page">
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.plan')}
      </button>
      <button className="hub-nav-item" type="button" disabled>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.profile')}
      </button>
    </nav>
  );
}
