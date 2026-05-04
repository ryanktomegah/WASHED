import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

// Bottom-nav tab bar for plan-family screens; reuses the .hub-nav class so
// the visual treatment is shared with the hub and history surfaces.
export function PlanTabBar({
  activeItem = 'plan',
}: {
  readonly activeItem?: 'home' | 'plan';
} = {}): ReactElement {
  const navigate = useNavigate();
  return (
    <nav className="hub-nav" aria-label="Navigation principale">
      <button
        aria-current={activeItem === 'home' ? 'page' : undefined}
        className={activeItem === 'home' ? 'hub-nav-item active' : 'hub-nav-item'}
        type="button"
        onClick={() => navigate('/hub')}
      >
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.home')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/history')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.visits')}
      </button>
      <button
        aria-current={activeItem === 'plan' ? 'page' : undefined}
        className={activeItem === 'plan' ? 'hub-nav-item active' : 'hub-nav-item'}
        type="button"
        onClick={() => navigate('/plan')}
      >
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.plan')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/profile')}>
        <span aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.profile')}
      </button>
    </nav>
  );
}
