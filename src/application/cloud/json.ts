export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/** Profiles and match records are plain data; this only tells TypeScript so. */
export const asJson = (value: unknown) => value as Json
