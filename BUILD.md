# Building Loop

## Building a release

### Local (macOS)

Produce a signed-or-unsigned `.dmg` for both Apple Silicon and Intel:

```bash
npm run dist:mac
```

This runs `npm run build` (electron-vite → `out/`) and then packages the app
with electron-builder using `config/electron-builder.config.cjs`. The resulting
disk images land in `dist/`:

```
dist/Loop-<version>-arm64.dmg
dist/Loop-<version>-x64.dmg
```

To produce an unpacked `.app` without a `.dmg` (faster, for quick local checks):

```bash
npm run pack
```

### CI / tagged releases

A push to `main` (or a manual **Run workflow** dispatch) runs the
`Build macOS` GitHub Actions workflow (`.github/workflows/build.yml`), which
builds, tests, and packages an unsigned `.dmg`, then uploads it as a build
artifact named `loop-dmg`.

To cut a release, push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

On a `v*` tag the workflow additionally creates a GitHub Release and attaches
the `.dmg` files.

### Signing & notarization

CI builds are **not** signed with a Developer ID or notarized (no certificate in
CI: `CSC_IDENTITY_AUTO_DISCOVERY=false`). electron-builder still **ad-hoc signs**
the arm64 build so it launches — we deliberately do _not_ set `mac.identity: null`,
because that disables ad-hoc signing and makes Apple Silicon report the app as
_"Loop is damaged and can't be opened."_

### "Loop is damaged and can't be opened" (downloaded .dmg)

Apps downloaded from the internet get a quarantine attribute. Because this build
is only ad-hoc signed (not notarized), Gatekeeper blocks it. Fix it one of two ways:

```bash
# Option A — strip quarantine from the installed app (then open normally):
xattr -dr com.apple.quarantine /Applications/Loop.app

# Option B — right-click Loop.app in Finder → Open → Open (only needed once).
```

For a fully clean install with no warning you'd need an Apple Developer ID
certificate + notarization; build locally with your own credentials in that case.

## App icon

The app icon lives at `resources/build/icon.icns`. It is generated from
`resources/icon-source/icon.png` (a 1024×1024 master). To regenerate the master
and rebuild the `.icns`:

```bash
cd resources/icon-source
node render-icon.cjs 1024 icon.png   # regenerate the 1024 master

# rebuild the multi-resolution .icns
rm -rf icon.iconset && mkdir icon.iconset
for spec in 16:16x16 32:16x16@2x 32:32x32 64:32x32@2x \
            128:128x128 256:128x128@2x 256:256x256 512:256x256@2x \
            512:512x512 1024:512x512@2x; do
  node render-icon.cjs "${spec%%:*}" "icon.iconset/icon_${spec##*:}.png"
done
iconutil -c icns icon.iconset -o ../build/icon.icns
rm -rf icon.iconset
```
