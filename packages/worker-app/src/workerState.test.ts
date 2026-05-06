import { describe, expect, it } from 'vitest';

import { initialWorkerState, workerReducer } from './workerState.js';

describe('worker state', () => {
  it('queues SOS as an immediate safety issue with the selected reason', () => {
    const state = workerReducer(initialWorkerState, {
      reason: 'danger',
      reasonLabel: 'Je suis en danger',
      type: 'sos/confirm',
    });
    const queuedSos = state.offlineQueue[0];

    expect(queuedSos?.kind).toBe('sos');
    expect(queuedSos?.label).toBe('SOS · Je suis en danger');
    expect(queuedSos?.request.body).toMatchObject({
      description: 'SOS immédiat · Je suis en danger. Le bureau doit rappeler dans 30 secondes.',
      issueType: 'safety_concern',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(state.sos).toEqual({ incidentLogged: true, open: false });
  });
});
