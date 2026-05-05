import { type ReactElement } from 'react';
import { CalendarDays, Home, UserRound, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

export function HubTabBar(): ReactElement {
  const navigate = useNavigate();
  return (
    <nav className="hub-nav" aria-label={translate('common.navigation.main')}>
      <button aria-current="page" className="hub-nav-item active" type="button">
        <Home aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.home')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/history')}>
        <CalendarDays aria-hidden="true" className="hub-nav-glyph" />
        {translate('subscriber.dashboard.tab.visits')}
      </button>
      <button className="hub-nav-item" type="button" onClick={() => navigate('/plan')}>
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
