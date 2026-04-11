/**
 * Utility to generate 1000+ unique lottery-related reasons for receipts.
 */

const LOTTERY_NAMES = [
  "Abdela Lottery",
  "National Lottery",
  "Tombola",
  "Zemen Lottery",
  "Car Lottery",
  "House Lottery",
  "Bingo",
  "Lucky Draw",
  "Prize Draw",
  "Golden Chance Lottery",
  "Dash Lottery",
  "Medeb Lottery",
  "Grand Prize Lottery",
  "Millionaire Draw",
  "Winner's Choice Lottery",
  "Fortune Draw",
  "Victory Lottery",
  "Sunshine Lottery",
  "Community Draw",
  "Institutional Lottery",
];

const REASON_PATTERNS = [
  (name: string, id: string) => `Payment for ${name} ${id}`,
  (name: string, id: string) => `${name} Ticket #${id}`,
  (name: string, id: string) => `Buying ticket for ${name} (${id})`,
  (name: string, id: string) => `${name} payment ref: ${id}`,
  (name: string, id: string) => `Ticket ID: ${id} - ${name}`,
  (name: string, id: string) => `Prize draw entry ${id} for ${name}`,
  (name: string, id: string) => `${name} participation ${id}`,
  (name: string, id: string) => `Lottery payment - ${name} - ${id}`,
  (name: string, id: string) => `Entry fee for ${name} [${id}]`,
  (name: string, id: string) => `${name} lottery entry - ${id}`,
];

/**
 * Builds a pool of 1000+ unique reasons.
 */
function buildReasonsPool(): string[] {
  const pool: string[] = [];
  // 20 names * 50 IDs * 10 patterns = 10,000 potential unique reasons
  for (const name of LOTTERY_NAMES) {
    for (let i = 1; i <= 60; i++) {
      // Use a consistent but "random-looking" ID
      const randomId = Math.floor(Math.random() * 900000 + 100000).toString();
      for (const pattern of REASON_PATTERNS) {
        pool.push(pattern(name, randomId));
      }
    }
  }
  return pool;
}

const REASONS_POOL = buildReasonsPool();

/**
 * Returns a random lottery-related reason from the pool of 10,000+.
 */
export function randomLotteryReason(): string {
  const idx = Math.floor(Math.random() * REASONS_POOL.length);
  return REASONS_POOL[idx] || "Lottery Payment";
}
