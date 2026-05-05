import { ChevronLeft } from 'lucide-react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

export function OnboardingBackButton({ to }: { readonly to: string }): ReactElement {
  const navigate = useNavigate();

  return (
    <button
      aria-label={translate('common.action.back')}
      className="onboarding-back"
      onClick={() => navigate(to)}
      type="button"
    >
      <ChevronLeft aria-hidden="true" />
    </button>
  );
}
