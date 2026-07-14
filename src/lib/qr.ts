import QRCode from "qrcode";

/**
 * Render the given payload string into a PNG data URL.
 * Uses a fixed size + high error correction so the code stays scannable on
 * printed passes.
 */
export async function renderQrDataUrl(payload: string, size = 320): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    width: size,
    margin: 2,
    color: {
      dark: "#0a0a0a",
      light: "#ffffff",
    },
  });
}

/**
 * Public payload embedded into the QR code. Kept intentionally opaque –
 * downstream attendance modules verify the token server-side.
 */
export function buildQrPayload(input: {
  registration_id: string;
  registration_code: string;
  event_id: string;
  team_id: string;
  qr_token: string;
}) {
  return JSON.stringify({
    v: 1,
    rid: input.registration_id,
    code: input.registration_code,
    eid: input.event_id,
    tid: input.team_id,
    t: input.qr_token,
  });
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
