import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { useSubscriberSubscription } from '../../subscription/SubscriberSubscriptionContext.js';
import { OnboardingBackButton } from './OnboardingBackButton.js';
import { useSignup } from './SignupContext.js';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 24;

function maskPhone(phone: string): string {
  const groups = phone.split(' ');
  if (groups.length < 5) return phone;
  return [groups[0], groups[1], '••••', groups[4]].join(' ');
}

function formatTimer(seconds: number): string {
  return `0:${seconds.toString().padStart(2, '0')} s`;
}

export function OtpX03(): ReactElement {
  const navigate = useNavigate();
  const subscriberApi = useSubscriberApi();
  const { syncFromApi } = useSubscriberSubscription();
  const signup = useSignup();

  useEffect(() => {
    if (signup.phone === '') navigate('/signup/phone', { replace: true });
    if (subscriberApi.isConfigured && signup.otpChallengeId === '') {
      navigate('/signup/phone', { replace: true });
    }
  }, [signup.phone, signup.otpChallengeId, subscriberApi.isConfigured, navigate]);

  const phone = signup.phone;
  const maskedPhone = useMemo(() => maskPhone(phone), [phone]);
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const isVerifyingRef = useRef(false);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const cellRefs = useRef<(HTMLInputElement | null)[]>(
    Array<HTMLInputElement | null>(OTP_LENGTH).fill(null),
  );

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  const allFilled = digits.every((cell) => cell !== '');

  useEffect(() => {
    if (!allFilled) return;
    if (subscriberApi.isConfigured) {
      if (signup.otpChallengeId === '' || isVerifyingRef.current) return;

      let cancelled = false;
      setError(null);
      isVerifyingRef.current = true;
      void subscriberApi
        .verifyOtp({
          challengeId: signup.otpChallengeId,
          code: digits.join(''),
        })
        .then(async () => {
          if (signup.mode === 'existing') {
            const current = await subscriberApi.getCurrentSubscription();
            if (!cancelled) syncFromApi(current.subscription);
          }
          if (!cancelled) navigate(signup.mode === 'existing' ? '/hub' : '/signup/identity');
        })
        .catch(() => {
          if (!cancelled) {
            setDigits(Array<string>(OTP_LENGTH).fill(''));
            setError(translate('error.server.body'));
          }
        })
        .finally(() => {
          if (!cancelled) isVerifyingRef.current = false;
        });

      return () => {
        cancelled = true;
        isVerifyingRef.current = false;
      };
    }

    const timeout = window.setTimeout(
      () => navigate(signup.mode === 'existing' ? '/hub' : '/signup/identity'),
      320,
    );
    return () => window.clearTimeout(timeout);
  }, [
    allFilled,
    digits,
    navigate,
    signup.mode,
    signup.otpChallengeId,
    subscriberApi,
    syncFromApi,
  ]);

  const focusCell = (index: number): void => {
    const target = cellRefs.current[index];
    target?.focus();
    target?.select();
  };

  const writeDigit = (index: number, digit: string): void => {
    setDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
  };

  const onCellChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '');
    if (value.length === 0) {
      writeDigit(index, '');
      return;
    }
    if (value.length === 1) {
      writeDigit(index, value);
      if (index < OTP_LENGTH - 1) focusCell(index + 1);
      return;
    }
    // Multi-character input (paste fallback) — fan out across cells.
    fanOutPaste(index, value);
  };

  const fanOutPaste = (start: number, value: string): void => {
    const trimmed = value.slice(0, OTP_LENGTH - start);
    setDigits((current) => {
      const next = [...current];
      for (let offset = 0; offset < trimmed.length; offset += 1) {
        next[start + offset] = trimmed[offset] ?? '';
      }
      return next;
    });
    const nextFocus = Math.min(OTP_LENGTH - 1, start + trimmed.length);
    focusCell(nextFocus);
  };

  const onPaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted.length === 0) return;
    event.preventDefault();
    fanOutPaste(index, pasted);
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      writeDigit(index - 1, '');
      focusCell(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusCell(index - 1);
      return;
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusCell(index + 1);
    }
  };

  const onResend = (): void => {
    setDigits(Array<string>(OTP_LENGTH).fill(''));
    setError(null);
    setSecondsRemaining(RESEND_SECONDS);
    focusCell(0);
  };

  if (signup.phone === '') return <></>;

  return (
    <main aria-labelledby="x03-headline" className="onboarding-screen" data-screen-id="X-03">
      <div className="body">
        <OnboardingBackButton to="/signup/phone" />
        <div className="title-stack no-progress">
          <div aria-hidden="true" className="steps">
            <i className="on" />
            <i className="on" />
            <i />
            <i />
            <i />
          </div>
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', { current: 2, total: 5 })}
          </span>
          <h1 className="h-md" id="x03-headline">
            {translate('subscriber.signup.otp.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.otp.body', { phone: maskedPhone })}</p>
        </div>

        <div aria-label={translate('subscriber.signup.otp.title')} className="otp-row" role="group">
          {digits.map((digit, index) => (
            <input
              aria-label={translate('subscriber.signup.otp.digit_label', {
                index: index + 1,
              })}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              className={`otp-cell${digit !== '' ? ' filled' : ''}`}
              inputMode="numeric"
              key={index}
              maxLength={index === 0 ? OTP_LENGTH : 1}
              onChange={onCellChange(index)}
              onKeyDown={onKeyDown(index)}
              onPaste={onPaste(index)}
              ref={(element) => {
                cellRefs.current[index] = element;
              }}
              type="text"
              value={digit}
            />
          ))}
        </div>

        <p className="p-sm otp-resend-line">
          {secondsRemaining > 0 ? (
            <>
              {translate('subscriber.signup.otp.resend', { timer: formatTimer(secondsRemaining) })}
            </>
          ) : (
            <button className="link" onClick={onResend} type="button">
              {translate('subscriber.signup.otp.resend_now.cta')}
            </button>
          )}{' '}
          ·{' '}
          <a className="link" href="tel:+22890000000">
            {translate('subscriber.signup.otp.call_office.cta')}
          </a>
        </p>

        {error === null ? null : (
          <p className="notice" role="alert">
            {error}
          </p>
        )}

        <div className="grow" />
      </div>
    </main>
  );
}
