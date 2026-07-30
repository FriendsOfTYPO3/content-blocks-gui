import { test, expect, type FrameLocator, type Page } from '@playwright/test';
import {
  createAuthContext, openNewEditor, openNewEditorByType, openModule,
  dropFieldType, dropFieldIntoCollection, fillEditorSettings, clickField,
  switchLeftPaneTab, MODAL,
} from './helpers';

/**
 * Rename the currently-selected field by editing the identifier input in the
 * right pane. Fills the input and fires blur so the @blur handler in
 * right-pane.ts pushes the new value back into cbDefinition and re-renders
 * the middle pane.
 */
async function renameActiveField(frame: FrameLocator, page: Page, newIdentifier: string): Promise<void> {
  const rightPane = frame.locator('content-block-editor-right-pane');
  const identifierInput = rightPane.locator('#identifier');
  await expect(identifierInput, 'right-pane identifier input missing — field not selected?').toBeVisible({ timeout: 5000 });
  await identifierInput.fill(newIdentifier);
  await identifierInput.blur();
  // Give Lit one tick to process the @blur handler and re-render the middle pane.
  await page.waitForTimeout(300);
}

/**
 * Assert an identifier is present exactly once in the middle pane (and count 0
 * for the previous identifier). Fail hard on mismatch — the whole point of
 * this suite is to catch parent/parentPath sync regressions.
 */
async function expectMiddlePaneIdentifier(
  frame: FrameLocator,
  presentIdentifier: string,
  absentIdentifier?: string,
): Promise<void> {
  await expect(
    frame.locator(`content-block-editor-middle-pane [data-identifier="${presentIdentifier}"]`),
    `identifier "${presentIdentifier}" not found in middle pane`,
  ).toBeVisible({ timeout: 5000 });
  if (absentIdentifier) {
    await expect(
      frame.locator(`content-block-editor-middle-pane [data-identifier="${absentIdentifier}"]`),
      `old identifier "${absentIdentifier}" still present in middle pane`,
    ).toHaveCount(0);
  }
}

test.describe('Editor', () => {
  test('loads with three panes', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    await expect(editorFrame.locator('content-block-editor')).toBeAttached();
    await expect(editorFrame.locator('content-block-editor-left-pane')).toBeAttached();
    await expect(editorFrame.locator('content-block-editor-middle-pane')).toBeAttached();
    await expect(editorFrame.locator('content-block-editor-right-pane')).toBeAttached();
    await context.close();
  });

  test('settings tab has form fields', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    await expect(editorFrame.locator('#vendor')).toBeAttached();
    await expect(editorFrame.locator('#name')).toBeAttached();
    await expect(editorFrame.locator('#extension')).toBeAttached();
    await context.close();
  });

  test('components tab shows field types', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    const componentsTab = editorFrame.getByText('Components');
    await expect(componentsTab).toBeVisible();
    await componentsTab.click();
    await expect(editorFrame.locator('draggable-field-type').first()).toBeAttached();
    await context.close();
  });

  test('drag and drop field type to middle pane', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    const fieldsBefore = await editorFrame.locator('content-block-editor-middle-pane draggable-field-type').count();
    const dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped).toBe(true);
    await page.waitForTimeout(500);
    const fieldsAfter = await editorFrame.locator('content-block-editor-middle-pane draggable-field-type').count();
    expect(fieldsAfter).toBeGreaterThan(fieldsBefore);
    await context.close();
  });

  test('field appears in right pane after click', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    const dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped).toBe(true);
    await page.waitForTimeout(500);
    const field = editorFrame.locator('content-block-editor-middle-pane draggable-field-type').first();
    await expect(field).toBeVisible();
    await field.click();
    await page.waitForTimeout(500);
    const rightPane = editorFrame.locator('content-block-editor-right-pane');
    await expect(rightPane.locator('#identifier')).toBeAttached({ timeout: 5000 });
    await context.close();
  });

  test('extension dropdown lists destination extensions', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    const extensionSelect = editorFrame.locator('#extension');
    await expect(extensionSelect).toBeAttached();

    // The dropdown must contain at least one real option besides the
    // "please choose" placeholder (value="0"). If this fails, it means
    // ExtensionUtility::findAvailableExtensions() did not detect any
    // host extension that requires friendsoftypo3/content-blocks.
    const realOptions = extensionSelect.locator('option:not([value="0"])');
    const count = await realOptions.count();
    expect(count).toBeGreaterThan(0);

    // Each listed option should expose a non-empty extension key as value.
    for (let i = 0; i < count; i++) {
      const value = await realOptions.nth(i).getAttribute('value');
      expect(value).toBeTruthy();
    }
    await context.close();
  });

  test('save new content block and delete it via list view', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);

    const vendorInput = editorFrame.locator('#vendor');
    const nameInput = editorFrame.locator('#name');
    const extensionSelect = editorFrame.locator('#extension');

    await expect(vendorInput).toBeVisible({ timeout: 5000 });
    await vendorInput.fill('test-vendor');

    const blockName = 'pw-save-test-' + Date.now();
    const fullName = 'test-vendor/' + blockName;
    await nameInput.fill(blockName);

    // Select first real extension
    const firstOption = extensionSelect.locator('option:not([value="0"])').first();
    await expect(firstOption).toBeAttached();
    const optionValue = await firstOption.getAttribute('value');
    expect(optionValue).toBeTruthy();
    await extensionSelect.selectOption(optionValue!);

    // Add a field
    const dropped = await dropFieldType(page, 'Text', 'Text_0');
    expect(dropped).toBe(true);
    await page.waitForTimeout(500);

    // Intercept the AJAX save request to verify outcome
    const saveResponsePromise = page.waitForResponse(
      resp => resp.url().includes('contentblocks/gui/cb/save'),
      { timeout: 15000 }
    );

    // Click save button (lives in the iframe's docheader)
    const saveButton = editorFrame.locator('[data-action="save-content-block"]').first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Wait for the AJAX response and verify it succeeded
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);
    const responseBody = await saveResponse.json();
    expect(responseBody.success, 'Save failed: ' + (responseBody.message || '')).not.toBe(false);

    // Verify the success modal appears (not the error modal)
    const successModal = page.locator(MODAL).filter({ hasText: 'Success' });
    const errorModal = page.locator(MODAL).filter({ hasText: 'Error' });
    await expect(successModal.or(errorModal)).toBeVisible({ timeout: 10000 });
    await expect(successModal).toBeVisible();
    await expect(errorModal).not.toBeVisible();

    // Dismiss the modal
    await page.locator(MODAL).getByRole('button', { name: 'OK' }).first().click();

    // Navigate to list view and verify the created block appears
    const listFrame = await openModule(page);
    const createdRow = listFrame.locator('tr', { hasText: fullName });
    await expect(createdRow).toBeVisible({ timeout: 10000 });

    // Click delete button on the created block's row
    const deleteButton = createdRow.locator('button[title*="Delete"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Confirm deletion in the modal (stable GUI-set `.remove-button` class)
    const confirmDeleteButton = page.locator(MODAL).locator('.remove-button').first();
    await expect(confirmDeleteButton).toBeVisible({ timeout: 5000 });
    await confirmDeleteButton.click();
    await page.waitForLoadState('networkidle');

    // Verify the block is gone from the list
    const listFrameAfter = page.frameLocator('typo3-iframe-module iframe');
    await expect(listFrameAfter.locator('tr', { hasText: fullName })).not.toBeVisible({ timeout: 10000 });

    await context.close();
  });

  // Regression guard for commit 2c87040 which refactored the single `parent`
  // property into a `parentPath: number[]` array threaded through every pane
  // and component. If that wiring breaks, identifier edits in the right pane
  // either land on the wrong field or never reach the middle pane at all.
  // This test walks nested containers (root → Collection → sibling Text →
  // Palette) and asserts the middle pane reflects every rename.
  test('identifier renames propagate through parentPath at every nesting level', async ({ browser }) => {
    test.setTimeout(60_000);

    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, 'test', `pw-parentpath-${Date.now()}`);

    // 1) Root-level Text → rename to "rootText"
    expect(await dropFieldType(page, 'Text', 'Text_0'), 'Drop root Text').toBe(true);
    await page.waitForTimeout(500);
    await clickField(frame, 'Text_0');
    await renameActiveField(frame, page, 'rootText');
    await expectMiddlePaneIdentifier(frame, 'rootText', 'Text_0');

    // 2) Collection + inner Text → rename inner Text to "collectionText"
    expect(await dropFieldType(page, 'Collection', 'Collection_0'), 'Drop Collection').toBe(true);
    await page.waitForTimeout(500);
    expect(await dropFieldIntoCollection(page, 'Text', 'Text_0', 0), 'Drop Text into Collection').toBe(true);
    await page.waitForTimeout(500);
    // The only Text_0 now lives inside Collection_0 (root Text was renamed in step 1).
    await clickField(frame, 'Text_0');
    await renameActiveField(frame, page, 'collectionText');
    await expectMiddlePaneIdentifier(frame, 'collectionText', 'Text_0');
    // Sanity: container and its previously-renamed sibling must still be intact.
    await expectMiddlePaneIdentifier(frame, 'Collection_0');
    await expectMiddlePaneIdentifier(frame, 'rootText');

    // 3) Second root-level Text (after the Collection).
    //    editor.ts#getNextFieldIndex reuses the lowest free "<Type>_<n>" slot,
    //    so with root = [rootText, Collection_0] the new Text is named Text_0
    //    (the original Text_0 was renamed away in step 1). The identifier we
    //    pass into dropFieldType is ignored for new drops — just a probe.
    expect(await dropFieldType(page, 'Text', 'probe'), 'Drop second root Text').toBe(true);
    await page.waitForTimeout(500);
    await expectMiddlePaneIdentifier(frame, 'Text_0');

    // 4) Palette with a Textarea inside → rename the Textarea to "paletteTextarea"
    expect(await dropFieldType(page, 'Palette', 'Palette_0'), 'Drop Palette').toBe(true);
    await page.waitForTimeout(500);
    // Nested (level > 0) dropzones in document order at this point:
    //   [0] Collection_0 initial dropzone
    //   [1] Collection_0 dropzone after collectionText
    //   [2] Palette_0 initial dropzone
    expect(await dropFieldIntoCollection(page, 'Textarea', 'Textarea_0', 2), 'Drop Textarea into Palette').toBe(true);
    await page.waitForTimeout(500);
    await clickField(frame, 'Textarea_0');
    await renameActiveField(frame, page, 'paletteTextarea');
    await expectMiddlePaneIdentifier(frame, 'paletteTextarea', 'Textarea_0');

    // 5) Rename the containers themselves. Children must stay put — their
    //    parentPath is index-based, so renaming the container must not break
    //    anything downstream.
    await clickField(frame, 'Palette_0');
    await renameActiveField(frame, page, 'myPalette');
    await expectMiddlePaneIdentifier(frame, 'myPalette', 'Palette_0');
    await expectMiddlePaneIdentifier(frame, 'paletteTextarea');

    await clickField(frame, 'Collection_0');
    await renameActiveField(frame, page, 'myCollection');
    await expectMiddlePaneIdentifier(frame, 'myCollection', 'Collection_0');
    await expectMiddlePaneIdentifier(frame, 'collectionText');

    // Final sanity pass: the full expected identifier set is in the middle pane.
    for (const id of ['rootText', 'myCollection', 'collectionText', 'Text_0', 'myPalette', 'paletteTextarea']) {
      await expectMiddlePaneIdentifier(frame, id);
    }

    await context.close();
  });

  test('save is blocked when required fields (vendor/name/extension) are missing', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditorByType(page, 'content-block');

    // Intentionally leave vendor, name and host extension empty, then save.
    const saveButton = frame.locator('[data-action="save-content-block"]').first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // A validation error must block the save and name the missing fields (#20).
    await expect(page.locator(MODAL).filter({ hasText: 'Validation Error' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL)).toContainText(/required fields are missing/i);
    await expect(page.locator(MODAL)).toContainText('Vendor');

    // The save must NOT have succeeded.
    await expect(page.locator(MODAL).filter({ hasText: 'Success' })).toHaveCount(0);

    await context.close();
  });

  test('tt_content-reuse Basics are offered for content elements but hidden for record types (#19)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();

    // Content Element (tt_content): TYPO3/Appearance re-uses tt_content fields → offered.
    let frame = await openNewEditorByType(page, 'content-block');
    await switchLeftPaneTab(frame, 'Basics');
    await page.waitForTimeout(300);
    await expect(
      frame.locator('li.basic-item:has-text("TYPO3/Appearance")'),
      'Appearance should be available for content elements',
    ).toBeVisible({ timeout: 5000 });

    // Record Type (custom table): the same Basic must be filtered out (#19).
    frame = await openNewEditorByType(page, 'record-type');
    await switchLeftPaneTab(frame, 'Basics');
    await page.waitForTimeout(300);
    await expect(
      frame.locator('li.basic-item:has-text("TYPO3/Appearance")'),
      'Appearance must NOT be offered for record types',
    ).toHaveCount(0);

    await context.close();
  });

  test('Basic field-type dropdown excludes tt_content-reuse Basics for record types (#19)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();

    // Record Type: drop a Basic field; its right-pane dropdown must not offer Appearance.
    let frame = await openNewEditorByType(page, 'record-type');
    let dropped = await dropFieldType(page, 'Basic', 'Basic_0');
    expect(dropped, 'Drop Basic field (record type)').toBe(true);
    await page.waitForTimeout(400);
    await clickField(frame, 'Basic_0');
    await page.waitForTimeout(300);
    const rtDropdown = frame.locator('content-block-editor-right-pane select#identifier');
    await expect(rtDropdown).toBeVisible({ timeout: 5000 });
    await expect(
      rtDropdown.locator('option', { hasText: 'TYPO3/Appearance' }),
      'Appearance must not be selectable for record types',
    ).toHaveCount(0);

    // Content Element: the same dropdown offers Appearance.
    frame = await openNewEditorByType(page, 'content-block');
    dropped = await dropFieldType(page, 'Basic', 'Basic_0');
    expect(dropped, 'Drop Basic field (content element)').toBe(true);
    await page.waitForTimeout(400);
    await clickField(frame, 'Basic_0');
    await page.waitForTimeout(300);
    const ceDropdown = frame.locator('content-block-editor-right-pane select#identifier');
    await expect(ceDropdown).toBeVisible({ timeout: 5000 });
    await expect(
      ceDropdown.locator('option', { hasText: 'TYPO3/Appearance' }),
      'Appearance should be selectable for content elements',
    ).toHaveCount(1);

    await context.close();
  });

  test('Save & Close is blocked when required fields are missing (#20)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditorByType(page, 'content-block');

    // Leave vendor/name/extension empty and use Save & Close.
    const saveCloseButton = frame.locator('[data-action="save-and-close-content-block"]').first();
    await expect(saveCloseButton).toBeVisible({ timeout: 5000 });
    await saveCloseButton.click();

    // Must block with the same validation error as Save — not navigate to the list.
    await expect(page.locator(MODAL).filter({ hasText: 'Validation Error' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL)).toContainText(/required fields are missing/i);
    await expect(frame.locator('content-block-editor')).toBeAttached();
    // The "Saving…" overlay must not be shown/stuck when the save was blocked.
    await expect(frame.locator('#cb-saving-overlay')).toHaveCount(0);

    await context.close();
  });

  test('Save is blocked for a record type missing table/label field (#20)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditorByType(page, 'record-type');

    // Empty record type: without vendor/name the table cannot be auto-suggested,
    // so Table name is a missing required field alongside the base ones.
    const saveButton = frame.locator('[data-action="save-content-block"]').first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    await expect(page.locator(MODAL).filter({ hasText: 'Validation Error' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL)).toContainText('Table name');

    await context.close();
  });
});
