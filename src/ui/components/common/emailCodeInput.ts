export const EMAIL_CODE_MIN_LENGTH = 6
export const EMAIL_CODE_MAX_LENGTH = 10

/** Keep leading zeroes and accept digits copied with spaces, dashes or non-Latin keyboards. */
export function emailCodeDigits(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/\D/g, '')
}

export function isCompleteEmailCode(value: string) {
  return /^[0-9]{6,10}$/.test(value)
}
