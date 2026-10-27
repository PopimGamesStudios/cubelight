# Publishing Cubelight to GitHub

The app publishes to **`PopimGamesStudios/cubelight`**. That value is set in:

| File | Key |
| --- | --- |
| `electron-builder.yml` | `publish.owner`, `publish.repo` |
| `src/lib/links.ts` | `GITHUB_REPO` |
| `shared/defaults.ts` | `launcher.modrinthUserAgent` |

Change all three if you publish elsewhere, then rebuild.

## 1. Create the repository

<https://github.com/new>

- Name: `cubelight`
- Visibility: **Public** (the updater fetches releases anonymously)
- Do not add a README, .gitignore or license — the repo must start empty

## 2. Push the code

```powershell
cd "C:\Users\dani2\Documents\Default Project\cubelight"
git remote add origin https://github.com/PopimGamesStudios/cubelight.git
git push -u origin main
```

If Git Credential Manager opens a browser window, sign in and approve — the previously saved
token has expired.

## 3. Publish the first release

```powershell
git tag v1.0.0
git push origin v1.0.0
```

The tag triggers `.github/workflows/release.yml`, which builds Windows, macOS and Linux and
uploads the installers plus the update manifests (`latest.yml`, `latest-mac.yml`,
`latest-linux.yml`) to a published GitHub Release. Watch it under the **Actions** tab; the first
run takes about 10 minutes.

## Manual release (no Actions)

1. Push the code as above.
2. Open **Releases → Draft a new release**, tag `v1.0.0`.
3. Upload from `release/`:
   - `Cubelight-Setup-1.0.0.exe`
   - `Cubelight-Setup-1.0.0.exe.blockmap`
   - `latest.yml`
   - `Cubelight-1.0.0-portable.exe`
4. Publish it. It must not stay a draft, or auto-update cannot see it.

## Resulting links

```
https://github.com/PopimGamesStudios/cubelight/releases/latest
https://github.com/PopimGamesStudios/cubelight/releases/latest/download/Cubelight-Setup-1.0.0.exe
```

## Later releases

```powershell
npm version patch
git push --follow-tags
```

`npm version` bumps `package.json` and creates the tag, and the workflow rejects a tag that does
not match the version.
