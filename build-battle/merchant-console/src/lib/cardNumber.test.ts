import { describe, expect, it } from "vitest"
import { generateCardNumber, isValidLuhn, luhnCheckDigit } from "./cardNumber"

describe("luhnCheckDigit", () => {
  it("matches a known-good test number", () => {
    // 4242424242424242 is a well-known valid Luhn number.
    expect(luhnCheckDigit("424242424242424")).toBe("2")
  })

  it("produces a digit that makes the full number pass isValidLuhn", () => {
    const partial = "123456789012345"
    const digit = luhnCheckDigit(partial)
    expect(isValidLuhn(partial + digit)).toBe(true)
  })
})

describe("isValidLuhn", () => {
  it("accepts the well-known Stripe test number", () => {
    expect(isValidLuhn("4242424242424242")).toBe(true)
  })

  it("rejects a number with a wrong check digit", () => {
    expect(isValidLuhn("4242424242424241")).toBe(false)
  })
})

describe("generateCardNumber", () => {
  it("generates a 16-digit number on the 4242 test BIN", () => {
    const { number } = generateCardNumber()
    expect(number).toHaveLength(16)
    expect(number.startsWith("424242")).toBe(true)
  })

  it("generates a number that passes the Luhn check", () => {
    const { number } = generateCardNumber()
    expect(isValidLuhn(number)).toBe(true)
  })

  it("returns last4 matching the number's own trailing digits", () => {
    const { number, last4 } = generateCardNumber()
    expect(number.endsWith(last4)).toBe(true)
    expect(last4).toHaveLength(4)
  })

  it("varies across calls", () => {
    const a = generateCardNumber()
    const b = generateCardNumber()
    expect(a.number).not.toBe(b.number)
  })
})
