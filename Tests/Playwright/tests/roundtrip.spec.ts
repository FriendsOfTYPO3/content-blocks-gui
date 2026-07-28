import { test, expect } from '@playwright/test';
import {
  createAuthContext, openNewEditorByType, openModule,
  dropFieldType, dropFieldIntoCollection, fillEditorSettings,
  saveAndVerify, saveAndClose, deleteField,
  findInListAndEdit, deleteFromList, switchLeftPaneTab,
  addBasicToList, removeBasicFromList, cleanupTestContentBlocks,
} from './helpers';

const TS = Date.now();

// Roundtrip tests are multi-step, give them more time
test.setTimeout(60_000);

// Clean up any leftover test content blocks after each test,
// even if the test fails midway. This prevents a failed test
// from poisoning subsequent tests with orphaned artifacts.
// Set SKIP_CLEANUP=1 to keep artifacts for debugging.
test.afterEach(() => {
  if (!process.env.SKIP_CLEANUP) {
    cleanupTestContentBlocks();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1) Content Element Roundtrip
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Content Element Roundtrip', () => {
  const VENDOR = 'test';
  const NAME = `pw-ce-${TS}`;
  const FULL_NAME = `${VENDOR}/${NAME}`;

  test('create, edit, and delete a content element', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();

    // ── CREATE ──────────────────────────────────────────────────────────
    let frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, VENDOR, NAME);

    // Add fields: Text, Collection with sub-fields, Palette with sub-fields
    let dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped, 'Drop Text').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'Textarea', 'Textarea_0');
    expect(dropped, 'Drop Textarea').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'Collection', 'Collection_0');
    expect(dropped, 'Drop Collection').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldIntoCollection(page, 'Text', 'Text_0', 0);
    expect(dropped, 'Drop Text into collection').toBe(true);
    await page.waitForTimeout(300);

    dropped = await dropFieldIntoCollection(page, 'File', 'File_0', 0);
    expect(dropped, 'Drop File into collection').toBe(true);
    await page.waitForTimeout(300);

    dropped = await dropFieldType(page, 'Palette', 'Palette_0');
    expect(dropped, 'Drop Palette').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldIntoCollection(page, 'Textarea', 'Textarea_0', 1);
    expect(dropped, 'Drop Textarea into palette').toBe(true);
    await page.waitForTimeout(300);

    // Add TYPO3/Appearance to general basics list
    await addBasicToList(page, frame, 'TYPO3/Appearance');

    // Save (extension:setup runs as subprocess, included in response time)
    await saveAndVerify(page, frame);

    // Verify in list
    let listFrame = await openModule(page);
    await expect(listFrame.locator('tr', { hasText: FULL_NAME })).toBeVisible({ timeout: 15000 });

    // ── EDIT ────────────────────────────────────────────────────────────
    frame = await findInListAndEdit(page, FULL_NAME);

    // Remove TYPO3/Appearance
    await removeBasicFromList(page, frame, 'TYPO3/Appearance');

    // Delete the collection
    await deleteField(frame, 'Collection_0');
    await page.waitForTimeout(300);

    // Delete the Textarea
    await deleteField(frame, 'Textarea_0');
    await page.waitForTimeout(300);

    // Add a new File field
    dropped = await dropFieldType(page, 'File', 'File_0');
    expect(dropped, 'Drop File').toBe(true);
    await page.waitForTimeout(500);

    await saveAndVerify(page, frame);

    // Verify changes persisted
    frame = await findInListAndEdit(page, FULL_NAME);
    await expect(frame.locator('.collection-field')).not.toBeAttached({ timeout: 3000 });
    await switchLeftPaneTab(frame, 'Basics');
    await page.waitForTimeout(300);
    await expect(frame.locator('li.basic-item.draggable:has-text("TYPO3/Appearance")')).not.toBeAttached({ timeout: 3000 });

    // ── DELETE ───────────────────────────────────────────────────────────
    await deleteFromList(page, FULL_NAME, 'Content Elements');

    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) Record Type Roundtrip
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Record Type Roundtrip', () => {
  const VENDOR = 'test';
  const NAME = `pw-rt-${TS}`;
  const FULL_NAME = `${VENDOR}/${NAME}`;

  test('create, edit, and delete a record type', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();

    // ── CREATE ──────────────────────────────────────────────────────────
    let frame = await openNewEditorByType(page, 'record-type');
    await fillEditorSettings(page, frame, VENDOR, NAME);

    let dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped, 'Drop Text').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'Collection', 'Collection_0');
    expect(dropped, 'Drop Collection').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldIntoCollection(page, 'Textarea', 'Textarea_0', 0);
    expect(dropped, 'Drop Textarea into collection').toBe(true);
    await page.waitForTimeout(300);

    dropped = await dropFieldType(page, 'File', 'File_0');
    expect(dropped, 'Drop File').toBe(true);
    await page.waitForTimeout(500);

    await saveAndVerify(page, frame);

    let listFrame = await openModule(page);
    const rtTab = listFrame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: 'Record Types' });
    await expect(rtTab.first()).toBeVisible({ timeout: 5000 });
    await rtTab.first().click();
    await page.waitForTimeout(500);
    await expect(listFrame.locator('tr', { hasText: FULL_NAME })).toBeVisible({ timeout: 10000 });

    // ── EDIT ────────────────────────────────────────────────────────────
    frame = await findInListAndEdit(page, FULL_NAME, 'Record Types');

    // #20: the auto-suggested table name must have been persisted on save
    // (what the Settings form showed is what got saved).
    await expect(frame.locator('#table')).toHaveValue(`tx_${VENDOR}_${NAME.replace(/-/g, '')}`);

    await deleteField(frame, 'Collection_0');
    await page.waitForTimeout(300);

    dropped = await dropFieldType(page, 'Palette', 'Palette_0');
    expect(dropped, 'Drop Palette').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldIntoCollection(page, 'Text', 'Text_0', 0);
    expect(dropped, 'Drop Text into palette').toBe(true);
    await page.waitForTimeout(300);

    await saveAndVerify(page, frame);

    frame = await findInListAndEdit(page, FULL_NAME, 'Record Types');
    await expect(frame.locator('.collection-field')).not.toBeAttached({ timeout: 3000 });
    await expect(frame.locator('.palette-field')).toBeAttached({ timeout: 3000 });

    // ── DELETE ───────────────────────────────────────────────────────────
    await deleteFromList(page, FULL_NAME, 'Record Types');

    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) Page Type Roundtrip
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Page Type Roundtrip', () => {
  const VENDOR = 'test';
  const NAME = `pw-pt-${TS}`;
  const FULL_NAME = `${VENDOR}/${NAME}`;

  test('create, edit, and delete a page type', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();

    // ── CREATE ──────────────────────────────────────────────────────────
    let frame = await openNewEditorByType(page, 'page-type');
    await fillEditorSettings(page, frame, VENDOR, NAME);

    let dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped, 'Drop Text').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'Textarea', 'Textarea_0');
    expect(dropped, 'Drop Textarea').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'Collection', 'Collection_0');
    expect(dropped, 'Drop Collection').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldIntoCollection(page, 'Text', 'Text_0', 0);
    expect(dropped, 'Drop Text into collection').toBe(true);
    await page.waitForTimeout(300);

    await saveAndVerify(page, frame);

    let listFrame = await openModule(page);
    const ptTab = listFrame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: 'Page Types' });
    await expect(ptTab.first()).toBeVisible({ timeout: 5000 });
    await ptTab.first().click();
    await page.waitForTimeout(500);
    await expect(listFrame.locator('tr', { hasText: FULL_NAME })).toBeVisible({ timeout: 10000 });

    // ── EDIT ────────────────────────────────────────────────────────────
    frame = await findInListAndEdit(page, FULL_NAME, 'Page Types');

    await deleteField(frame, 'Collection_0');
    await page.waitForTimeout(300);

    dropped = await dropFieldType(page, 'File', 'File_0');
    expect(dropped, 'Drop File').toBe(true);
    await page.waitForTimeout(500);

    await saveAndVerify(page, frame);

    frame = await findInListAndEdit(page, FULL_NAME, 'Page Types');
    await expect(frame.locator('.collection-field')).not.toBeAttached({ timeout: 3000 });
    await expect(frame.locator('content-block-editor-middle-pane [data-identifier="File_0"]')).toBeAttached({ timeout: 3000 });

    // ── DELETE ───────────────────────────────────────────────────────────
    await deleteFromList(page, FULL_NAME, 'Page Types');

    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) Basic Roundtrip
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Basic Roundtrip', () => {
  const VENDOR = 'test';
  const NAME = `pw-basic-${TS}`;
  const FULL_NAME = `${VENDOR}/${NAME}`;

  test('create, edit, and delete a basic', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();

    // ── CREATE ──────────────────────────────────────────────────────────
    let frame = await openNewEditorByType(page, 'basic');
    await fillEditorSettings(page, frame, VENDOR, NAME);

    let dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped, 'Drop Text').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'Textarea', 'Textarea_0');
    expect(dropped, 'Drop Textarea').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldType(page, 'File', 'File_0');
    expect(dropped, 'Drop File').toBe(true);
    await page.waitForTimeout(500);

    await saveAndVerify(page, frame);

    let listFrame = await openModule(page);
    const basicsTab = listFrame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: 'Basics' });
    await expect(basicsTab.first()).toBeVisible({ timeout: 5000 });
    await basicsTab.first().click();
    await page.waitForTimeout(500);
    await expect(listFrame.locator('tr', { hasText: FULL_NAME })).toBeVisible({ timeout: 10000 });

    // ── EDIT ────────────────────────────────────────────────────────────
    frame = await findInListAndEdit(page, FULL_NAME, 'Basics');

    await deleteField(frame, 'Textarea_0');
    await page.waitForTimeout(300);

    dropped = await dropFieldType(page, 'Collection', 'Collection_0');
    expect(dropped, 'Drop Collection').toBe(true);
    await page.waitForTimeout(500);

    dropped = await dropFieldIntoCollection(page, 'Text', 'Text_0', 0);
    expect(dropped, 'Drop Text into collection').toBe(true);
    await page.waitForTimeout(300);

    dropped = await dropFieldIntoCollection(page, 'Textarea', 'Textarea_0', 0);
    expect(dropped, 'Drop Textarea into collection').toBe(true);
    await page.waitForTimeout(300);

    // Save & Close
    await saveAndClose(page, frame);

    // Verify still in list
    listFrame = page.frameLocator('typo3-iframe-module iframe');
    const basicsTab2 = listFrame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: 'Basics' });
    await expect(basicsTab2.first()).toBeVisible({ timeout: 5000 });
    await basicsTab2.first().click();
    await page.waitForTimeout(500);
    await expect(listFrame.locator('tr', { hasText: FULL_NAME })).toBeVisible({ timeout: 10000 });

    // Reopen and verify changes
    frame = await findInListAndEdit(page, FULL_NAME, 'Basics');
    await expect(frame.locator('.collection-field')).toBeAttached({ timeout: 5000 });
    // Root should have Text_0, File_0, Collection_0 = 3 fields (Textarea_0 was deleted from root)
    const rootFields = frame.locator('content-block-editor-middle-pane > .content-block-field-builder > .field-builder-container > .fields-list > .field-item');
    const rootFieldCount = await rootFields.count();
    expect(rootFieldCount).toBe(3);

    // ── DELETE ───────────────────────────────────────────────────────────
    await deleteFromList(page, FULL_NAME, 'Basics');

    await context.close();
  });
});
