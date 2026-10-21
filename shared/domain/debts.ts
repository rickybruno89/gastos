export type DebtStatus = "OPEN" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

// Saldo y estado de una deuda manual. Todo en minor units de la moneda de la deuda;
// sin intereses: el principal solo cambia por ajustes explícitos.
export function deriveDebt(input: {
  principalMinor: bigint;
  increasesMinor: bigint[];
  forgivenMinor: bigint[];
  paymentsMinor: bigint[];
  cancelled: boolean;
}) {
  const sum = (values: bigint[]) => values.reduce((a, b) => a + b, 0n);
  const owedMinor = input.principalMinor + sum(input.increasesMinor);
  const forgivenMinor = sum(input.forgivenMinor);
  const paidMinor = sum(input.paymentsMinor);
  const balanceMinor = owedMinor - forgivenMinor - paidMinor;
  const status: DebtStatus = input.cancelled
    ? "CANCELLED"
    : balanceMinor <= 0n
      ? "PAID"
      : input.paymentsMinor.length
        ? "PARTIALLY_PAID"
        : "OPEN";
  return { owedMinor, forgivenMinor, paidMinor, balanceMinor, status };
}
