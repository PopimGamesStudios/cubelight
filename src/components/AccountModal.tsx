import { useEffect, useState } from "react";
import { Check, Clipboard, ExternalLink, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { classNames } from "@/lib/format";
import { useApp } from "@/store/app";
import { Button, Chip, Field, Modal, Segmented } from "./ui";

type Mode = "offline" | "microsoft";

export function AccountModal() {
  const open = useApp((state) => state.accountModalOpen);
  const close = useApp((state) => state.closeAccount);
  const account = useApp((state) => state.account);
  const deviceCode = useApp((state) => state.deviceCode);
  const settings = useApp((state) => state.settings);
  const patchSettings = useApp((state) => state.patchSettings);
  const offlineLogin = useApp((state) => state.offlineLogin);
  const microsoftLogin = useApp((state) => state.microsoftLogin);
  const logout = useApp((state) => state.logout);
  const openSettings = useApp((state) => state.openSettings);

  const [mode, setMode] = useState<Mode>("offline");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(account?.mode === "microsoft" ? "microsoft" : "offline");
    setName(account?.name ?? "");
    setClientId(settings.launcher.msClientId);
    setError(null);
    setCopied(false);
  }, [open, account, settings.launcher.msClientId]);

  const submitOffline = async () => {
    setError(null);
    setBusy(true);
    try {
      await offlineLogin(name);
      close();
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const submitMicrosoft = async () => {
    setError(null);
    if (!clientId.trim()) {
      setError("Paste your Azure application (client) ID first.");
      return;
    }
    if (clientId.trim() !== settings.launcher.msClientId) {
      patchSettings({ launcher: { msClientId: clientId.trim() } });
    }
    setBusy(true);
    try {
      await microsoftLogin(clientId.trim());
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!deviceCode) return;
    try {
      await navigator.clipboard.writeText(deviceCode.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the code. Select it manually.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Account"
      eyebrow="Identity"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Close
          </Button>
          {mode === "offline" ? (
            <Button variant="primary" onClick={() => void submitOffline()} loading={busy} disabled={!name.trim()}>
              Use offline profile
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => void submitMicrosoft()}
              loading={busy}
              icon={<ShieldCheck size={14} />}
            >
              {deviceCode ? "Waiting for Microsoft…" : "Start Microsoft sign-in"}
            </Button>
          )}
        </>
      }
    >
      <div className="account-current">
        <span className="avatar avatar--lg">
          {account?.avatarUrl ? <img src={account.avatarUrl} alt="" /> : <span>{account?.name?.slice(0, 2).toUpperCase() ?? "?"}</span>}
        </span>
        <div className="account-current-copy">
          <strong>{account?.name ?? "No profile"}</strong>
          <span>{account?.mode === "microsoft" ? "Microsoft account" : "Offline profile"}</span>
          {account?.uuid ? <code>{account.uuid}</code> : null}
        </div>
        {account ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut size={13} />}
            onClick={() => void logout()}
            disabled={busy}
          >
            Sign out
          </Button>
        ) : null}
      </div>

      <Segmented
        value={mode}
        onChange={(value) => {
          setMode(value);
          setError(null);
        }}
        ariaLabel="Account type"
        options={[
          { value: "offline", label: "Offline", icon: <UserRound size={14} /> },
          { value: "microsoft", label: "Microsoft", icon: <ShieldCheck size={14} /> },
        ]}
      />

      {mode === "offline" ? (
        <div className="account-panel">
          <Field
            label="Username"
            hint="3-16 characters, letters, numbers or underscores. Offline profiles can play singleplayer and offline servers."
          >
            <input
              className="input"
              value={name}
              maxLength={16}
              autoFocus
              spellCheck={false}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitOffline();
              }}
              placeholder="Steve"
            />
          </Field>
        </div>
      ) : (
        <div className="account-panel">
          <div className="callout callout--info">
            <div className="callout-head">
              <ShieldCheck size={14} />
              <strong>Bring your own Azure client</strong>
            </div>
            <p>
              Cubelight ships without a bundled client ID. Create a public client app in Azure, enable{" "}
              <em>Allow public client flows</em>, then paste its Application (client) ID below.
            </p>
            <button
              type="button"
              className="link-button"
              onClick={() => void api.app.openExternal("https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade")}
            >
              Open Azure app registrations <ExternalLink size={12} />
            </button>
          </div>

          <Field label="Azure client ID" hint="Stored locally in your Cubelight settings file.">
            <input
              className="input mono"
              value={clientId}
              spellCheck={false}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) => setClientId(event.target.value)}
            />
          </Field>

          {deviceCode ? (
            <div className="device-code">
              <span className="device-code-label">Enter this code at Microsoft</span>
              <button type="button" className="device-code-value" onClick={() => void copyCode()}>
                <code>{deviceCode.userCode}</code>
                {copied ? <Check size={15} /> : <Clipboard size={15} />}
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => void api.app.openExternal(deviceCode.verificationUri)}
              >
                {deviceCode.verificationUri.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
              </button>
              <p className="device-code-note">
                {deviceCode.message ?? "This window updates automatically once you approve the sign-in."}
              </p>
            </div>
          ) : null}

          {account?.mode === "microsoft" ? (
            <div className="inline-status">
              <Chip tone="success">
                <Check size={11} /> Microsoft profile active
              </Chip>
              <span>Minecraft ownership is verified at launch.</span>
            </div>
          ) : null}

          <button
            type="button"
            className="link-button"
            onClick={() => {
              close();
              openSettings("integrations");
            }}
          >
            Manage integrations in Settings
          </button>
        </div>
      )}

      {error ? (
        <div className={classNames("callout", "callout--error")}>
          <strong>Something went wrong</strong>
          <p>{error}</p>
        </div>
      ) : null}
    </Modal>
  );
}
