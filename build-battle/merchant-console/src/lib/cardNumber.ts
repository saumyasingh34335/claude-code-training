const BIN = "424242"
const NUMBER_LENGTH = 16

/**
 * The Luhn check digit that makes `partial + digit` pass validation.
 * `partial` is every digit except the last.
 */
export function luhnCheckDigit(partial: string): string {
  let sum = 0
  // Walking right to left, every second digit (starting with the one
  // immediately left of the check digit) is doubled.
  for (let i = 0; i < partial.length; i++) {
    let digit = Number(partial[partial.length - 1 - i])
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return String((10 - (sum % 10)) % 10)
}

/** Whether a full number (check digit included) passes the Luhn checksum. */
export function isValidLuhn(fullNumber: string): boolean {
  const partial = fullNumber.slice(0, -1)
  const checkDigit = fullNumber.slice(-1)
  return luhnCheckDigit(partial) === checkDigit
}

/**
 * Generates a card number server-side on the `4242` test BIN with a valid
 * Luhn check digit. Every call produces a different number.
 */
export function generateCardNumber(): { number: string; last4: string } {
  const randomDigitCount = NUMBER_LENGTH - BIN.length - 1
  let random = ""
  for (let i = 0; i < randomDigitCount; i++) {
    random += String(Math.floor(Math.random() * 10))
  }
  const partial = BIN + random
  const number = partial + luhnCheckDigit(partial)
  return { number, last4: number.slice(-4) }
}
