import { allocateMoney } from "./money";

// El residuo se asigna a las primeras cuotas; no se redondea con Number.
export function installmentAmounts(
  totalMinor: bigint,
  count: number,
): bigint[] {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 120 ||
    totalMinor < BigInt(count)
  )
    throw new Error("Cada cuota debe ser de al menos un centavo.");
  const base = totalMinor / BigInt(count),
    remainder = totalMinor % BigInt(count);
  return Array.from(
    { length: count },
    (_, i) => base + (BigInt(i) < remainder ? 1n : 0n),
  );
}

// La suma de cada columna coincide con el reparto del total, también al dividir centavos.
export function installmentAllocations(
  totalMinor: bigint,
  count: number,
  shares: { id: string; shareBps: number }[],
) {
  const amounts = installmentAmounts(totalMinor, count);
  const goal = new Map(
    allocateMoney(
      { amountMinor: totalMinor.toString(), currency: "ARS" },
      shares,
    ).map((a) => [a.id, BigInt(a.money.amountMinor)]),
  );
  const matrix = amounts.map((amount) =>
    shares.map((s) => ({
      id: s.id,
      shareBps: s.shareBps,
      amountMinor: (amount * BigInt(s.shareBps)) / 10000n,
      remainder: (amount * BigInt(s.shareBps)) % 10000n,
    })),
  );
  for (const row of matrix)
    for (const piece of row)
      goal.set(piece.id, goal.get(piece.id)! - piece.amountMinor);
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    let remaining = amounts[i] - row.reduce((s, p) => s + p.amountMinor, 0n);
    const ordered = [...row].sort((a, b) =>
      a.remainder !== b.remainder
        ? a.remainder > b.remainder
          ? -1
          : 1
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0,
    );
    while (remaining > 0n)
      for (const piece of ordered) {
        if (!remaining) break;
        if (goal.get(piece.id)! > 0n) {
          piece.amountMinor++;
          goal.set(piece.id, goal.get(piece.id)! - 1n);
          remaining--;
        }
      }
  }
  return matrix.map((row) =>
    row.map(({ id, shareBps, amountMinor }) => ({ id, shareBps, amountMinor })),
  );
}
