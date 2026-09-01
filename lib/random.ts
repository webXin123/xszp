/**
 * Deterministic pseudo-random helpers.
 *
 * All demo data in this prototype is generated from a string seed instead of
 * `Math.random()`, so the same class / date always produces the same numbers.
 * That keeps server render and client hydration identical and makes the demo
 * reproducible when showing it to different people.
 */

function hashSeed(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, good enough for mock data */
export function createRandom(seed: string) {
  let state = hashSeed(seed)
  return function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Random = ReturnType<typeof createRandom>

/** Integer in [min, max] inclusive */
export function randomInt(rand: Random, min: number, max: number) {
  return min + Math.floor(rand() * (max - min + 1))
}

export function pickOne<T>(rand: Random, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]
}

/** Fisher–Yates on a copy */
export function shuffle<T>(rand: Random, list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** `count` distinct items, or the whole list when it is shorter */
export function pickMany<T>(rand: Random, list: readonly T[], count: number): T[] {
  if (count >= list.length) return [...list]
  return shuffle(rand, list).slice(0, count)
}

/** true with the given probability (0..1) */
export function chance(rand: Random, probability: number) {
  return rand() < probability
}
