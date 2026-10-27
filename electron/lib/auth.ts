import { safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { accountFile } from "./paths";
import { logger } from "./logger";
import type { DeviceCodeInfo, PublicAccount } from "../../shared/types";
import type { LaunchAccount } from "./minecraft";

const DEVICE_CODE_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN_URL = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL = "https://api.minecraftservices.com/minecraft/profile";

interface StoredAccount {
  mode: "offline" | "microsoft";
  name: string;
  uuid: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  msClientId?: string;
}

interface StoredFile {
  v: 1;
  encrypted: boolean;
  payload: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
  message?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface XboxResponse {
  Token: string;
  DisplayClaims: { xui: Array<{ uhs: string }> };
}

interface MinecraftTokenResponse {
  access_token: string;
  expires_in: number;
}

interface MinecraftProfile {
  id: string;
  name: string;
}

export interface AuthEvents {
  deviceCode: (info: DeviceCodeInfo) => void;
  account: (account: PublicAccount | null) => void;
  error: (message: string) => void;
}

let activeFlow: { cancelled: boolean } | null = null;
let cachedAccount: StoredAccount | null | undefined;

function readStored(): StoredAccount | null {
  try {
    if (!fs.existsSync(accountFile())) return null;
    const file = JSON.parse(fs.readFileSync(accountFile(), "utf8")) as StoredFile;
    let json: string;
    if (file.encrypted) {
      if (!safeStorage.isEncryptionAvailable()) return null;
      json = safeStorage.decryptString(Buffer.from(file.payload, "base64"));
    } else {
      json = Buffer.from(file.payload, "base64").toString("utf8");
    }
    const parsed = JSON.parse(json) as StoredAccount;
    if (!parsed || (parsed.mode !== "offline" && parsed.mode !== "microsoft")) return null;
    return parsed;
  } catch (error) {
    logger.warn("Could not read account file", error);
    return null;
  }
}

function writeStored(account: StoredAccount): void {
  const json = JSON.stringify(account);
  let file: StoredFile;
  try {
    if (safeStorage.isEncryptionAvailable()) {
      file = {
        v: 1,
        encrypted: true,
        payload: safeStorage.encryptString(json).toString("base64"),
      };
    } else {
      file = { v: 1, encrypted: false, payload: Buffer.from(json, "utf8").toString("base64") };
    }
  } catch (error) {
    logger.warn("safeStorage unavailable; account tokens will be stored with basic obfuscation", error);
    file = { v: 1, encrypted: false, payload: Buffer.from(json, "utf8").toString("base64") };
  }
  fs.mkdirSync(path.dirname(accountFile()), { recursive: true });
  fs.writeFileSync(accountFile(), JSON.stringify(file, null, 2), "utf8");
  cachedAccount = account;
}

function clearStored(): void {
  try {
    if (fs.existsSync(accountFile())) fs.rmSync(accountFile(), { force: true });
  } catch (error) {
    logger.warn("Could not remove account file", error);
  }
  cachedAccount = null;
}

function offlineUuid(name: string): string {
  const hash = crypto.createHash("md5").update(`OfflinePlayer:${name}`, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function defaultOffline(): StoredAccount {
  return { mode: "offline", name: "Player", uuid: offlineUuid("Player") };
}

function ensureAccount(): StoredAccount {
  if (cachedAccount === undefined) {
    cachedAccount = readStored();
  }
  if (!cachedAccount) {
    cachedAccount = defaultOffline();
    writeStored(cachedAccount);
  }
  return cachedAccount;
}

export function toPublic(account: StoredAccount | null): PublicAccount | null {
  if (!account) return null;
  return {
    mode: account.mode,
    name: account.name,
    uuid: account.uuid,
    expiresAt: account.expiresAt,
  };
}

export function getPublicAccount(): PublicAccount | null {
  return toPublic(ensureAccount());
}

export function setOfflineAccount(name: string): PublicAccount {
  const trimmed = name.trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) {
    throw new Error("Offline usernames must be 3–16 characters using letters, numbers or underscores.");
  }
  const account: StoredAccount = { mode: "offline", name: trimmed, uuid: offlineUuid(trimmed) };
  writeStored(account);
  return toPublic(account)!;
}

async function postForm(url: string, body: Record<string, string>): Promise<{ status: number; data: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(25_000),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { error_description: text };
  }
  return { status: response.status, data };
}

function errorText(data: Record<string, unknown>): string {
  const candidate = data.error_description ?? data.error ?? data.message;
  return typeof candidate === "string" ? candidate : "Microsoft sign-in failed.";
}

function xboxError(code: unknown): string {
  switch (Number(code)) {
    case 2148916233:
      return "This Microsoft account doesn't have an Xbox profile. Create one at xbox.com, then try again.";
    case 2148916235:
      return "Xbox Live isn't available in this account's country or region.";
    case 2148916236:
    case 2148916237:
      return "This account needs adult verification before it can sign in.";
    case 2148916238:
      return "This is a child account. An adult must add it to a Microsoft family group first.";
    default:
      return "Xbox Live authentication failed.";
  }
}

async function exchangeForMinecraft(msToken: TokenResponse, clientId: string): Promise<StoredAccount> {
  const xblResponse = await fetch(XBL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${msToken.access_token}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const xbl = (await xblResponse.json()) as XboxResponse & { XErr?: number };
  if (!xblResponse.ok || !xbl.Token) {
    throw new Error(xboxError(xbl.XErr));
  }

  const xstsResponse = await fetch(XSTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xbl.Token],
      },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const xsts = (await xstsResponse.json()) as XboxResponse & { XErr?: number };
  if (!xstsResponse.ok || !xsts.Token) {
    throw new Error(xboxError(xsts.XErr));
  }

  const uhs = xsts.DisplayClaims?.xui?.[0]?.uhs;
  if (!uhs) throw new Error("Xbox Live returned an incomplete response.");

  const mcResponse = await fetch(MC_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xsts.Token}` }),
    signal: AbortSignal.timeout(25_000),
  });
  const mcToken = (await mcResponse.json()) as MinecraftTokenResponse & { errorMessage?: string };
  if (!mcResponse.ok || !mcToken.access_token) {
    throw new Error(mcToken.errorMessage || "Minecraft authentication failed.");
  }

  const profileResponse = await fetch(MC_PROFILE_URL, {
    headers: { Authorization: `Bearer ${mcToken.access_token}` },
    signal: AbortSignal.timeout(25_000),
  });
  if (profileResponse.status === 404) {
    throw new Error("This Microsoft account doesn't own Minecraft: Java Edition.");
  }
  if (!profileResponse.ok) {
    throw new Error("Could not load the Minecraft profile for this account.");
  }
  const profile = (await profileResponse.json()) as MinecraftProfile;
  if (!profile?.id || !profile?.name) {
    throw new Error("Minecraft returned an incomplete profile.");
  }

  return {
    mode: "microsoft",
    name: profile.name,
    uuid: profile.id,
    accessToken: mcToken.access_token,
    refreshToken: msToken.refresh_token,
    expiresAt: Date.now() + Math.max(60, mcToken.expires_in) * 1000,
    msClientId: clientId,
  };
}

async function refreshMicrosoft(account: StoredAccount): Promise<StoredAccount> {
  if (!account.refreshToken || !account.msClientId) {
    throw new Error("Microsoft session expired. Sign in again.");
  }
  const { status, data } = await postForm(TOKEN_URL, {
    client_id: account.msClientId,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    scope: "XboxLive.signin offline_access",
  });
  if (status !== 200) {
    throw new Error(errorText(data));
  }
  return exchangeForMinecraft(data as unknown as TokenResponse, account.msClientId);
}

export async function getAccountForLaunch(): Promise<LaunchAccount> {
  const account = ensureAccount();
  if (account.mode === "offline") {
    return { mode: "offline", name: account.name, uuid: account.uuid, accessToken: "0" };
  }
  if (!account.expiresAt || account.expiresAt - Date.now() < 5 * 60_000) {
    try {
      const refreshed = await refreshMicrosoft(account);
      writeStored(refreshed);
      return {
        mode: "microsoft",
        name: refreshed.name,
        uuid: refreshed.uuid,
        accessToken: refreshed.accessToken!,
      };
    } catch (error) {
      logger.warn("Microsoft token refresh failed", error);
      throw new Error(
        "Your Microsoft session expired. Sign in again from the account menu in the sidebar.",
      );
    }
  }
  if (!account.accessToken) throw new Error("Microsoft session is missing a token. Sign in again.");
  return { mode: "microsoft", name: account.name, uuid: account.uuid, accessToken: account.accessToken };
}

export async function beginMicrosoftLogin(clientId: string, events: AuthEvents): Promise<DeviceCodeInfo> {
  const trimmed = clientId.trim();
  if (!trimmed) {
    throw new Error("Add your Microsoft Azure client ID in Settings → Integrations first.");
  }
  if (activeFlow) throw new Error("A Microsoft sign-in is already in progress.");

  const { status, data } = await postForm(DEVICE_CODE_URL, {
    client_id: trimmed,
    scope: "XboxLive.signin offline_access",
  });
  if (status !== 200) {
    throw new Error(errorText(data));
  }
  const device = data as unknown as DeviceCodeResponse;
  const info: DeviceCodeInfo = {
    userCode: device.user_code,
    verificationUri: device.verification_uri,
    expiresIn: device.expires_in,
    message: device.message,
  };
  events.deviceCode(info);

  const flow = { cancelled: false };
  activeFlow = flow;
  void (async () => {
    try {
      let interval = Math.max(2, device.interval || 5) + 2;
      const deadline = Date.now() + device.expires_in * 1000;
      let token: TokenResponse | null = null;
      while (Date.now() < deadline) {
        if (flow.cancelled) return;
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
        if (flow.cancelled) return;
        const poll = await postForm(TOKEN_URL, {
          client_id: trimmed,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: device.device_code,
        });
        if (poll.status === 200) {
          token = poll.data as unknown as TokenResponse;
          break;
        }
        const error = String(poll.data.error ?? "");
        if (error === "authorization_pending") continue;
        if (error === "slow_down") {
          interval += 5;
          continue;
        }
        if (error === "expired_token") {
          throw new Error("The sign-in code expired. Start Microsoft sign-in again.");
        }
        if (error === "authorization_declined") {
          throw new Error("Microsoft sign-in was declined.");
        }
        throw new Error(errorText(poll.data));
      }
      if (!token) throw new Error("Microsoft sign-in timed out. Start it again.");

      const account = await exchangeForMinecraft(token, trimmed);
      writeStored(account);
      events.account(toPublic(account));
    } catch (error) {
      logger.warn("Microsoft login failed", error);
      events.error(error instanceof Error ? error.message : String(error));
    } finally {
      if (activeFlow === flow) activeFlow = null;
    }
  })();

  return info;
}

export function cancelMicrosoftLogin(): void {
  if (activeFlow) activeFlow.cancelled = true;
  activeFlow = null;
}

export function logout(): PublicAccount {
  cancelMicrosoftLogin();
  clearStored();
  const account = defaultOffline();
  writeStored(account);
  return toPublic(account)!;
}

export function initAuth(): PublicAccount | null {
  return getPublicAccount();
}
