import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

/**
 * Live camera QR scanner. Debounces duplicate reads for 2s so a single
 * badge sitting in front of the camera does not spam the handler.
 *
 * Permission is requested on button click (user gesture) BEFORE enumerating
 * devices — otherwise mobile browsers return unlabeled devices and start()
 * silently fails.
 */
export function QRScanner({
  onDecode,
  paused,
}: {
  onDecode: (text: string) => void;
  paused?: boolean;
}) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s && s.isScanning) s.stop().catch(() => {});
    };
  }, []);

  async function ensureCameras(): Promise<CameraDevice[]> {
    // Request permission first (must be in user gesture); this unlocks device labels.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      // Release immediately — html5-qrcode will re-open the chosen device.
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      const msg = (e as Error).name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser."
        : (e as Error).message || "Cannot access camera";
      throw new Error(msg);
    }
    const devs = await Html5Qrcode.getCameras();
    setCameras(devs);
    return devs;
  }

  async function start() {
    setError(null);
    try {
      let devs = cameras;
      if (devs.length === 0) devs = await ensureCameras();
      if (devs.length === 0) throw new Error("No camera detected on this device.");
      const back = devs.find((d) => /back|rear|environment/i.test(d.label));
      const chosenId = cameraId || back?.id || devs[0].id;
      if (!cameraId) setCameraId(chosenId);

      const s = scannerRef.current ?? new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = s;
      await s.start(
        chosenId,
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          const now = Date.now();
          if (decoded === lastRef.current.text && now - lastRef.current.at < 2000) return;
          lastRef.current = { text: decoded, at: now };
          onDecode(decoded);
        },
        () => {},
      );
      setRunning(true);
    } catch (e) {
      setError((e as Error).message ?? "Failed to start camera");
    }
  }

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    if (s && s.isScanning) await s.stop().catch(() => {});
    setRunning(false);
  }, []);

  useEffect(() => {
    if (paused && running) void stop();
  }, [paused, running, stop]);

  const secureContext = typeof window !== "undefined" && window.isSecureContext;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {cameras.length > 0 && (
          <select
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            disabled={running}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>{c.label || c.id}</option>
            ))}
          </select>
        )}
        {running ? (
          <Button size="sm" variant="outline" onClick={stop}>
            <CameraOff className="mr-1 h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={start}>
            <Camera className="mr-1 h-4 w-4" /> Start Camera
          </Button>
        )}
      </div>
      <div
        id={containerId}
        className="mx-auto max-w-md overflow-hidden rounded-lg border border-border bg-black/40"
        style={{ minHeight: running ? 260 : 0 }}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!secureContext ? (
        <p className="text-xs text-amber-500">
          Camera requires HTTPS. Open the published site or use the deployed URL.
        </p>
      ) : !running ? (
        <p className="text-xs text-muted-foreground">
          Press <strong>Start Camera</strong> and allow camera permission when prompted.
        </p>
      ) : null}
    </div>
  );
}
