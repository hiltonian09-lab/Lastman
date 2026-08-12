import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getEnv(): Promise<Env> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as Env;
}
