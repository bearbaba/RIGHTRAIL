/** User-provided URL ID: single canonical decimal, never an array or padded string. */
export function validPositiveId(value) {
  return typeof value === 'string' &&
    /^[1-9]\d{0,8}$/.test(value) &&
    Number(value) <= 100000000;
}
