import { describe, expect, it } from "vitest";

import {
  TICKET_CODE_REGEX,
  isValidTicketCode,
  normalizeTicketCode,
} from "@/lib/utils/ticket";

describe("Ticket Code Utilities", () => {
  describe("TICKET_CODE_REGEX", () => {
    it("matches valid format with unambiguous characters", () => {
      expect(TICKET_CODE_REGEX.test("UNSCH-7K4M")).toBe(true);
      expect(TICKET_CODE_REGEX.test("UNSCH-2345")).toBe(true);
      expect(TICKET_CODE_REGEX.test("UNSCH-WXYZ")).toBe(true);
    });

    it("rejects visually ambiguous characters (0, O, 1, I, L)", () => {
      expect(TICKET_CODE_REGEX.test("UNSCH-704M")).toBe(false); // contains 0
      expect(TICKET_CODE_REGEX.test("UNSCH-7O4M")).toBe(false); // contains O
      expect(TICKET_CODE_REGEX.test("UNSCH-714M")).toBe(false); // contains 1
      expect(TICKET_CODE_REGEX.test("UNSCH-7I4M")).toBe(false); // contains I
      expect(TICKET_CODE_REGEX.test("UNSCH-7L4M")).toBe(false); // contains L
    });

    it("rejects invalid lengths and malformed prefixes", () => {
      expect(TICKET_CODE_REGEX.test("UNSCH-7K4")).toBe(false); // only 3 chars
      expect(TICKET_CODE_REGEX.test("UNSCH-7K4M2")).toBe(false); // 5 chars
      expect(TICKET_CODE_REGEX.test("USCH-7K4M")).toBe(false); // missing N
      expect(TICKET_CODE_REGEX.test("7K4M")).toBe(false); // missing prefix
      expect(TICKET_CODE_REGEX.test("UNSCH7K4M")).toBe(false); // missing hyphen
    });
  });

  describe("normalizeTicketCode", () => {
    it("trims whitespace and converts to uppercase", () => {
      expect(normalizeTicketCode("  unsch-7k4m  ")).toBe("UNSCH-7K4M");
      expect(normalizeTicketCode("unsch-a39b")).toBe("UNSCH-A39B");
    });

    it("handles empty or falsy inputs gracefully", () => {
      expect(normalizeTicketCode("")).toBe("");
    });
  });

  describe("isValidTicketCode", () => {
    it("validates correct codes with mixed casing and whitespace", () => {
      expect(isValidTicketCode("unsch-7k4m")).toBe(true);
      expect(isValidTicketCode("  UNSCH-A39B  ")).toBe(true);
    });

    it("rejects invalid characters, types, or formats", () => {
      expect(isValidTicketCode("UNSCH-0000")).toBe(false);
      expect(isValidTicketCode("UNSCH-IIII")).toBe(false);
      expect(isValidTicketCode("")).toBe(false);
      // @ts-expect-error test non-string runtime guard
      expect(isValidTicketCode(null)).toBe(false);
      // @ts-expect-error test non-string runtime guard
      expect(isValidTicketCode(undefined)).toBe(false);
    });
  });
});
