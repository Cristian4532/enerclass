import os from "node:os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIRTUAL_ADAPTER =
  /(virtual|vmware|vbox|virtualbox|hyper-v|wsl|docker|tailscale|zerotier|loopback|npcap|bluetooth|vpn)/i;

function isPrivateIpv4(address: string) {
  if (/^192\.168\./.test(address)) return 4;
  if (/^10\./.test(address)) return 3;
  const match = address.match(/^172\.(\d{1,2})\./);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return 2;
  }
  return 1;
}

function listNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const candidates: { name: string; address: string; score: number }[] = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries || VIRTUAL_ADAPTER.test(name)) continue;
    for (const entry of entries) {
      const family = String(entry.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (entry.internal || entry.address.startsWith("169.254.")) continue;
      const score =
        isPrivateIpv4(entry.address) +
        (/(wi-?fi|wlan|wireless|ethernet|eth|en0|en1)/i.test(name) ? 2 : 0);
      candidates.push({ name, address: entry.address, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export async function GET(request: Request) {
  const port = Number(process.env.PORT ?? 3000);
  const hostHeader = request.headers.get("host") ?? `localhost:${port}`;
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const isCloud = Boolean(process.env.VERCEL || process.env.RENDER || process.env.NETLIFY);
  const candidates = listNetworkInterfaces();
  const primary = candidates[0];

  return NextResponse.json(
    {
      hostname: os.hostname(),
      port,
      isCloud,
      localUrl: `http://localhost:${port}`,
      networkUrl: primary ? `http://${primary.address}:${port}` : null,
      publicUrl: isCloud ? `${protocol}://${hostHeader}` : null,
      primaryInterface: primary?.name ?? null,
      interfaces: candidates.map(({ name, address }) => ({ name, address }))
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
