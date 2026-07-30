import { type Browser, type FrameLocator, type Page, expect } from '@playwright/test';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Matches the visible modal on both TYPO3 v13 (Bootstrap `.modal.show`) and
 * v14 (native `<dialog open>`). Scope title/message/button lookups to this so
 * the E2E suite stays dual-compatible.
 */
export const MODAL = 'dialog[open], .modal.show';

export const config = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || '',
  login: {
    admin: {
      username: process.env.BACKEND_ADMIN_USERNAME || '',
      password: process.env.BACKEND_ADMIN_PASSWORD || '',
    },
  },
};

export const authFile = path.join(__dirname, '..', 'auth.json');

/**
 * Create a browser context with stored auth session.
 */
export async function createAuthContext(browser: Browser) {
  return browser.newContext({ ignoreHTTPSErrors: true, storageState: authFile });
}

/**
 * Navigate to the Content Blocks GUI module and return the iframe FrameLocator.
 */
export async function openModule(page: Page) {
  await page.goto(config.baseUrl + 'module/web/ContentBlocksGui');
  await page.waitForLoadState('networkidle');
  const frame = page.frameLocator('typo3-iframe-module iframe');
  // Wait for the Lit list module to actually render before returning. On a
  // cold first load (e.g. right after a cache flush) networkidle fires before
  // the module JS has rendered its markup, which flaked the "new" links.
  await frame.locator('content-block-list').first().waitFor({ state: 'attached', timeout: 20000 });
  return frame;
}

/**
 * Navigate to editor for a new content type via the button bar.
 * Uses the href pattern to find the correct "Add" button.
 */
export async function openNewEditorByType(page: Page, type: 'content-block' | 'record-type' | 'page-type' | 'basic'): Promise<FrameLocator> {
  const frame = await openModule(page);
  let button;
  if (type === 'basic') {
    button = frame.locator('a[href*="basic/modify/new"]').first();
  } else if (type === 'content-block') {
    // Content element: modify/new WITHOUT contentType param (or with no contentType)
    button = frame.locator('a[href*="modify/new"]').first();
  } else {
    // record-type or page-type: modify/new with contentType param
    button = frame.locator(`a[href*="contentType=${type}"]`).first();
  }
  await expect(button).toBeVisible({ timeout: 20000 });
  await button.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  return page.frameLocator('typo3-iframe-module iframe');
}

/**
 * Navigate to the editor for a new Content Element.
 */
export async function openNewEditor(page: Page): Promise<FrameLocator> {
  return openNewEditorByType(page, 'content-block');
}

/**
 * Get a handle to the inner iframe Frame (not FrameLocator) for evaluate() calls.
 */
async function getInnerFrame(page: Page) {
  const iframeEl = await page.locator('typo3-iframe-module iframe').elementHandle();
  if (!iframeEl) throw new Error('Could not find typo3-iframe-module iframe');
  const frame = await iframeEl.contentFrame();
  if (!frame) throw new Error('Could not get content frame');
  return frame;
}

/**
 * Drop a field type into a dropzone inside the iframe.
 * dropzoneIndex: which dropzone-field element to target (0 = first/top-level).
 */
export async function dropFieldType(page: Page, type: string, identifier: string, dropzoneIndex: number = 0): Promise<boolean> {
  const frame = await getInnerFrame(page);
  return frame.evaluate(({ t, id, idx }) => {
    const dropzones = document.querySelectorAll('dropzone-field') as NodeListOf<any>;
    const dropzone = dropzones[idx];
    if (!dropzone || !dropzone._dispatchFieldTypeDroppedEvent) return false;
    dropzone._dispatchFieldTypeDroppedEvent(JSON.stringify({ type: t, identifier: id }));
    return true;
  }, { t: type, id: identifier, idx: dropzoneIndex });
}

/**
 * Drop a field into a nested dropzone inside a Collection/Palette.
 * Finds the dropzone at the specified level and parent context.
 */
export async function dropFieldIntoCollection(page: Page, type: string, identifier: string, collectionIndex: number): Promise<boolean> {
  // Wait for the collection UI to fully render
  await page.waitForTimeout(500);
  const frame = await getInnerFrame(page);
  return frame.evaluate(({ t, id, colIdx }) => {
    // Find all dropzones that are inside a collection/palette body
    // These are the internal dropzones (level > 0)
    const allDropzones = Array.from(document.querySelectorAll('dropzone-field')) as any[];
    // Filter to dropzones inside collection/palette bodies (level > 0)
    // Lit properties are set via .property binding, access them directly
    const nestedDropzones = allDropzones.filter((dz: any) => {
      // Check both the JS property and the attribute
      const level = dz.level ?? parseInt(dz.getAttribute('level') || '0', 10);
      return level > 0;
    });
    if (nestedDropzones.length === 0) {
      // Fallback: if level property filtering didn't work, try finding dropzones
      // inside .collection-body or .collection-initial-dropzone containers
      const bodyDropzones = Array.from(document.querySelectorAll('.collection-body dropzone-field, .collection-initial-dropzone dropzone-field')) as any[];
      if (colIdx < bodyDropzones.length) {
        bodyDropzones[colIdx]._dispatchFieldTypeDroppedEvent(JSON.stringify({ type: t, identifier: id }));
        return true;
      }
    }
    if (colIdx >= nestedDropzones.length) {
      return false;
    }
    const dropzone = nestedDropzones[colIdx];
    dropzone._dispatchFieldTypeDroppedEvent(JSON.stringify({ type: t, identifier: id }));
    return true;
  }, { t: type, id: identifier, colIdx: collectionIndex });
}

/**
 * Select a base field from the "choose from existing base fields" dropdown in the right pane.
 * First clicks the field in the middle pane, then selects the base field.
 */
export async function selectBaseField(page: Page, frame: FrameLocator, fieldName: string): Promise<void> {
  // The base field dropdown is in the right pane, find the option that starts with the field name
  const baseFieldSelect = frame.locator('select.form-select-sm');
  await expect(baseFieldSelect).toBeVisible({ timeout: 5000 });
  // Find the option whose text contains the field name
  const option = baseFieldSelect.locator('option', { hasText: fieldName }).first();
  const value = await option.getAttribute('value');
  expect(value, `Base field "${fieldName}" not found in dropdown`).toBeTruthy();
  await baseFieldSelect.selectOption(value!);
  await page.waitForTimeout(300);
}

/**
 * Click a field in the middle pane to select it (shows it in right pane).
 * Note: data-identifier is on a div inside draggable-field-type's shadow DOM.
 */
export async function clickField(frame: FrameLocator, fieldIdentifier: string): Promise<void> {
  const field = frame.locator(`content-block-editor-middle-pane [data-identifier="${fieldIdentifier}"]`).first();
  await expect(field).toBeVisible({ timeout: 5000 });
  await field.click();
}

/**
 * Delete a field from the middle pane by clicking its delete icon.
 */
export async function deleteField(frame: FrameLocator, fieldIdentifier: string): Promise<void> {
  const field = frame.locator(`content-block-editor-middle-pane [data-identifier="${fieldIdentifier}"]`).first();
  await expect(field).toBeVisible({ timeout: 10000 });
  const deleteBtn = field.locator('.delete-icon-wrap');
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
}

/**
 * Fill in the basic editor settings (vendor, name, extension).
 */
export async function fillEditorSettings(
  page: Page,
  frame: FrameLocator,
  vendor: string,
  name: string,
): Promise<void> {
  const vendorInput = frame.locator('#vendor');
  const nameInput = frame.locator('#name');
  const extensionSelect = frame.locator('#extension');

  await expect(vendorInput).toBeVisible({ timeout: 5000 });
  await vendorInput.fill(vendor);
  await nameInput.fill(name);

  // Select first real extension
  const firstOption = extensionSelect.locator('option:not([value="0"])').first();
  await expect(firstOption).toBeAttached();
  const optionValue = await firstOption.getAttribute('value');
  if (!optionValue) throw new Error('No extension available in dropdown');
  await extensionSelect.selectOption(optionValue);
}

/**
 * Click the Save button and verify the AJAX response succeeds.
 */
export async function saveAndVerify(page: Page, frame: FrameLocator): Promise<void> {
  const saveResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/gui/cb/save') || resp.url().includes('/gui/basics/save') || resp.url().includes('/gui/contenttype/save'),
    { timeout: 30000 }
  );

  const saveButton = frame.locator('[data-action="save-content-block"]').first();
  await expect(saveButton).toBeVisible({ timeout: 5000 });
  await saveButton.click();

  const saveResponse = await saveResponsePromise;
  expect(saveResponse.status(), 'Save AJAX returned non-200').toBe(200);
  const body = await saveResponse.json();
  expect(body.success, 'Save failed: ' + (body.message || JSON.stringify(body))).not.toBe(false);

  // Verify success modal and dismiss
  const successModal = page.locator(MODAL).filter({ hasText: 'Success' });
  await expect(successModal).toBeVisible({ timeout: 10000 });
  await successModal.getByRole('button', { name: 'OK' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click Save & Close (form POST, redirects to list).
 */
export async function saveAndClose(page: Page, frame: FrameLocator): Promise<void> {
  const saveCloseButton = frame.locator('[data-action="save-and-close-content-block"]').first();
  await expect(saveCloseButton).toBeVisible({ timeout: 5000 });
  await saveCloseButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Verify a content block exists in the list view, then click edit on it.
 * Returns the editor iframe FrameLocator.
 */
export async function findInListAndEdit(page: Page, fullName: string, tab?: string): Promise<FrameLocator> {
  const listFrame = await openModule(page);

  // Switch tab if specified
  if (tab) {
    const tabButton = listFrame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: tab });
    await expect(tabButton.first()).toBeVisible({ timeout: 5000 });
    await tabButton.first().click();
    await page.waitForTimeout(500);
  }

  const row = listFrame.locator('tr', { hasText: fullName });
  await expect(row).toBeVisible({ timeout: 10000 });

  // Click edit link
  const editLink = row.locator('a').filter({ hasText: fullName }).first();
  await expect(editLink).toBeVisible();
  await editLink.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  return page.frameLocator('typo3-iframe-module iframe');
}

/**
 * Delete a content block via the list view UI (click delete button, confirm modal).
 */
export async function deleteFromList(page: Page, fullName: string, tab?: string): Promise<void> {
  const listFrame = await openModule(page);

  if (tab) {
    const tabButton = listFrame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: tab });
    await expect(tabButton.first()).toBeVisible({ timeout: 5000 });
    await tabButton.first().click();
    await page.waitForTimeout(500);
  }

  const row = listFrame.locator('tr', { hasText: fullName });
  await expect(row).toBeVisible({ timeout: 10000 });

  const deleteButton = row.locator('button[title*="Delete"]');
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  // Confirm deletion modal — the GUI sets a stable `.remove-button` class on
  // the confirm button (btnClass), so this works on both v13 and v14.
  const confirmBtn = page.locator(MODAL).locator('.remove-button');
  await expect(confirmBtn.first()).toBeVisible({ timeout: 5000 });
  await confirmBtn.first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Verify it's gone
  const listFrameAfter = page.frameLocator('typo3-iframe-module iframe');
  await expect(listFrameAfter.locator('tr', { hasText: fullName })).not.toBeVisible({ timeout: 10000 });
}

/**
 * Switch to a tab in the left pane (Settings, Components, Basics).
 */
export async function switchLeftPaneTab(frame: FrameLocator, tabName: string): Promise<void> {
  const tab = frame.locator('#tabs-content-elements a').filter({ hasText: tabName });
  await expect(tab).toBeVisible({ timeout: 5000 });
  await tab.click();
}

/**
 * Add a basic to the "general basics list" via the Basics tab in the left pane.
 */
export async function addBasicToList(page: Page, frame: FrameLocator, basicIdentifier: string): Promise<void> {
  await switchLeftPaneTab(frame, 'Basics');
  await page.waitForTimeout(300);
  const addButton = frame.locator(`li.basic-item:has-text("${basicIdentifier}") button.basic-item-add`);
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();
  await page.waitForTimeout(300);
}

/**
 * Remove a basic from the "general basics list" via the Basics tab.
 */
export async function removeBasicFromList(page: Page, frame: FrameLocator, basicIdentifier: string): Promise<void> {
  await switchLeftPaneTab(frame, 'Basics');
  await page.waitForTimeout(300);
  const removeButton = frame.locator(`li.basic-item.draggable:has-text("${basicIdentifier}") button.basic-item-remove`);
  await expect(removeButton).toBeVisible({ timeout: 5000 });
  await removeButton.click();
  await page.waitForTimeout(300);
}

/**
 * Force-clean all test content blocks from disk and flush caches.
 * Call this in afterEach() so a failed test doesn't poison subsequent ones.
 * Runs CLI commands directly — works inside the ddev web container.
 */
export function cleanupTestContentBlocks(): void {
  const projectPath = process.env.PROJECT_PATH || '/var/www/html';
  const examplesBase = `${projectPath}/Build/local-packages/content_blocks_examples/ContentBlocks`;
  const dirs = ['ContentElements', 'RecordTypes', 'PageTypes'];

  for (const dir of dirs) {
    try {
      execSync(`find ${examplesBase}/${dir} -maxdepth 1 -name "pw-*" -type d -exec rm -rf {} +`, { stdio: 'ignore' });
    } catch { /* directory may not exist */ }
  }

  // Clean up Basics files (named Pw-*.yaml)
  try {
    execSync(`find ${examplesBase}/Basics -maxdepth 1 -name "Pw-*" -type f -delete`, { stdio: 'ignore' });
  } catch { /* directory may not exist */ }

  // Clean up Resources/Public artifacts
  try {
    execSync(`find ${projectPath}/Build/local-packages/content_blocks_examples/Resources/Public/ContentBlocks -mindepth 1 -maxdepth 2 -name "pw-*" -type d -exec rm -rf {} +`, { stdio: 'ignore' });
  } catch { /* may not exist */ }

  // Flush caches and update database schema
  try {
    execSync(`${projectPath}/.Build/bin/typo3 cache:flush -g system 2>/dev/null || ${projectPath}/vendor/bin/typo3 cache:flush -g system 2>/dev/null`, { stdio: 'ignore' });
    execSync(`${projectPath}/.Build/bin/typo3 extension:setup 2>/dev/null || ${projectPath}/vendor/bin/typo3 extension:setup 2>/dev/null`, { stdio: 'ignore', timeout: 30000 });
  } catch { /* best effort */ }
}
