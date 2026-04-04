# Syncing TYPO3 Core TypeScript Files

The `Build/Sources/TypeScript/backend/` and `Build/Sources/TypeScript/core/` directories
contain TypeScript source files copied from the TYPO3 CMS core monorepo. These files are
**not our code** -- they are needed for type resolution when compiling our TypeScript sources
in `Build/Sources/TypeScript/friendsoftypo3/content-blocks-gui/`.

## When to sync

- When upgrading to a new TYPO3 major or minor version
- When using new TYPO3 backend/core APIs that weren't imported before
- When TypeScript compilation shows new unresolved type errors in our files

Syncing is **rarely needed** -- typically only on TYPO3 version upgrades.

## How to sync

### Using the ddev command (recommended)

```bash
ddev sync-typo3-core-typescript-files /path/to/typo3-core-checkout
```

The path should point to a local TYPO3 core development checkout
(https://github.com/typo3/typo3) that contains `Build/Sources/TypeScript/`.

Default path if omitted: `../typo3`

### Manual sync

1. Clone or update the TYPO3 core repo:
   ```bash
   git clone --depth 1 https://github.com/typo3/typo3.git /tmp/typo3-core
   # or: cd /path/to/typo3-core && git pull
   ```

2. Copy the TypeScript directories:
   ```bash
   rsync -av --delete /path/to/typo3-core/Build/Sources/TypeScript/backend/ Build/Sources/TypeScript/backend/
   rsync -av --delete /path/to/typo3-core/Build/Sources/TypeScript/core/ Build/Sources/TypeScript/core/
   ```

3. Copy the TYPO3 global type declaration:
   ```bash
   cp /path/to/typo3-core/Build/types/TYPO3/index.d.ts Build/types/TYPO3/index.d.ts
   ```

## After syncing

1. **Check Node.js version**: Compare `engines.node` in the TYPO3 core's `Build/package.json`
   with ours in `Build/package.json`. Update if the required version changed.

2. **Check for new dependencies**: Run `npm run build` and look for `TS2307: Cannot find module`
   errors. If new modules are imported by the core files, install their type packages:
   ```bash
   cd Build && npm install --save-dev @types/missing-package
   ```

3. **Check for breaking changes**: If our files (`friendsoftypo3/`) show new type errors,
   the TYPO3 API we use may have changed. Update our code accordingly.

4. **Verify the build**: Run `ddev javascript` and ensure our files compile and the
   post-processor generates output in `Resources/Public/JavaScript/content-blocks-gui/`.

5. **Commit**: Commit the updated core files and any fixes together:
   ```
   git add Build/Sources/TypeScript/backend/ Build/Sources/TypeScript/core/ Build/types/
   git commit -m "[TASK] Sync TYPO3 core TypeScript files for vXX.Y"
   ```

## Expected type errors in core files

The TYPO3 core TypeScript files produce some type errors when compiled outside the full
core build environment. This is expected and does not affect our code. The `tsconfig.json`
uses `noEmitOnError: false` to emit our compiled files regardless.

Current core files are synced from: **TYPO3 v13.4.x**
