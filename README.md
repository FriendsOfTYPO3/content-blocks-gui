[![TYPO3 compatibility](https://img.shields.io/badge/TYPO3-13.4%20%7C%2014.3-ff8700?maxAge=3600&logo=typo3)](https://get.typo3.org/)

# TYPO3 Content Blocks GUI

> [!WARNING]
> **Beta state**: This extension may contain bugs and can potentially break
> your TYPO3 installation. **Do not install on production systems.** Use only
> in development environments.

The Content Blocks GUI provides a visual backend module for creating and editing
[Content Blocks](https://github.com/friendsoftypo3/content-blocks) definitions.
It serves as a kickstarter and YAML editor for the Content Blocks extension,
allowing integrators to build Content Elements, Page Types, Record Types, and
Basics through a drag-and-drop interface instead of writing YAML by hand.

|                              | URL                                                                                 |
|------------------------------|-------------------------------------------------------------------------------------|
| **Repository:**              | https://github.com/FriendsOfTYPO3/content-blocks-gui                               |
| **TER:**                     | https://extensions.typo3.org/extension/content_blocks_gui                           |
| **Content Blocks:**          | https://github.com/friendsoftypo3/content-blocks                                    |
| **Content Blocks Docs:**     | https://docs.typo3.org/p/friendsoftypo3/content-blocks/main/en-us/                  |

## Features

**Visual Editor**

- Three-pane drag-and-drop editor for composing Content Block field definitions
- Left pane with settings, field component library, and Basics management
- Middle pane for visual field arrangement with nested field support (Collections, Palettes)
- Right pane with field-specific property configuration (value pickers, ranges, sliders, items, allowed types)
- Base field auto-detection for `tt_content` and `pages` columns
- Field validation and system reserved field detection

**Content Type Support**

- Content Elements (custom CType, grouping, icons, field prefixing)
- Page Types (custom doktype values)
- Record Types (custom tables and type fields)
- Basics / Field Mixins (reusable field collections with circular dependency detection)

**List View**

- Tabbed overview with counters for each content type
- Search, multi-column sorting, and usage reference counts
- Create, edit, duplicate, and delete Content Blocks
- Multi-select mode for batch operations

**Import and Export**

- Download individual or multiple Content Blocks as ZIP archives
- Multi-step upload wizard with conflict detection and resolution
- Preserves directory structure and language files

**Administration**

- Automatic cache clearing after save and import operations
- Extension-aware storage (choose target extension for new blocks)

## Compatibility

| Extension version | TYPO3 version         | PHP version |
|-------------------|-----------------------|-------------|
| 1.0.x (beta)      | 13.4.19+ &vert; 14.3+ | 8.2+        |

## Requirements

This extension requires the Content Blocks extension:

- [friendsoftypo3/content-blocks](https://packagist.org/packages/friendsoftypo3/content-blocks) (`^1.4.6 || ^2.0`)

Content Blocks `1.x` is the line for TYPO3 13.4, Content Blocks `2.x` requires
TYPO3 14.3. Composer picks the matching one for your TYPO3 version.

## Installation

Require this package via Composer:

```
composer require --dev friendsoftypo3/content-blocks-gui
```

Or install it via the Extension Manager in the TYPO3 backend. The extension key
is `content_blocks_gui`.

After installation, the module is available in the TYPO3 backend under
**Admin Tools > Content Blocks**.

### ⚠️ Required: prepare a storage extension

> [!IMPORTANT]
> **The GUI only offers extensions that require `friendsoftypo3/content-blocks` in
> their own `composer.json` as a storage destination for new Content Blocks.**
>
> If no extension declares that dependency, **the extension dropdown in the editor
> stays empty and you cannot create any Content Block.**
>
> Add the dependency to your sitepackage (or whichever extension should hold the
> Content Blocks):
>
> ```
> composer require friendsoftypo3/content-blocks
> ```
>
> …or add it manually to that extension's `composer.json` and run `composer update`
> afterwards, so the package metadata is refreshed.

## Developing

There is a DDEV setup ready to use. Ensure [DDEV](https://github.com/ddev/ddev)
is installed on your machine. Then run:

```
ddev start
ddev composer install
touch .Build/public/FIRST_INSTALL
ddev launch
```

Continue with the TYPO3 installation process.

### Building JavaScript

The frontend is built with TypeScript and Lit. The build runs inside the DDEV
container, no local Node.js installation needed:

```
ddev javascript
```

This compiles TypeScript, runs ESLint with auto-fix, and post-processes the
output (import rewriting, minification) to `Resources/Public/JavaScript/content-blocks-gui/`.

TypeScript sources are in `Build/Sources/TypeScript/friendsoftypo3/content-blocks-gui/`.

### TYPO3 Core TypeScript Files

The `Build/Sources/TypeScript/backend/` and `Build/Sources/TypeScript/core/` directories
contain TypeScript files from the TYPO3 core, needed for type resolution during compilation.
These are committed to the repo and rarely need updating.

See [Build/TYPO3_CORE_TYPESCRIPT_SYNC.md](Build/TYPO3_CORE_TYPESCRIPT_SYNC.md) for details
on how to sync them when upgrading TYPO3 versions.

## Testing

Run the test suites via DDEV custom commands:

```
ddev test-unit              # PHPUnit unit tests
ddev test-functional        # PHPUnit functional tests (uses the ddev db)
ddev test-playwright        # Playwright E2E tests (installs deps on first run)
```

Extra arguments are forwarded directly to the underlying runner, e.g.
`ddev test-unit --filter MyTest` or `ddev test-playwright --ui`. Do **not**
prefix them with `--`: PHPUnit treats `--` as "the rest are test file paths",
so `ddev test-unit -- --filter MyTest` would make PHPUnit look for a file named
`--filter`.

On the first run, `ddev test-playwright` installs its npm dependencies and the
chromium browser binary into `Tests/Playwright/`. If chromium fails to launch
due to missing system libraries, add them via `webimage_extra_packages` in
`.ddev/config.yaml`.

### PHPStan

```
ddev exec .Build/bin/phpstan analyse -c Build/phpstan/phpstan.neon
```

### PHP-CS-Fixer

```
ddev exec .Build/bin/php-cs-fixer fix --config=Build/php-cs-fixer/config.php --dry-run --diff
```

### Playwright E2E Tests

See `Tests/Playwright/` for setup instructions.

## Feedback and Support

You can reach us on the [TYPO3 Slack](https://typo3.org/community/meet/chat-slack)
channel `#cig-structuredcontent`. We appreciate any constructive feedback and
will help you, if you have any problems.

## License

This project is licensed under GPL-2.0-or-later.
