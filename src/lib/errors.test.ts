import { describe, expect, it } from "vitest";

import { dbErrorMessage } from "./errors";

const messages = { already_applied: "You already applied." };

describe("dbErrorMessage", () => {
  it("maps known database codes", () => {
    expect(dbErrorMessage({ message: "already_applied" }, messages, "Oops")).toBe("You already applied.");
  });

  it("explains rate limits everywhere", () => {
    expect(dbErrorMessage({ message: "rate_limit_exceeded" }, messages, "Oops")).toMatch(/too often/);
  });

  it("never leaks unknown database errors", () => {
    expect(dbErrorMessage({ message: 'relation "secret" does not exist' }, messages, "Oops")).toBe("Oops");
    expect(dbErrorMessage(null, messages, "Oops")).toBe("Oops");
  });

  it("does not treat inherited object keys as messages", () => {
    expect(dbErrorMessage({ message: "toString" }, messages, "Oops")).toBe("Oops");
  });
});
