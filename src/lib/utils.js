/* Shared utility helpers */

/* Returns true if x is not null, not undefined, and not an empty string.
   Used throughout section components to test whether an optional numeric
   admin field has been explicitly set vs. left blank. */
export const hasValue = (x) => x != null && x !== "";
