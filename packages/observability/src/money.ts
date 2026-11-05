// USD is tracked in integer nano-dollars so repeated sums stay exact. Internal: not a package entry point.
export const NANO = 1e9

export const toNano = (usd: number): number => Math.round(usd * NANO)

/** Decimal text of `usd` rounded to the nano-dollar, for `numeric(20, 9)` parameters. */
export const toUsdDecimal = (usd: number): string => (toNano(usd) / NANO).toFixed(9)
