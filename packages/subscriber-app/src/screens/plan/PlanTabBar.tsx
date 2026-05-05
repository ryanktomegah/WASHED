import { type ReactElement } from 'react';
import { CalendarDays, Home, UserRound, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

export function PlanTabBar({
  activeItem = 'plan',
}: {
  readonly activeItem?: 'home' | 'plan';
} = {}): ReactElement {
  const navigate = useNavigate();
  return (
    <nav className="hub-nav" aria-label={translate('common.navigation.main')}>
      <button
        aria-current={activeItem === 'home' ? 'page' : undefined}
        className={activeItem === 'home' ? 'hub-nav-item active' : 'hub-nav-item'}
        type="button"
        onClick={() => navigate('/hub')}
      >
        <Home aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.home')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/history')}>
        <CalendarDays aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.visits')}
      </button>
      <button
        aria-current={activeItem === 'plan' ? 'page' : undefined}
        className={activeItem === 'plan' ? 'hub-nav-item active' : 'hub-nav-item'}
        type="button"
        onClick={() => navigate('/plan')}
      >
        <WalletCards aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.plan')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/profile')}>
        <UserRound aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.profile')}
      </button>
    </nav>
  );
}
