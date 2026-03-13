/**
 * Seeded PRNG (xoshiro128** variant) for reproducible simulations.
 * All randomness in the simulator flows through this.
 */
export declare class SeededRandom {
    private s;
    constructor(seed: number);
    /** Returns a uniform random number in [0, 1) */
    next(): number;
    /** Uniform random integer in [min, max] inclusive */
    nextInt(min: number, max: number): number;
    /** Standard normal via Box-Muller transform */
    nextGaussian(): number;
    /** Lognormal with given mean and CV (coefficient of variation) */
    nextLognormal(mean: number, cv: number): number;
    /** Poisson random variable (for small lambda, uses inversion) */
    nextPoisson(lambda: number): number;
    /** Random date within a calendar year */
    nextDateInYear(year: number): string;
}
