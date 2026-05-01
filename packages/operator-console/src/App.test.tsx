import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('operator console', () => {
  function authenticateOperator(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    expect(screen.getByText('OTP sent to the operator phone.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('OTP code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
    expect(screen.getByRole('heading', { name: 'Operations dashboard' })).toBeInTheDocument();
  }

  it('gates privileged console data behind phone OTP', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Washed Ops login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Operator phone')).toHaveValue('+228 90 00 00 00');
    expect(screen.queryByRole('heading', { name: 'Operations dashboard' })).not.toBeInTheDocument();

    authenticateOperator();

    expect(screen.queryByRole('heading', { name: 'Washed Ops login' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operations dashboard' })).toBeInTheDocument();
  });

  it('renders dashboard navigation, metrics, and surface inventory', () => {
    render(<App />);
    authenticateOperator();

    expect(screen.getByRole('navigation', { name: 'Operator navigation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operations dashboard' })).toBeInTheDocument();
    expect(screen.getByLabelText('Operator queue metrics').children).toHaveLength(4);
    expect(screen.getByLabelText('Operator console surfaces').children).toHaveLength(18);
  });

  it('accepts a matching candidate and keeps an audit-ready state visible', () => {
    render(<App />);
    authenticateOperator();

    fireEvent.click(screen.getByRole('button', { name: 'Attribution' }));
    expect(screen.getByRole('heading', { name: "File d'attribution" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]!);

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Matching decision accepted and audit logged.')).toBeInTheDocument();
    expect(screen.getByText('Decision logging')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0]!);

    expect(screen.getAllByText('Rejected').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Matching candidate rejected with operator reason required.'),
    ).toBeInTheDocument();
  });

  it('renders the live ops map and active visits', () => {
    render(<App />);
    authenticateOperator();

    fireEvent.click(screen.getByRole('button', { name: 'Opérations' }));

    expect(screen.getByRole('heading', { name: 'Live ops board' })).toBeInTheDocument();
    expect(screen.getByLabelText('Live operations map')).toBeInTheDocument();
    expect(screen.getByText('Akouvi A. · ETA 09:12')).toBeInTheDocument();
  });

  it('handles disputes, privacy, and blocklist actions', () => {
    render(<App />);
    authenticateOperator();

    fireEvent.click(screen.getByRole('button', { name: 'Litiges' }));
    expect(screen.getByRole('heading', { name: 'Bureau des litiges' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resolve dispute' }));
    expect(screen.getByText('Dispute resolved with audit event.')).toBeInTheDocument();
    expect(screen.getByText('3 open')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Escalate safety case' }));
    expect(screen.getByText('Dispute escalated for senior operator review.')).toBeInTheDocument();
    expect(screen.getByText('1 escalated')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profiles' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add relationship block' }));
    expect(
      screen.getByText('Household relationship block added and audit logged.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Handle subscriber privacy' }));
    expect(screen.getByText('Subscriber privacy request marked handled.')).toBeInTheDocument();
    expect(screen.getByText('Handled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Handle worker privacy' }));
    expect(screen.getByText('Worker privacy request marked handled.')).toBeInTheDocument();
  });

  it('navigates to payments, audit, and settings surfaces and records actions', () => {
    render(<App />);
    authenticateOperator();

    fireEvent.click(screen.getByRole('button', { name: 'Paiements' }));
    expect(screen.getByRole('heading', { name: 'Payments and payouts' })).toBeInTheDocument();
    expect(screen.getByText('Manual payment retry')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]!);
    expect(screen.getByText('Mobile-money recovery retry queued.')).toBeInTheDocument();
    expect(screen.getByText('3 exceptions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Issue' }));
    expect(screen.getByText('Refund issued with reason and audit event.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText('Worker payout batch started.')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[1]!);
    expect(screen.getByText('Failed worker payout retry queued.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Audit' }));
    expect(screen.getByRole('heading', { name: 'Audit and governance' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply risk filter' }));
    expect(
      screen.getByText('Audit filter applied to money, privacy, and SOS events.'),
    ).toBeInTheDocument();
    expect(screen.getByText('money + privacy + SOS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings and readiness' })).toBeInTheDocument();
    expect(screen.getByText('Readiness checks')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run readiness check' }));
    expect(screen.getByText('Provider readiness check completed.')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle forced update' }));
    expect(screen.getByText('Forced-update flag changed for beta clients.')).toBeInTheDocument();
    expect(screen.getByText('Forced')).toBeInTheDocument();
  });

  it('manages route planning, notifications, and report exports', () => {
    render(<App />);
    authenticateOperator();

    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(screen.getByRole('heading', { name: 'Daily route planning' })).toBeInTheDocument();
    expect(screen.getByText('Tomorrow route board')).toBeInTheDocument();
    expect(screen.getByText('2 overloads')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge risk' }));
    expect(
      screen.getByText('Route overload risk acknowledged for manual intervention.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 overloads')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve routes' }));
    expect(screen.getByText('Daily route plan approved and audit logged.')).toBeInTheDocument();
    expect(screen.getByText('1 approval events')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(
      screen.getByRole('heading', { name: 'Notifications and push devices' }),
    ).toBeInTheDocument();
    expect(screen.getByText('6 due')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deliver due notifications' }));
    expect(
      screen.getByText('Due notifications delivered through the operator queue.'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 due')).toBeInTheDocument();
    expect(screen.getByText('6 delivered from this queue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rapports' }));
    expect(screen.getByRole('heading', { name: 'Reports and KPI exports' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export report' }));
    expect(screen.getByText('Closed-beta report export prepared for review.')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });
});
