export const TOGO_PHONE_LENGTH = 8;

export function digitsOfTogoPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const nationalDigits = digits.startsWith('228') ? digits.slice(3) : digits;
  return nationalDigits.slice(0, TOGO_PHONE_LENGTH);
}

export function formatTogoPhone(digits: string): string {
  const cleaned = digits.replace(/\D/g, '').slice(0, TOGO_PHONE_LENGTH);
  return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export function formatTogoDisplayPhone(value: string): string {
  const digits = digitsOfTogoPhone(value);
  return digits.length === TOGO_PHONE_LENGTH ? `+228 ${formatTogoPhone(digits)}` : value.trim();
}

export function toTogoE164Phone(value: string): string {
  const digits = digitsOfTogoPhone(value);

  if (digits.length !== TOGO_PHONE_LENGTH) {
    throw new Error('Subscriber phone is incomplete.');
  }

  return `+228${digits}`;
}
