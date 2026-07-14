import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

/**
 * Live camera QR scanner. Debounces duplicate reads for 2s so a single
 * badge sitting in front of the camera does not spam the handler.
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
    Html5Qrcode.getCameras()
      .then((devs) => {
        setCameras(devs);
        // Prefer rear-facing camera on mobile.
        const back = devs.find((d) => /back|rear|environment/i.test(d.label));
        setCameraId((back ?? devs[0])?.id ?? "");
      })
      .catch((e: Error) => setError(e.message ?? "Camera access denied"));
    return () => {
      const s = scannerRef.current;
      if (s && s.isScanning) s.stop().catch(() => {});
    };
  }, []);

  async function start() {
    if (!cameraId) return;
    setError(null);
    try {
      const s = scannerRef.current ?? new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = s;
      await s.start(
        cameraId,
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

  async function stop() {
    const s = scannerRef.current;
    if (s && s.isScanning) await s.stop().catch(() => {});
    setRunning(false);
  }

  useEffect(() => {
    if (paused && running) void stop();
  }, [paused, running]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          disabled={running}
        >
          {cameras.length === 0 ? <option value="">No camera detected</option> : null}
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>{c.label || c.id}</option>
          ))}
        </select>
        {running ? (
          <Button size="sm" variant="outline" onClick={stop}>
            <CameraOff className="mr-1 h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={!cameraId}>
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
      {!running ? (
        <p className="text-xs text-muted-foreground">
          Press <strong>Start Camera</strong> to begin scanning team QR codes.
        </p>
      ) : null}
    </div>
  );
}
