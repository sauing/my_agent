import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createRemoteJWKSet, jwtVerify } from "jose";

const root = path.join(process.cwd(), ".data", "siwc");
const credentialsPath = path.join(root, "credentials.json");
const pendingPath = path.join(root, "pending.json");
const issuer = "https://auth.openai.com";
const tokenUrl = `${issuer}/api/accounts/oauth/token`;
const resource = "https://api.openai.com/v1";
const requiredScope = "chatgpt.tokens.use.direct";
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

type Credentials = { clientId: string; hostId: string; accessToken: string; refreshToken: string; idToken: string; expiresAt: number; scopes: string; email?: string };
type Pending = { state: string; nonce: string; verifier: string; redirectUri: string; clientId: string; hostId: string; createdAt: number };

async function readJson<T>(file: string): Promise<T | null> { try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return null; } }
async function writePrivate(file: string, value: unknown) {
  await mkdir(root, { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value), { encoding: "utf8", mode: 0o600 });
  await rename(temp, file);
}
export async function credentials() { return readJson<Credentials>(credentialsPath); }
export async function beginLogin(redirectUri: string) {
  const saved = await credentials();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const hostId = saved?.hostId || `urn:uuid:${randomUUID()}`;
  const clientId = saved?.clientId || "dynamic_agent_client";
  await writePrivate(pendingPath, { state, nonce, verifier, redirectUri, clientId, hostId, createdAt: Date.now() } satisfies Pending);
  const url = new URL(`${issuer}/api/accounts/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("resource", resource);
  url.searchParams.set("ext_agent_host_id", hostId);
  if (!saved) url.searchParams.set("agent_name_hint", "My Agent");
  else url.searchParams.set("id_token_hint", saved.idToken);
  return url.toString();
}
export async function completeLogin(code: string, state: string, issuedClientId?: string) {
  const pending = await readJson<Pending>(pendingPath);
  if (!pending || pending.state !== state || Date.now() - pending.createdAt > 10 * 60_000) throw new Error("Sign-in expired or could not be verified. Please try again.");
  const response = await fetch(tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: issuedClientId || pending.clientId, code, code_verifier: pending.verifier, redirect_uri: pending.redirectUri, resource }) });
  if (!response.ok) throw new Error(`ChatGPT sign-in failed (${response.status}). Please try again.`);
  const tokens = await response.json() as { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number; scope?: string };
  if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token) throw new Error("ChatGPT did not return the required sign-in permissions. Please try again and approve access.");
  const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer, audience: issuedClientId || pending.clientId });
  if (payload.nonce !== pending.nonce) throw new Error("Could not verify the ChatGPT sign-in request.");
  if (typeof payload.sub !== "string") throw new Error("Could not verify the ChatGPT account.");
  const scopes = tokens.scope || "";
  if (!scopes.split(/\s+/).includes(requiredScope)) throw new Error("The required ChatGPT plan permission was not granted. Sign in again and approve it.");
  await writePrivate(credentialsPath, { clientId: issuedClientId || pending.clientId, hostId: pending.hostId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, idToken: tokens.id_token, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000, scopes, email: typeof payload.email === "string" ? payload.email : undefined } satisfies Credentials);
  await writePrivate(pendingPath, null);
}
export async function accessToken() {
  const saved = await credentials();
  if (!saved) throw new Error("Connect your ChatGPT account before starting a task.");
  if (saved.expiresAt > Date.now() + 60_000) return saved.accessToken;
  const response = await fetch(tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: saved.clientId, refresh_token: saved.refreshToken, resource }) });
  if (!response.ok) throw new Error("ChatGPT sign-in expired. Reconnect your ChatGPT account and try again.");
  const tokens = await response.json() as { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number; scope?: string };
  if (!tokens.access_token) throw new Error("Could not refresh ChatGPT sign-in. Please reconnect your account.");
  const updated = { ...saved, accessToken: tokens.access_token, refreshToken: tokens.refresh_token || saved.refreshToken, idToken: tokens.id_token || saved.idToken, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000, scopes: tokens.scope || saved.scopes };
  await writePrivate(credentialsPath, updated);
  return updated.accessToken;
}
export async function modelCatalog() {
  const saved = await credentials();
  if (!saved) return { connected: false as const, email: undefined, models: [] as Array<{ slug: string; display_name: string }> };
  try {
    const response = await fetch(`${resource}/models`, { headers: { authorization: `Bearer ${await accessToken()}` }, cache: "no-store" });
    if (!response.ok) return { connected: true as const, email: saved.email, models: [] as Array<{ slug: string; display_name: string }> };
    const data = await response.json() as { models?: Array<{ slug?: string; display_name?: string; visibility?: string }> };
    return { connected: true as const, email: saved.email, models: (data.models || []).filter(model => model.slug && model.visibility === "list").map(model => ({ slug: model.slug!, display_name: model.display_name || model.slug! })) };
  } catch { return { connected: true as const, email: saved.email, models: [] as Array<{ slug: string; display_name: string }> }; }
}
