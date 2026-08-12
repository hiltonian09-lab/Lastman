import "server-only";
import { headers } from "next/headers";

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3001";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}
