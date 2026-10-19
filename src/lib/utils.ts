export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}`;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function toInputDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const PHONE_PATTERN = String.raw`\d{2} \d{3} \d{2} \d{2}`;

export function formatPhoneValue(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length > 9) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 7));
  if (digits.length > 7) parts.push(digits.slice(7, 9));
  return parts.join(" ");
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Plastik",
  CLICK: "Click",
};

export function formatPaymentType(type: string | null | undefined): string {
  if (!type) return "-";
  return PAYMENT_TYPE_LABELS[type] ?? type;
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  PAYMENT: "To'lov",
  VISIT: "Tashrif",
  PATIENT: "Bemor",
  DOCTOR: "Doktor",
  LOGIN: "Kirish",
  EXPENSE: "Xarajat",
  LABWORK: "Texnik ish",
  EMPLOYEE: "Xodim",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  DOSTAVKA: "Dostavka",
  OVQAT: "Ovqat",
  ISHCHI: "Ishchilarga",
  BOSHQA: "Boshqa",
};

export function formatExpenseCategory(category: string | null | undefined): string {
  if (!category) return "-";
  return EXPENSE_CATEGORY_LABELS[category] ?? category;
}

export const LABWORK_TYPE_LABELS: Record<string, string> = {
  ZIRCON: "Tsirkon",
  MK_500: "MK-500",
  CLITOY_300: "Clitoy-300",
  TITAN_250: "Titan-250",
};

export function formatLabWorkType(type: string | null | undefined): string {
  if (!type) return "-";
  return LABWORK_TYPE_LABELS[type] ?? type;
}

export function calcAge(birthDate: Date | null): string {
  if (!birthDate) return "-";
  const now = new Date();
  const diff = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  const age = m < 0 || (m === 0 && now.getDate() < birthDate.getDate()) ? diff - 1 : diff;
  return String(age);
}
