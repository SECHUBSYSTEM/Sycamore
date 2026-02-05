/**
 * Single source of truth for amount scale and interest rate.
 * Used by bigint utils and interest service for consistent precision.
 */
export const AMOUNT_SCALE = 100; // smallest unit = cents (2 decimals)

/** Annual interest rate as decimal string (27.5% = 0.275) for big.js */
export const INTEREST_RATE_ANNUAL = "0.275";
