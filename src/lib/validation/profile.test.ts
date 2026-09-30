import { describe, expect, it } from "vitest";

import {
  businessProfileInputSchema,
  IMAGE_MAX_BYTES,
  imageUploadInputSchema,
} from "./profile";

function code(r: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return r.success ? "ok" : r.error!.issues[0]!.message;
}

describe("imageUploadInputSchema (WP-41)", () => {
  it("godtar jpeg/png/webp upp till 2 MiB", () => {
    for (const contentType of ["image/jpeg", "image/png", "image/webp"]) {
      expect(
        code(
          imageUploadInputSchema.safeParse({
            kind: "gallery",
            contentType,
            size: IMAGE_MAX_BYTES,
          }),
        ),
      ).toBe("ok");
    }
  });

  it("avvisar andra typer", () => {
    for (const contentType of [
      "image/gif",
      "image/svg+xml",
      "application/pdf",
      "",
    ]) {
      expect(
        code(
          imageUploadInputSchema.safeParse({
            kind: "cover",
            contentType,
            size: 1000,
          }),
        ),
      ).toBe("profile.image_type_invalid");
    }
  });

  it("avvisar för stora, tomma och ogiltiga storlekar", () => {
    const base = { kind: "logo", contentType: "image/png" };
    expect(
      code(
        imageUploadInputSchema.safeParse({
          ...base,
          size: IMAGE_MAX_BYTES + 1,
        }),
      ),
    ).toBe("profile.image_too_large");
    expect(code(imageUploadInputSchema.safeParse({ ...base, size: 0 }))).toBe(
      "profile.image_size_invalid",
    );
    expect(code(imageUploadInputSchema.safeParse({ ...base, size: 1.5 }))).toBe(
      "profile.image_size_invalid",
    );
  });

  it("avvisar okänd bildsort", () => {
    expect(
      code(
        imageUploadInputSchema.safeParse({
          kind: "avatar",
          contentType: "image/png",
          size: 10,
        }),
      ),
    ).toBe("profile.image_kind_invalid");
  });
});

describe("businessProfileInputSchema (WP-41)", () => {
  const base = { about: "", instagram: "", address: "", phone: "" };

  it("tomma fält blir null", () => {
    const r = businessProfileInputSchema.parse(base);
    expect(r).toEqual({
      about: null,
      instagram: null,
      tiktok: null,
      facebook: null,
      address: null,
      phone: null,
    });
  });

  it("Instagram: @handtag och länk normaliseras till handtaget", () => {
    for (const raw of [
      "@salon.nova",
      "salon.nova",
      "https://www.instagram.com/salon.nova/",
      "instagram.com/salon.nova?igsh=abc".replace(/^/, "https://"),
    ]) {
      expect(
        businessProfileInputSchema.parse({ ...base, instagram: raw }).instagram,
      ).toBe("salon.nova");
    }
    expect(
      code(
        businessProfileInputSchema.safeParse({
          ...base,
          instagram: "salón nova",
        }),
      ),
    ).toBe("profile.instagram_invalid");
  });

  it("om oss får vara högst 1500 tecken", () => {
    expect(
      code(
        businessProfileInputSchema.safeParse({
          ...base,
          about: "a".repeat(1501),
        }),
      ),
    ).toBe("profile.about_too_long");
  });
});
