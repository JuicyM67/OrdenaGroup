import { describe, expect, it } from "vitest";

import { isOwnImageUrl, offerImageSrc, storagePublicBase } from "./storage-url";

const BASE = storagePublicBase("http://127.0.0.1:54321/")!;
const REF =
  "offer-images/aaaaaaaa-0000-0000-0000-000000000001/aaaaaaaa-1111-2222-3333-444444444444.jpg";

describe("storage-url (WP-70, #111 S2/S3)", () => {
  it("bygger full URL från projektets egen bas", () => {
    expect(BASE).toBe("http://127.0.0.1:54321/storage/v1/object/public/");
    expect(offerImageSrc(REF, BASE)).toBe(BASE + REF);
    expect(offerImageSrc("/demo/se/klipp.webp", BASE)).toBe(
      "/demo/se/klipp.webp",
    );
  });

  it("släpper inte igenom andra värdar eller former", () => {
    expect(
      offerImageSrc(
        "https://evil.supabase.co/storage/v1/object/public/" + REF,
        BASE,
      ),
    ).toBeNull();
    expect(offerImageSrc("offer-images/x/y.jpg", BASE)).toBeNull();
    expect(isOwnImageUrl(BASE + REF, BASE)).toBe(true);
    expect(
      isOwnImageUrl(
        "https://abc.supabase.co/storage/v1/object/public/" + REF,
        BASE,
      ),
    ).toBe(false);
    expect(isOwnImageUrl(BASE + "private-bucket/x.jpg", BASE)).toBe(false);
    expect(isOwnImageUrl("//evil.example.com/x.jpg", BASE)).toBe(false);
  });
});
