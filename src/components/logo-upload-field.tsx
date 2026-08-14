"use client";

import { useState } from "react";

export function LogoUploadField({ currentLogoDataUrl }: { currentLogoDataUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentLogoDataUrl ?? null);
  const [removed, setRemoved] = useState(false);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Logo (optional)</legend>
      <div className="flex items-center gap-3">
        {preview && !removed ? (
          // eslint-disable-next-line @next/next/no-img-element -- small user-uploaded data URL, not worth Next/Image's optimization pipeline
          <img
            src={preview}
            alt="Game logo"
            className="h-14 w-14 rounded-lg border border-border-glass object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border-glass text-xs text-foreground-muted">
            None
          </div>
        )}
        <div className="flex flex-col gap-1">
          <input
            name="logo"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setRemoved(false);
              const reader = new FileReader();
              reader.onload = () => setPreview(reader.result as string);
              reader.readAsDataURL(file);
            }}
            className="text-xs"
          />
          <span className="text-xs text-foreground-muted">Up to 500KB.</span>
          {currentLogoDataUrl && !removed && (
            <label className="flex items-center gap-1 text-xs text-foreground-muted">
              <input
                type="checkbox"
                name="removeLogo"
                onChange={(e) => {
                  setRemoved(e.target.checked);
                  if (e.target.checked) setPreview(null);
                }}
              />
              Remove current logo
            </label>
          )}
        </div>
      </div>
    </fieldset>
  );
}
