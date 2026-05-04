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
import { CoreApiError } from '@washed/api-client';

import { useBackend } from '../../backend/BackendContext.js';
import { useSignup } from './SignupContext.js';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskPhone(phone: string): string {
  // "+228 90 12 34 56" → "+228 90 ●● ●● 56" (mask middle pairs)
  const groups = phone.split(' ');
  if (groups.length < 5) return phone;
  return [groups[0], groups[1], '●●', '●●', groups[4]].join(' ');
}

export function OtpX03(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const backend = useBackend();

  useEffect(() => {
    if (signup.phone === '') navigate('/signup/phone', { replace: true });
  }, [signup.phone, navigate]);

  const phone = signup.phone;
  const challengeId = signup.otpChallenge?.challengeId;
  const maskedPhone = useMemo(() => maskPhone(phone), [phone]);
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(''));
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const cellRefs = useRef<(HTMLInputElement | null)[]>(
    Array<HTMLInputElement | null>(OTP_LENGTH).fill(null),
  );

  useEffect(() => {
    cellRefs.current[0]?.focus();
  }, []);

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

    if (!backend.liveBackendEnabled || challengeId === undefined) {
      const timeout = window.setTimeout(() => navigate('/signup/address'), 320);
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    setVerifyError(null);
    void (async () => {
      try {
        await backend.auth.verifyOtp({ challengeId, code: digits.join('') });
        if (cancelled) return;
        navigate('/signup/address');
      } catch (caught) {
        if (cancelled) return;
        const message =
          caught instanceof CoreApiError && caught.status === 401
            ? 'Code incorrect. Réessayez.'
            : translate('error.network.body');
        setVerifyError(message);
        setDigits(Array<string>(OTP_LENGTH).fill(''));
        cellRefs.current[0]?.focus();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allFilled, backend, challengeId, digits, navigate]);

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

  const onResend = async (): Promise<void> => {
    setDigits(Array<string>(OTP_LENGTH).fill(''));
    setSecondsRemaining(RESEND_SECONDS);
    setVerifyError(null);
    focusCell(0);

    if (!backend.liveBackendEnabled || phone === '') return;
    try {
      const challenge = await backend.auth.startOtp(phone);
      signup.setOtpChallenge(challenge);
    } catch {
      setVerifyError(translate('error.network.body'));
    }
  };

  const onEditPhone = (): void => {
    navigate('/signup/phone');
  };

  if (signup.phone === '') return <></>;

  return (
    <main aria-labelledby="x03-headline" className="onboarding-screen" data-screen-id="X-03">
      <div className="body">
        <div className="title-stack">
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', 'fr', { current: 2, total: 4 })}
          </span>
          <h1 className="h-md" id="x03-headline">
            {translate('subscriber.signup.otp.title')}
          </h1>
          <p className="p">
            {translate('subscriber.signup.otp.body', 'fr', { phone: maskedPhone })}{' '}
            <button className="link" onClick={onEditPhone} type="button">
              Modifier
            </button>
          </p>
        </div>

        <div aria-label={translate('subscriber.signup.otp.title')} className="otp-row" role="group">
          {digits.map((digit, index) => (
            <input
              aria-label={`Chiffre ${index + 1}`}
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

        <p className="p-sm">
          {secondsRemaining > 0 ? (
            <>{translate('subscriber.signup.otp.resend', 'fr', { seconds: secondsRemaining })}</>
          ) : (
            <button
              className="link"
              onClick={() => {
                void onResend();
              }}
              type="button"
            >
              Renvoyer le code
            </button>
          )}
        </p>

        {verifyError === null ? null : (
          <p className="p-sm" role="alert" style={{ color: 'var(--danger)' }}>
            {verifyError}
          </p>
        )}

        <div className="grow" />

        <p className="p-sm footer-hint">
          Pas reçu après 30 s ?{' '}
          <a className="link" href="tel:+22890000000">
            Appeler le bureau
          </a>
        </p>
      </div>
    </main>
  );
}
