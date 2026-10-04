import { describe, expect, it } from "vitest";

import { authErrorMessage } from "./errors";
import { authStrings } from "./strings";

const e = authStrings.errors;

describe("authErrorMessage", () => {
  it.each([
    [{ status: 429 }, e.rateLimited],
    [{ code: "over_sms_send_rate_limit" }, e.rateLimited],
    [{ code: "otp_expired" }, e.wrongCode],
    [{ code: "invalid_credentials" }, e.wrongCode],
    [{ code: "phone_provider_disabled" }, e.providerDisabled],
    [{ code: "sms_send_failed" }, e.providerDisabled],
    [{ code: "something_else", message: "raw db detail" }, e.generic],
    [null, e.generic],
    [undefined, e.generic],
  ])("maps %o", (error, expected) => {
    expect(authErrorMessage(error)).toBe(expected);
  });
});
