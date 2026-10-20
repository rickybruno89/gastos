export type Currency = "ARS" | "USD";
export type Money = { amountMinor: string; currency: Currency };

export function moneyFromDecimal(decimal: string, currency: Currency): Money {
  const match = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(decimal);
  if (!match)
    throw new Error(
      "El importe requiere un decimal exacto con hasta dos posiciones.",
    );
  const amount =
    BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  return { amountMinor: (match[1] ? -amount : amount).toString(), currency };
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency)
    throw new Error("No se pueden sumar monedas diferentes.");
  return {
    amountMinor: (
      BigInt(left.amountMinor) + BigInt(right.amountMinor)
    ).toString(),
    currency: left.currency,
  };
}

export function allocateMoney(
  money: Money,
  shares: { id: string; shareBps: number }[],
) {
  if (
    shares.length === 0 ||
    new Set(shares.map((share) => share.id)).size !== shares.length ||
    shares.some(
      (share) =>
        !share.id ||
        !Number.isInteger(share.shareBps) ||
        share.shareBps < 0 ||
        share.shareBps > 10_000,
    ) ||
    shares.reduce((total, share) => total + share.shareBps, 0) !== 10_000
  )
    throw new Error(
      "El reparto requiere participantes únicos y porcentajes que sumen 100%.",
    );
  const original = BigInt(money.amountMinor);
  const sign = original < 0n ? -1n : 1n;
  const amount = original * sign;
  const allocations = shares.map((share) => ({
    ...share,
    amount: (amount * BigInt(share.shareBps)) / 10_000n,
    remainder: (amount * BigInt(share.shareBps)) % 10_000n,
  }));
  let remaining =
    amount - allocations.reduce((sum, item) => sum + item.amount, 0n);
  for (const item of [...allocations].sort((a, b) =>
    a.remainder !== b.remainder
      ? a.remainder > b.remainder
        ? -1
        : 1
      : a.id < b.id
        ? -1
        : 1,
  )) {
    if (remaining === 0n) break;
    item.amount += 1n;
    remaining -= 1n;
  }
  return allocations.map((item) => ({
    id: item.id,
    shareBps: item.shareBps,
    money: {
      amountMinor: (item.amount * sign).toString(),
      currency: money.currency,
    },
  }));
}
