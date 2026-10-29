export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  id: "terms" | "privacy";
  title: string;
  effective: string;
  summary: string;
  sections: LegalSection[];
}

export const TERMS: LegalDocument = {
  id: "terms",
  title: "Terms & Conditions",
  effective: "October 29, 2026",
  summary:
    "These terms cover your use of the Cubelight desktop application. Cubelight is free, open source and not affiliated with Mojang Studios or Microsoft.",
  sections: [
    {
      title: "1. Agreement",
      paragraphs: [
        "By downloading, installing or using Cubelight you agree to these terms. If you do not agree, do not install or use the application.",
        "These terms apply to the application distributed through the Cubelight GitHub repository. They do not replace the licence of the source code, which is published under the MIT licence.",
      ],
    },
    {
      title: "2. What Cubelight is",
      paragraphs: [
        "Cubelight is a desktop launcher for Minecraft: Java Edition. It creates isolated instance folders, downloads the game files and a matching Java runtime, and installs content from Modrinth and CurseForge into those folders.",
        "Cubelight is an independent project. It is not approved by, endorsed by or affiliated with Mojang Studios, Microsoft, Modrinth or CurseForge.",
      ],
    },
    {
      title: "3. Licence",
      paragraphs: [
        "The Cubelight source code is available under the MIT licence. You may read it, modify it and redistribute it under the conditions of that licence.",
        "These terms do not reduce any rights granted to you by the MIT licence for the source code.",
      ],
    },
    {
      title: "4. Your Minecraft account",
      paragraphs: [
        "You need a legitimate copy of Minecraft: Java Edition to play online. Cubelight can create offline profiles for singleplayer and offline servers, but you are responsible for using them in line with the Minecraft End User Licence Agreement.",
        "Do not use Cubelight to bypass licensing, authentication or access controls.",
      ],
    },
    {
      title: "5. Third-party services and content",
      paragraphs: [
        "Cubelight connects directly to services that it does not control, including Mojang and Microsoft, Modrinth, CurseForge, Adoptium and GitHub. Your use of those services is governed by their own terms and privacy policies.",
        "Mods, plugins, resource packs and shaders are created by third parties. Cubelight does not review, verify or endorse them. Install content from sources you trust, and keep backups of worlds that matter to you.",
      ],
    },
    {
      title: "6. API keys and credentials",
      paragraphs: [
        "Some integrations require credentials that you supply: a CurseForge API key and an Azure application client ID. These values are stored in your local settings file.",
        "The CurseForge API key is stored as plain text because the application must send it with each request. Keep your settings file private and revoke the key if it is exposed.",
      ],
    },
    {
      title: "7. Acceptable use",
      paragraphs: ["You agree not to use Cubelight to:"],
      bullets: [
        "distribute malware or content that harms other users",
        "infringe copyrights, trademarks or other rights",
        "break applicable laws or the rules of a server you join",
        "attack, overload or circumvent the services that Cubelight connects to",
      ],
    },
    {
      title: "8. Updates",
      paragraphs: [
        "Packaged builds check GitHub Releases for new versions and can download and install updates. Automatic checks and downloads can be turned off in Settings.",
        "Updates may change features or these terms. The effective date at the top of this page shows when the current version took effect.",
      ],
    },
    {
      title: "9. No warranty",
      paragraphs: [
        "Cubelight is provided as is and without warranty of any kind, express or implied, including fitness for a particular purpose and non-infringement.",
        "Minecraft updates, mods and third-party servers can break worlds or installations. Back up anything you cannot afford to lose.",
      ],
    },
    {
      title: "10. Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by law, the Cubelight authors are not liable for indirect, incidental or consequential damages, loss of data, loss of worlds, or actions taken against your account by a third-party service.",
      ],
    },
    {
      title: "11. Changes to these terms",
      paragraphs: [
        "These terms may be updated when the application changes. The current version is always included in the application and in the repository. Continuing to use Cubelight after an update means you accept the revised terms.",
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [
        "Questions about these terms can be raised in the issue tracker at github.com/PopimGamesStudios/cubelight/issues.",
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  id: "privacy",
  title: "Privacy Policy",
  effective: "October 29, 2026",
  summary:
    "Cubelight has no telemetry, no analytics and no advertising. Your settings, instances and logs stay on your computer. The only network requests are the ones needed to download game files, content and updates.",
  sections: [
    {
      title: "1. Summary",
      paragraphs: [
        "The Cubelight project does not operate a server that collects user data. There is no account with the project, no usage tracking and no crash reporting.",
        "Data leaves your computer only when the application contacts a service that you are using, such as Mojang, Modrinth, CurseForge, Adoptium or GitHub.",
      ],
    },
    {
      title: "2. Data stored on your computer",
      paragraphs: ["Cubelight writes the following files to its data directory:"],
      bullets: [
        "settings.json: appearance preferences, launcher behaviour, your CurseForge API key, your Azure client ID and the Modrinth user agent string",
        "instances and their metadata: names, Minecraft versions, loaders, memory settings and the list of installed content",
        "game files, worlds, mods, plugins, resource packs and shaders inside each instance folder",
        "launch logs written for each instance",
        "the Microsoft account token, when you sign in with a Microsoft account",
      ],
    },
    {
      title: "3. Account tokens",
      paragraphs: [
        "Microsoft refresh tokens are encrypted with the operating system keychain through Electron safeStorage when it is available. If the keychain is unavailable, the token is stored with basic obfuscation and the application logs a warning.",
        "Signing out removes the stored token.",
      ],
    },
    {
      title: "4. Network requests",
      paragraphs: ["Cubelight contacts the following services, and only for the reasons listed:"],
      bullets: [
        "Mojang and Microsoft: version manifests, libraries, assets and Microsoft account authentication",
        "Adoptium: downloading a Temurin Java runtime when a suitable runtime is not installed",
        "Modrinth: searching projects and downloading the files you choose, identified by the user agent shown in Settings",
        "CurseForge: searching projects and downloading the files you choose, using the API key you provided",
        "GitHub: checking the public release feed for updates and opening links you click",
      ],
    },
    {
      title: "5. What is not collected",
      paragraphs: [
        "Cubelight does not collect analytics, telemetry, advertising identifiers, device fingerprints or crash reports. It does not read your browsing history, contacts or unrelated files.",
        "The application window does not load remote web pages, so Cubelight does not set cookies for third-party sites. External links open in your default browser.",
      ],
    },
    {
      title: "6. Sharing",
      paragraphs: [
        "The Cubelight project does not sell, rent or share personal data. Requests go directly from your computer to the third-party service involved. Those services receive your IP address and whatever information is required for the request, under their own privacy policies.",
      ],
    },
    {
      title: "7. Retention and deletion",
      paragraphs: [
        "Cubelight keeps local data until you remove it. Uninstalling the application does not delete your data directory.",
        "To remove everything, sign out of your Microsoft account, uninstall Cubelight and delete the data directory listed in Settings, About. That removes settings, instances, worlds, logs and stored tokens.",
      ],
    },
    {
      title: "8. Security",
      paragraphs: [
        "The renderer runs without Node.js access, with context isolation and sandboxing enabled. Privileged operations go through a typed preload bridge. Account tokens use the operating system keychain when possible.",
        "No software is perfectly secure. Keep your operating system updated and do not share your settings file, because it can contain API keys.",
      ],
    },
    {
      title: "9. Children",
      paragraphs: [
        "Cubelight is not directed at children under 13. Minecraft and Microsoft accounts have their own age requirements, which you are responsible for following.",
      ],
    },
    {
      title: "10. Your control",
      paragraphs: [
        "Because the data is stored locally, you control it directly. You can inspect the settings file, delete individual instances, clear logs or remove the entire data directory at any time.",
      ],
    },
    {
      title: "11. Changes to this policy",
      paragraphs: [
        "This policy may be updated when the application changes. The current version is always included in the application and in the repository, with the effective date shown above.",
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [
        "Privacy questions can be raised in the issue tracker at github.com/PopimGamesStudios/cubelight/issues.",
      ],
    },
  ],
};
