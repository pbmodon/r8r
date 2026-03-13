/**
 * Seeded PRNG (xoshiro128** variant) for reproducible simulations.
 * All randomness in the simulator flows through this.
 */
export class SeededRandom {
  private s: Uint32Array;

  constructor(seed: number) {
    // Initialize state from seed using splitmix32
    this.s = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      seed += 0x9e3779b9;
      let z = seed;
      z = (z ^ (z >>> 16)) * 0x85ebca6b;
      z = (z ^ (z >>> 13)) * 0xc2b2ae35;
      z = z ^ (z >>> 16);
      this.s[i] = z >>> 0;
    }
  }

  /** Returns a uniform random number in [0, 1) */
  next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = s[1] << 9;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];

    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);

    return (result >>> 0) / 0x100000000;
  }

  /** Uniform random integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Standard normal via Box-Muller transform */
  nextGaussian(): number {
    let u1: number;
    let u2: number;
    do {
      u1 = this.next();
    } while (u1 === 0);
    u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Lognormal with given mean and CV (coefficient of variation) */
  nextLognormal(mean: number, cv: number): number {
    // sigma² = ln(1 + cv²), mu = ln(mean) - sigma²/2
    const sigma2 = Math.log(1 + cv * cv);
    const sigma = Math.sqrt(sigma2);
    const mu = Math.log(mean) - sigma2 / 2;
    return Math.exp(mu + sigma * this.nextGaussian());
  }

  /** Poisson random variable (for small lambda, uses inversion) */
  nextPoisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda < 30) {
      // Direct inversion
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= this.next();
      } while (p > L);
      return k - 1;
    } else {
      // Normal approximation for large lambda
      return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * this.nextGaussian()));
    }
  }

  /** Random date within a calendar year */
  nextDateInYear(year: number): string {
    const dayOfYear = this.nextInt(1, 365);
    const d = new Date(year, 0, dayOfYear);
    return d.toISOString().slice(0, 10);
  }
}
