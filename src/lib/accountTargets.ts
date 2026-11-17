// Money remains exact at the full supported precision, including one-cent goals.
function moneyCents(amount: string): bigint {
  const [integer = '0', fraction = ''] = amount.split('.')
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'))
}

export function targetProgress(balance: string, target: string) {
  const held = moneyCents(balance)
  const goal = moneyCents(target)
  const reached = held >= goal
  const remaining = reached ? 0n : goal - held
  // Only the bounded presentation percentage becomes Number; money never does.
  const percent = reached ? 100 : Number((held * 10000n) / goal) / 100
  return {
    reached,
    percent,
    remaining: `${remaining / 100n}.${String(remaining % 100n).padStart(2, '0')}`,
  }
}
