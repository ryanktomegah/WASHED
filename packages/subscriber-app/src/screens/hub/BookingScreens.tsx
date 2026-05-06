import { CalendarCheck, CalendarPlus, ChevronLeft } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import {
  useSubscriberSubscription,
  type FirstVisitDayId,
  type FirstVisitTimeWindowId,
} from '../../subscription/SubscriberSubscriptionContext.js';
import {
  SUBSCRIBER_BOOKING_DAYS,
  SUBSCRIBER_BOOKING_TIME_WINDOWS,
} from './subscriberHubData.js';

type BookingStep = 'day' | 'time';
type BookingReturnPath = '/hub' | '/signup/welcome';

function bookingReturnPath(state: unknown): BookingReturnPath {
  if (
    typeof state === 'object' &&
    state !== null &&
    'returnTo' in state &&
    state.returnTo === '/signup/welcome'
  ) {
    return '/signup/welcome';
  }

  return '/hub';
}

export function BookingX10B(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const [bookingStep, setBookingStep] = useState<BookingStep>('day');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<FirstVisitDayId | ''>(
    subscription.state.firstVisitRequest?.dayId ?? '',
  );
  const [selectedTimeWindowId, setSelectedTimeWindowId] = useState<FirstVisitTimeWindowId | ''>(
    subscription.state.firstVisitRequest?.timeWindowId ?? '',
  );

  const selectedDay = SUBSCRIBER_BOOKING_DAYS.find((day) => day.id === selectedDayId);
  const selectedDayLabel = selectedDay === undefined ? '' : translate(selectedDay.labelKey);
  const title =
    bookingStep === 'day'
      ? translate('subscriber.booking.day.title')
      : translate('subscriber.booking.time.title', {
          day: selectedDayLabel.toLocaleLowerCase('fr-FR'),
        });
  const body =
    bookingStep === 'day'
      ? translate('subscriber.booking.day.body')
      : translate('subscriber.booking.time.body', { day: selectedDayLabel });
  const progress =
    bookingStep === 'day'
      ? translate('subscriber.booking.progress.day')
      : translate('subscriber.booking.progress.time');
  const canSubmit = selectedDayId !== '' && selectedTimeWindowId !== '';

  const goBack = (): void => {
    if (bookingStep === 'time') {
      setBookingStep('day');
      return;
    }

    navigate(bookingReturnPath(location.state), { replace: true });
  };

  const chooseDay = (dayId: FirstVisitDayId): void => {
    setSelectedDayId(dayId);
    setSelectedTimeWindowId('');
    setError(null);
    setBookingStep('time');
  };

  const submitBookingRequest = async (): Promise<void> => {
    if (selectedDayId === '' || selectedTimeWindowId === '' || isSubmitting) return;

    const requestedAtIso = new Date().toISOString();
    setError(null);
    setIsSubmitting(true);

    try {
      if (subscriberApi.isConfigured) {
        const detail = await subscriberApi.requestFirstVisit({
          requestedAt: requestedAtIso,
          schedulePreference: {
            dayOfWeek: selectedDayId,
            timeWindow: selectedTimeWindowId,
          },
        });
        subscription.syncFromApi(detail);
      }

      subscription.requestFirstVisit({
        dayId: selectedDayId,
        requestedAtIso,
        timeWindowId: selectedTimeWindowId,
      });
      navigate('/booking/submitted');
    } catch {
      setError(translate('error.server.body'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      aria-labelledby="x10b-headline"
      className="hub-screen booking-screen"
      data-screen-id="X-10B"
    >
      <div className="hub-body booking-body">
        <header className="booking-back-header">
          <button
            aria-label={translate('common.action.back')}
            className="booking-back"
            onClick={goBack}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="hub-eyebrow">{translate('subscriber.booking.header')}</span>
        </header>

        <section className="booking-hero">
          <CalendarPlus aria-hidden="true" className="booking-hero-icon" />
          <span className="booking-progress">{progress}</span>
          <h1 className="hub-title" id="x10b-headline">
            {title}
          </h1>
          <p className="booking-copy">{body}</p>
        </section>

        <div className="booking-step-frame">
          <section
            aria-hidden={bookingStep !== 'day'}
            className={`booking-step-panel ${bookingStep === 'day' ? 'active' : ''}`}
          >
            {bookingStep === 'day' ? (
              <fieldset className="booking-options" aria-labelledby="x10b-headline">
                <legend className="booking-slot-legend">
                  {translate('subscriber.booking.day_group.label')}
                </legend>
                <div className="booking-day-grid">
                  {SUBSCRIBER_BOOKING_DAYS.map((day) => {
                    const isSelected = selectedDayId === day.id;
                    return (
                      <label
                        className={`booking-slot compact${isSelected ? ' selected' : ''}`}
                        key={day.id}
                      >
                        <input
                          checked={isSelected}
                          className="booking-slot-input"
                          name="booking-day"
                          onChange={() => chooseDay(day.id)}
                          type="radio"
                          value={day.id}
                        />
                        <span>
                          <strong>{translate(day.labelKey)}</strong>
                        </span>
                        <i aria-hidden="true" />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
          </section>

          <section
            aria-hidden={bookingStep !== 'time'}
            className={`booking-step-panel ${bookingStep === 'time' ? 'active from-right' : ''}`}
          >
            {bookingStep === 'time' ? (
              <>
                <div className="booking-selected-day">
                  <span>{translate('subscriber.booking.selected_day.label')}</span>
                  <strong>{selectedDayLabel}</strong>
                </div>

                <fieldset className="booking-options" aria-labelledby="x10b-headline">
                  <legend className="booking-slot-legend">
                    {translate('subscriber.booking.time_group.label')}
                  </legend>
                  {SUBSCRIBER_BOOKING_TIME_WINDOWS.map((timeWindow) => {
                    const isSelected = selectedTimeWindowId === timeWindow.id;
                    return (
                      <label
                        className={`booking-slot${isSelected ? ' selected' : ''}`}
                        key={timeWindow.id}
                      >
                        <input
                          checked={isSelected}
                          className="booking-slot-input"
                          name="booking-time-window"
                          onChange={() => setSelectedTimeWindowId(timeWindow.id)}
                          type="radio"
                          value={timeWindow.id}
                        />
                        <span>
                          <strong>{translate(timeWindow.labelKey)}</strong>
                          <small>{translate(timeWindow.detailKey)}</small>
                        </span>
                        <i aria-hidden="true" />
                      </label>
                    );
                  })}
                </fieldset>

                <p className="booking-notice">{translate('subscriber.booking.notice')}</p>
                {error === null ? null : (
                  <p className="booking-notice" role="alert">
                    {error}
                  </p>
                )}
              </>
            ) : null}
          </section>
        </div>

        <div className="hub-grow" />

        {bookingStep === 'time' ? (
          <button
            aria-disabled={!canSubmit || isSubmitting}
            className="hub-action primary booking-submit"
            disabled={!canSubmit || isSubmitting}
            onClick={submitBookingRequest}
            type="button"
          >
            <CalendarCheck aria-hidden="true" />
            {translate('subscriber.booking.submit.cta')}
          </button>
        ) : null}
      </div>
    </main>
  );
}

export function BookingSubmittedX10C(): ReactElement {
  const navigate = useNavigate();

  return (
    <main
      aria-labelledby="x10c-headline"
      className="hub-screen booking-screen"
      data-screen-id="X-10C"
    >
      <div className="hub-body booking-body booking-submitted-body">
        <section className="booking-submitted">
          <CalendarCheck aria-hidden="true" className="booking-submitted-icon" />
          <span className="hub-eyebrow">{translate('subscriber.booking.submitted.header')}</span>
          <h1 className="hub-title" id="x10c-headline">
            {translate('subscriber.booking.submitted.title')}
          </h1>
          <p className="booking-copy">{translate('subscriber.booking.submitted.body')}</p>
        </section>

        <div className="hub-grow" />

        <button
          className="hub-action primary booking-submit"
          onClick={() => navigate('/hub')}
          type="button"
        >
          {translate('subscriber.booking.submitted.home_cta')}
        </button>
      </div>
    </main>
  );
}
