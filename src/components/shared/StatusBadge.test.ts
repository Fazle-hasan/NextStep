import { describe, expect, it } from "vitest";

import { statusTone } from "./StatusBadge";

describe("statusTone", () => {
  it("maps the same meaning to the same tone across features", () => {
    expect(statusTone("approved")).toBe("success");
    expect(statusTone("confirmed")).toBe("success");
    expect(statusTone("hired")).toBe("success");
    expect(statusTone("pending")).toBe("attention");
    expect(statusTone("pending_review")).toBe("attention");
    expect(statusTone("requested")).toBe("attention");
    expect(statusTone("shortlisted")).toBe("progress");
    expect(statusTone("rejected")).toBe("danger");
    expect(statusTone("declined")).toBe("danger");
    expect(statusTone("expired")).toBe("inactive");
    expect(statusTone("withdrawn")).toBe("inactive");
  });

  it("falls back to inactive for unknown values", () => {
    expect(statusTone("something_new")).toBe("inactive");
  });
});
