# Tests – Content Blocks GUI

## Prerequisites

- DDEV is running (`ddev start`)
- PHP dependencies installed (`ddev composer install`)

The test dependencies (`phpunit/phpunit`, `typo3/testing-framework`) are declared in `composer.json` as `require-dev`.

All test suites are launched via DDEV custom commands:

```bash
ddev test-unit              # PHPUnit unit tests
ddev test-functional        # PHPUnit functional tests (uses the ddev db)
ddev test-playwright        # Playwright E2E tests (installs deps on first run)
```

Extra arguments are forwarded directly to the underlying runner, e.g.
`ddev test-unit --filter successAnswerIsSuccess` or `ddev test-playwright --ui`.

> **Note:** Do not prefix arguments with `--`. PHPUnit interprets `--` as
> "everything after this is a test file path", so `ddev test-unit -- --filter X`
> would make PHPUnit look for a file literally named `--filter`.

---

## Unit Tests

```bash
ddev test-unit
```

**Run a single test:**
```bash
ddev test-unit --filter successAnswerIsSuccess
```

**Run a single test class:**
```bash
ddev test-unit Tests/Unit/Answer/AnswerClassesTest.php
```

Configuration: `Build/phpunit/UnitTests.xml` (bootstrap: `Tests/UnitTestsBootstrap.php`).

| File | What it tests |
|------|---------------|
| `Unit/Answer/AnswerClassesTest.php` | Answer value objects (Success, Error, Data) |
| `Unit/Factory/UsageFactoryTest.php` | Repository routing per content type |
| `Unit/Service/ContentBlockImportAnalyzerTest.php` | ZIP validation, type mapping, basic detection |

---

## Functional Tests

```bash
ddev test-functional
```

The DB credentials (`typo3DatabaseName=func_test`, host `db`, etc.) are set automatically by the `ddev test-functional` wrapper — no more manual env-var juggling.

**Run a single test class:**
```bash
ddev test-functional Tests/Functional/Service/BasicsServiceTest.php
```

Configuration: `Build/phpunit/FunctionalTests.xml` (bootstrap: `Tests/FunctionalTestsBootstrap.php`).

| File | What it tests |
|------|---------------|
| `Functional/Service/BasicsServiceTest.php` | Loading, listing, validating Basics |
| `Functional/Service/ContentTypeServiceTest.php` | Content type defaults and validation |
| `Functional/Repository/ContentElementRepositoryTest.php` | DB queries, hidden/deleted handling |
| `Functional/Controller/AjaxControllerTest.php` | Parameter validation, HTTP status codes |

### Fixtures

| File | Content |
|------|---------|
| `Functional/Fixtures/be_users.csv` | Admin backend user for controller tests |
| `Functional/Fixtures/tt_content.csv` | Sample records for repository tests |
| `Functional/Fixtures/BasicFixture.yaml` | Example basic for service tests |

> **Note:** The files `Tests/phpunit.unit.xml` and `Tests/phpunit.functional.xml` are leftovers from the monorepo era and are no longer used — the active configs live under `Build/phpunit/`. They can be deleted at some point.

---

## Playwright E2E Tests

Test setup in `Tests/Playwright/` with its own npm dependencies. Drives the GUI in a real TYPO3 backend with chromium. Requires a running TYPO3 instance and a backend user.

### File structure

```
Tests/Playwright/
├── package.json              # Dependencies (@playwright/test, dotenv, @types/node)
├── playwright.config.ts      # Playwright config, loads .env automatically
├── tsconfig.json             # TypeScript config for IDE support
├── tests/
│   ├── helpers.ts            # createAuthContext, openNewEditor, dropFieldType
│   ├── login.spec.ts         # Login + session storage (prerequisite for list/editor)
│   ├── list.spec.ts          # List view tests
│   └── editor.spec.ts        # Editor tests
├── .env.example              # Template for local configuration
```

### Setup

```bash
ddev test-playwright
```

On the first run, the command automatically installs the npm dependencies and the chromium browser into `Tests/Playwright/node_modules` and the web container's cache. The system libraries chromium needs are already installed via `webimage_extra_packages` in `.ddev/config.yaml`.

### Configuration

Before the first run, create a `.env` file in `Tests/Playwright/` (template: `.env.example`):

```bash
cp Tests/Playwright/.env.example Tests/Playwright/.env
```

The `ddev test-playwright` command aborts with a clear error message if the file or any required value is missing.

| Env variable | Description |
|---|---|
| `PLAYWRIGHT_BASE_URL` | TYPO3 backend URL (trailing slash required) |
| `BACKEND_ADMIN_USERNAME` | Backend username |
| `BACKEND_ADMIN_PASSWORD` | Backend password |

### Running tests

```bash
ddev test-playwright                  # all tests, headless
ddev test-playwright --ui             # interactive UI mode
ddev test-playwright --debug          # debug mode
ddev test-playwright --project=editor # only one project (login/list/editor)
```

**Run a single test:**

```bash
# By file + line number (most precise)
ddev test-playwright tests/editor.spec.ts:78

# All tests in a single file
ddev test-playwright tests/editor.spec.ts

# By title regex (single word only — no quotes!)
ddev test-playwright --grep dropdown
```

> **Note:** `login` always runs alongside any selection because the `list` and
> `editor` projects depend on it in `playwright.config.ts`.
>
> Multi-word patterns like `--grep "extension dropdown"` do **not** work — DDEV
> custom commands lose the quotes when forwarding via `"$@"`, the argument is
> word-split, and Playwright finds nothing. Use a single unique word, or filter
> by `file:line` instead.

### Test cases

**Login** (`tests/login.spec.ts`)

| Test case | What it tests |
|-----------|---------------|
| `login and save session` | Backend login works; the session is stored as `auth.json` for the following tests |

**List View** (`tests/list.spec.ts`)

| Test case | What it tests |
|-----------|---------------|
| `module loads list component` | `content-block-list` web component renders inside the backend module iframe |
| `shows tab navigation` | Tab navigation (Content Elements, Page Types, etc.) is visible |

**Editor** (`tests/editor.spec.ts`)

| Test case | What it tests |
|-----------|---------------|
| `loads with three panes` | Editor has left / middle / right pane after clicking "New" |
| `settings tab has form fields` | Vendor, Name and Extension fields are present in the Settings tab |
| `components tab shows field types` | Draggable field types are listed in the Components tab |
| `drag and drop field type to middle pane` | Drag & drop adds a field to the middle pane |
| `field appears in right pane after click` | Clicking a field opens the property editor in the right pane |
| `extension dropdown lists destination extensions` | `#extension` dropdown contains at least one host extension (regression test for composer / legacy mode discovery) |
| `save content block roundtrip` | Full create + save roundtrip for a new content block |

### Notes

- Tests run **serially** (not in parallel) because `list` and `editor` depend on the login session from `login` (`auth.json`).
- TYPO3 renders backend modules inside an **iframe** — tests use `page.frameLocator('typo3-iframe-module iframe')` to reach the module contents.
- The `tsconfig.json` only exists for IDE support (autocomplete and error highlighting in PhpStorm / VS Code). Playwright uses its own transpiler.

---

## Run everything at once

```bash
ddev test-unit && ddev test-functional && ddev test-playwright
```
