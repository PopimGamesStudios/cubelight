# Installing Cubelight

Cubelight is a Windows desktop application. Download it from the [latest release](https://github.com/PopimGamesStudios/cubelight/releases/latest) and pick **one** of the two Windows files:

| File | What it does | Best for |
| --- | --- | --- |
| `Cubelight-1.0.2-portable.exe` | Runs immediately. Nothing is installed. | Fastest, zero decisions |
| `Cubelight-Setup-1.0.2.exe` | Installs the app, adds a desktop + Start Menu shortcut and an uninstaller. | Everyday use |

Both are 64-bit builds for Windows 10 and 11. Both keep your settings, accounts and instances in `%APPDATA%\Cubelight`.

---

## Option A: Portable (easiest)

1. Copy `Cubelight-1.0.2-portable.exe` anywhere you like (Desktop is fine).
2. Double-click it.
3. Cubelight opens. Done.

If Windows shows **"Windows protected your PC"**, click **More info → Run anyway**. The build is not code-signed, so this warning is expected.

To remove it later: close Cubelight and delete the `.exe`.

---

## Option B: Setup (installs Cubelight)

1. Double-click `Cubelight-Setup-1.0.2.exe`.
2. If Windows shows **"Windows protected your PC"**, click **More info → Run anyway**.
3. On **Choose Installation Options**, leave **Only for me** selected and click **Next**. This installs without an administrator password.
4. On **Choose Install Location**, keep the default and click **Install**:
   `C:\Users\<you>\AppData\Local\Programs\Cubelight`
   You can pick another folder if you prefer.
5. Wait while the progress bar finishes (usually 10-30 seconds).
6. On **Completing Cubelight Setup**, leave **Run Cubelight** checked and click **Finish**.

You now have a **Cubelight** shortcut on the desktop and in the Start Menu.

### Uninstall

Open **Settings → Apps → Installed apps**, find **Cubelight**, and choose **Uninstall**.
Your instances and settings are kept in `%APPDATA%\Cubelight`. Delete that folder too if you want a completely clean removal.

---

## First launch

1. Cubelight starts with an offline profile already created, so you can play immediately.
2. Click **New instance** on the dashboard.
3. Choose a name, a Minecraft version and a mod loader (Vanilla, Fabric, Forge or NeoForge), then **Create instance**.
4. Click **Launch**. Cubelight downloads the game files and a matching Java runtime the first time, then starts Minecraft.

Optional extras:

- **Mods & plugins**: Modrinth works out of the box. CurseForge needs a free API key pasted in **Settings → Integrations**.
- **Microsoft account**: needs an Azure client ID in **Settings → Integrations**. Offline profiles work without it.
- **Tray and startup**: **Settings → Launch & Java**.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Windows protected your PC" | Click **More info → Run anyway**. The build is unsigned. |
| Antivirus deletes or blocks the app | Add an exclusion for the Cubelight folder or the portable `.exe`. |
| App opens to a blank window | Check `%APPDATA%\Cubelight\logs\main.log` for the error. |
| Game will not start | Open the instance, choose **Logs**, and read the last lines. Usually a Java or memory issue. |
| No updates are found | Auto-update reads the public GitHub Releases feed. Make sure the release is published and not a draft. |

---

## Where Cubelight stores things

| Item | Location |
| --- | --- |
| Settings, accounts, instance list | `%APPDATA%\Cubelight` |
| Game files for each instance | `%APPDATA%\Cubelight\instances\<instance id>` |
| Launch logs | `%APPDATA%\Cubelight\logs` |
| Installed app (Setup only) | `%LOCALAPPDATA%\Programs\Cubelight` |
