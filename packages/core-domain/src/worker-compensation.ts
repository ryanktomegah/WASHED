import { type Money, addMoney, money } from '@washed/shared';

export interface WorkerCompensationModel {
  readonly guaranteedFloor: Money;
  readonly perCompletedVisitBonus: Money;
}

export interface WorkerMonthlyCompensation {
  readonly completedVisits: number;
  readonly floor: Money;
  readonly total: Money;
  readonly visitBonusTotal: Money;
}

export const LOME_V1_WORKER_COMPENSATION: WorkerCompensationModel = {
  guaranteedFloor: money(40_000, 'XOF'),
  perCompletedVisitBonus: money(600, 'XOF'),
};

export function calculateWorkerMonthlyCompensation(
  completedVisits: number,
  model: WorkerCompensationModel = LOME_V1_WORKER_COMPENSATION,
): WorkerMonthlyCompensation {
  if (!Number.isSafeInteger(completedVisits) || completedVisits < 0) {
    throw new Error('Completed visits must be a non-negative safe integer.');
  }

  const visitBonusTotal = money(
    model.perCompletedVisitBonus.amountMinor * BigInt(completedVisits),
    model.perCompletedVisitBonus.currencyCode,
  );

  return {
    completedVisits,
    floor: model.guaranteedFloor,
    total: addMoney(model.guaranteedFloor, visitBonusTotal),
    visitBonusTotal,
  };
}
