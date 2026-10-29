# Privacy Policy

**Effective October 29, 2026**

Cubelight has no telemetry, no analytics and no advertising. Your settings, instances and logs stay on your computer. The only network requests are the ones needed to download game files, content and updates.

## 1. Summary

The Cubelight project does not operate a server that collects user data. There is no account with the project, no usage tracking and no crash reporting.

Data leaves your computer only when the application contacts a service that you are using, such as Mojang, Modrinth, CurseForge, Adoptium or GitHub.

## 2. Data stored on your computer

Cubelight writes the following files to its data directory:

- `settings.json`: appearance preferences, launcher behaviour, your CurseForge API key, your Azure client ID and the Modrinth user agent string
- instances and their metadata: names, Minecraft versions, loaders, memory settings and the list of installed content
- game files, worlds, mods, plugins, resource packs and shaders inside each instance folder
- launch logs written for each instance
- the Microsoft account token, when you sign in with a Microsoft account

The default locations are:

| Platform | Data directory |
| --- | --- |
| Windows | `%APPDATA%\Cubelight` |
| macOS | `~/Library/Application Support/Cubelight` |
| Linux | `~/.config/Cubelight` |

## 3. Account tokens

Microsoft refresh tokens are encrypted with the operating system keychain through Electron `safeStorage` when it is available. If the keychain is unavailable, the token is stored with basic obfuscation and the application logs a warning.

Signing out removes the stored token.

## 4. Network requests

Cubelight contacts the following services, and only for the reasons listed:

- **Mojang and Microsoft**: version manifests, libraries, assets and Microsoft account authentication
- **Adoptium**: downloading a Temurin Java runtime when a suitable runtime is not installed
- **Modrinth**: searching projects and downloading the files you choose, identified by the user agent shown in Settings
- **CurseForge**: searching projects and downloading the files you choose, using the API key you provided
- **GitHub**: checking the public release feed for updates and opening links you click

## 5. What is not collected

Cubelight does not collect analytics, telemetry, advertising identifiers, device fingerprints or crash reports. It does not read your browsing history, contacts or unrelated files.

The application window does not load remote web pages, so Cubelight does not set cookies for third-party sites. External links open in your default browser.

## 6. Sharing

The Cubelight project does not sell, rent or share personal data. Requests go directly from your computer to the third-party service involved. Those services receive your IP address and whatever information is required for the request, under their own privacy policies.

## 7. Retention and deletion

Cubelight keeps local data until you remove it. Uninstalling the application does not delete your data directory.

To remove everything, sign out of your Microsoft account, uninstall Cubelight and delete the data directory listed in **Settings, About**. That removes settings, instances, worlds, logs and stored tokens.

## 8. Security

The renderer runs without Node.js access, with context isolation and sandboxing enabled. Privileged operations go through a typed preload bridge. Account tokens use the operating system keychain when possible.

No software is perfectly secure. Keep your operating system updated and do not share your settings file, because it can contain API keys.

## 9. Children

Cubelight is not directed at children under 13. Minecraft and Microsoft accounts have their own age requirements, which you are responsible for following.

## 10. Your control

Because the data is stored locally, you control it directly. You can inspect the settings file, delete individual instances, clear logs or remove the entire data directory at any time.

## 11. Changes to this policy

This policy may be updated when the application changes. The current version is always included in the application and in the repository, with the effective date shown above.

## 12. Contact

Privacy questions can be raised in the [issue tracker](https://github.com/PopimGamesStudios/cubelight/issues).
