const MAX_LOGO_BYTES = 500 * 1024;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000; // avoid a call-stack overflow from spreading huge arrays
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export type LogoUploadResult =
  | { ok: true; dataUrl: string | null | undefined }
  | { ok: false; error: string };

/**
 * `dataUrl: undefined` means "leave whatever logo is already saved alone" —
 * distinct from `null`, which means "clear it". Only returns an actual data
 * URL when a real file was submitted.
 */
export async function parseLogoUpload(formData: FormData): Promise<LogoUploadResult> {
  if (formData.get("removeLogo") === "on") {
    return { ok: true, dataUrl: null };
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, dataUrl: undefined };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Logo must be an image file." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be under 500KB." };
  }

  const buffer = await file.arrayBuffer();
  const dataUrl = `data:${file.type};base64,${arrayBufferToBase64(buffer)}`;
  return { ok: true, dataUrl };
}
