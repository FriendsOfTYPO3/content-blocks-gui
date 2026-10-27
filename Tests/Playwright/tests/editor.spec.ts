import { test, expect, type FrameLocator, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  createAuthContext, openNewEditor, openNewEditorByType, openModule,
  dropFieldType, dropFieldIntoCollection, fillEditorSettings, clickField,
  switchLeftPaneTab, selectBaseField, saveAndVerify, findInListAndEdit, deleteFromList, MODAL,
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
    await expect(editorFrame.locator('#description')).toBeAttached();
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
    const dropped = await dropFieldType(page, 'Text', 'text_0');
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
    const dropped = await dropFieldType(page, 'Text', 'text_0');
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

  test('field identifiers are trimmed, lowercased, and separated with underscores (#21)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditor(page);

    expect(await dropFieldType(page, 'Text', 'text_0')).toBe(true);
    await page.waitForTimeout(500);
    await clickField(frame, 'text_0');
    await renameActiveField(frame, page, '  Hero   Headline  ');

    await expect(frame.locator('content-block-editor-right-pane #identifier')).toHaveValue('hero_headline');
    await expectMiddlePaneIdentifier(frame, 'hero_headline', 'text_0');

    // Hyphens and slashes are invalid in column names and are folded to underscores too.
    await renameActiveField(frame, page, 'Hero-Headline / Sub-Line');
    await expect(frame.locator('content-block-editor-right-pane #identifier')).toHaveValue('hero_headline_sub_line');
    await expectMiddlePaneIdentifier(frame, 'hero_headline_sub_line', 'hero_headline');

    // What cannot be fixed automatically is reported by the validation badge.
    // The badge is rendered once per validated property (identifier, type, useExistingField).
    const badge = frame.locator('content-block-editor-right-pane .alert-danger').first();
    await renameActiveField(frame, page, '1st-Field');
    await expect(frame.locator('content-block-editor-right-pane #identifier')).toHaveValue('1st_field');
    await expect(badge).toContainText('snake_case');
    await renameActiveField(frame, page, 'first_field');
    await expect(frame.locator('content-block-editor-right-pane .alert-danger')).toHaveCount(0);

    await context.close();
  });

  test('save is blocked when vendor or name violate the Content Blocks naming pattern (#25)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, 'My_Vendor', 'Bad Name');

    await frame.locator('[data-action="save-content-block"]').first().click();

    await expect(page.locator(MODAL).filter({ hasText: 'Validation Error' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL)).toContainText('Vendor "My_Vendor"');
    await expect(page.locator(MODAL)).toContainText('Name "Bad Name"');
    await expect(page.locator(MODAL)).toContainText('lowercase letters');

    await context.close();
  });

  test('backend rejection (success: false) is reported instead of a false success (#25)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    // The backend answers validation failures with HTTP 200 and success: false.
    await page.route(/\/contentblocks\/gui\/cb\/save(\?|$)/, async route => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Simulated backend rejection' }),
      });
    });
    const frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, 'test', `pw-reject-${Date.now()}`);

    await frame.locator('[data-action="save-content-block"]').first().click();

    await expect(page.locator(MODAL).filter({ hasText: 'Error' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL)).toContainText('Simulated backend rejection');
    await expect(page.locator(MODAL).filter({ hasText: 'Success' })).toHaveCount(0);

    await context.close();
  });

  test('blur keeps an identifier chosen from existing base fields intact (#21)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openNewEditor(page);

    expect(await dropFieldType(page, 'Text', 'text_0')).toBe(true);
    await page.waitForTimeout(500);
    await clickField(frame, 'text_0');
    await selectBaseField(page, frame, 'header');
    const identifier = frame.locator('content-block-editor-right-pane #identifier');
    await expect(identifier).toHaveValue('header');

    // Focus + blur without typing must not alter the selected existing field.
    await identifier.focus();
    await identifier.blur();
    await page.waitForTimeout(300);
    await expect(identifier).toHaveValue('header');
    await expectMiddlePaneIdentifier(frame, 'header', 'text_0');

    await context.close();
  });

  test('content block description is editable and survives a second save (#29)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const name = `pw-desc-${Date.now()}`;
    const fullName = `test/${name}`;
    const description = 'Teaser with headline and text';

    let frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, 'test', name);
    await frame.locator('#description').fill(description);
    expect(await dropFieldType(page, 'Text', 'text_0')).toBe(true);
    await page.waitForTimeout(500);
    await saveAndVerify(page, frame);

    // Reopen: the description must have been written to config.yaml.
    frame = await findInListAndEdit(page, fullName);
    await expect(frame.locator('#description')).toHaveValue(description);

    // Change something else and save again: the description must not be
    // replaced by the ConfigBuilder default ("Description for Content Element …").
    await frame.locator('#title').fill('Changed title');
    await saveAndVerify(page, frame);
    frame = await findInListAndEdit(page, fullName);
    await expect(frame.locator('#title')).toHaveValue('Changed title');
    await expect(frame.locator('#description')).toHaveValue(description);

    await deleteFromList(page, fullName, 'Content Elements');
    await context.close();
  });

  test('a Content Block using YAML tags (!php/const) is refused by save and editor (#22)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const name = `pw-yamltag-${Date.now()}`;
    const fullName = `test/${name}`;

    let frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, 'test', name);
    expect(await dropFieldType(page, 'Text', 'text_0')).toBe(true);
    await page.waitForTimeout(500);
    await saveAndVerify(page, frame);

    // Open the block, then put a !php/const into its config.yaml on disk (the
    // repo is bind-mounted into DDEV). Symfony would parse it as null, so the GUI
    // must refuse to overwrite the file.
    frame = await findInListAndEdit(page, fullName);
    // Where the host extension keeps its Content Blocks, seen from the test host.
    // Defaults to the examples package of the DDEV project; set
    // PLAYWRIGHT_CONTENT_BLOCKS_DIR for other instances (e.g. the legacy test projects).
    const blocksDir = process.env.PLAYWRIGHT_CONTENT_BLOCKS_DIR
      || path.resolve(__dirname, '../../../Build/local-packages/content_blocks_examples/ContentBlocks');
    const configPath = path.join(blocksDir, 'ContentElements', name, 'config.yaml');
    if (!fs.existsSync(configPath)) {
      await deleteFromList(page, fullName, 'Content Elements');
      await context.close();
      test.skip(true, `config.yaml not reachable at ${configPath} - set PLAYWRIGHT_CONTENT_BLOCKS_DIR`);
    }
    const original = fs.readFileSync(configPath, 'utf8');
    const tagged = original.replace(/^(\s+)type: Text$/m, '$1type: Text\n$1description: !php/const PHP_VERSION');
    expect(tagged, 'could not inject tag into config.yaml').not.toBe(original);
    fs.writeFileSync(configPath, tagged);

    await frame.locator('[data-action="save-content-block"]').first().click();
    await expect(page.locator(MODAL).filter({ hasText: 'Error' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(MODAL)).toContainText('YAML tags');
    await page.locator(MODAL).locator('button', { hasText: 'OK' }).click();
    expect(fs.readFileSync(configPath, 'utf8'), 'config.yaml must be left untouched').toBe(tagged);

    // Opening the block from the list must bounce back to the list with a message.
    const listFrame = await openModule(page);
    const row = listFrame.locator('tr', { hasText: fullName });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('a').filter({ hasText: fullName }).first().click();
    await page.waitForLoadState('networkidle');
    const bounced = page.frameLocator('typo3-iframe-module iframe');
    await expect(bounced.locator('content-block-list')).toBeAttached({ timeout: 10000 });
    await expect(bounced.locator('.alert-danger')).toContainText('YAML tags');

    await deleteFromList(page, fullName, 'Content Elements');
    await context.close();
  });

  test('numeric field properties are written as integers to config.yaml (#32)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const name = `pw-numeric-${Date.now()}`;
    const fullName = `test/${name}`;

    let frame = await openNewEditorByType(page, 'content-block');
    await fillEditorSettings(page, frame, 'test', name);
    expect(await dropFieldType(page, 'File', 'file_0')).toBe(true);
    await page.waitForTimeout(500);

    // Type into the number input and blur it, exactly as a user would. The
    // DOM delivers strings, the YAML must still get integers.
    const maxitems = frame.locator('content-block-editor-right-pane #maxitems');
    await expect(maxitems).toBeVisible({ timeout: 5000 });
    await maxitems.fill('2');
    await maxitems.blur();
    await page.waitForTimeout(300);
    await saveAndVerify(page, frame);

    const blocksDir = process.env.PLAYWRIGHT_CONTENT_BLOCKS_DIR
      || path.resolve(__dirname, '../../../Build/local-packages/content_blocks_examples/ContentBlocks');
    const configPath = path.join(blocksDir, 'ContentElements', name, 'config.yaml');
    if (!fs.existsSync(configPath)) {
      await deleteFromList(page, fullName, 'Content Elements');
      await context.close();
      test.skip(true, `config.yaml not reachable at ${configPath} - set PLAYWRIGHT_CONTENT_BLOCKS_DIR`);
    }
    expect(fs.readFileSync(configPath, 'utf8'), 'maxitems must be an unquoted integer').toMatch(/^\s+maxitems: 2$/m);

    // A deliberate 0 is a value, not "empty": it must be saved and shown again.
    frame = await findInListAndEdit(page, fullName);
    await clickField(frame, 'file_0');
    const maxitemsAgain = frame.locator('content-block-editor-right-pane #maxitems');
    await expect(maxitemsAgain).toHaveValue('2');
    await maxitemsAgain.fill('0');
    await maxitemsAgain.blur();
    await page.waitForTimeout(300);
    await saveAndVerify(page, frame);
    expect(fs.readFileSync(configPath, 'utf8'), 'maxitems 0 must be kept').toMatch(/^\s+maxitems: 0$/m);
    frame = await findInListAndEdit(page, fullName);
    await clickField(frame, 'file_0');
    await expect(frame.locator('content-block-editor-right-pane #maxitems')).toHaveValue('0');

    await deleteFromList(page, fullName, 'Content Elements');
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
    const dropped = await dropFieldType(page, 'Text', 'text_0');
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

    // 1) Root-level Text → rename to "root_text"
    expect(await dropFieldType(page, 'Text', 'text_0'), 'Drop root Text').toBe(true);
    await page.waitForTimeout(500);
    await clickField(frame, 'text_0');
    await renameActiveField(frame, page, 'root_text');
    await expectMiddlePaneIdentifier(frame, 'root_text', 'text_0');

    // 2) Collection + inner Text → rename inner Text to "collection_text"
    expect(await dropFieldType(page, 'Collection', 'collection_0'), 'Drop Collection').toBe(true);
    await page.waitForTimeout(500);
    expect(await dropFieldIntoCollection(page, 'Text', 'text_0', 0), 'Drop Text into Collection').toBe(true);
    await page.waitForTimeout(500);
    // The only text_0 now lives inside collection_0 (root Text was renamed in step 1).
    await clickField(frame, 'text_0');
    await renameActiveField(frame, page, 'collection_text');
    await expectMiddlePaneIdentifier(frame, 'collection_text', 'text_0');
    // Sanity: container and its previously-renamed sibling must still be intact.
    await expectMiddlePaneIdentifier(frame, 'collection_0');
    await expectMiddlePaneIdentifier(frame, 'root_text');

    // 3) Second root-level Text (after the Collection).
    //    editor.ts#getNextFieldIndex reuses the lowest free "<Type>_<n>" slot,
    //    so with root = [root_text, collection_0] the new Text is named text_0
    //    (the original text_0 was renamed away in step 1). The identifier we
    //    pass into dropFieldType is ignored for new drops — just a probe.
    expect(await dropFieldType(page, 'Text', 'probe'), 'Drop second root Text').toBe(true);
    await page.waitForTimeout(500);
    await expectMiddlePaneIdentifier(frame, 'text_0');

    // 4) Palette with a Textarea inside → rename the Textarea to "palette_textarea"
    expect(await dropFieldType(page, 'Palette', 'palette_0'), 'Drop Palette').toBe(true);
    await page.waitForTimeout(500);
    // Nested (level > 0) dropzones in document order at this point:
    //   [0] collection_0 initial dropzone
    //   [1] collection_0 dropzone after collection_text
    //   [2] palette_0 initial dropzone
    expect(await dropFieldIntoCollection(page, 'Textarea', 'textarea_0', 2), 'Drop Textarea into Palette').toBe(true);
    await page.waitForTimeout(500);
    await clickField(frame, 'textarea_0');
    await renameActiveField(frame, page, 'palette_textarea');
    await expectMiddlePaneIdentifier(frame, 'palette_textarea', 'textarea_0');

    // 5) Rename the containers themselves. Children must stay put — their
    //    parentPath is index-based, so renaming the container must not break
    //    anything downstream.
    await clickField(frame, 'palette_0');
    await renameActiveField(frame, page, 'my_palette');
    await expectMiddlePaneIdentifier(frame, 'my_palette', 'palette_0');
    await expectMiddlePaneIdentifier(frame, 'palette_textarea');

    await clickField(frame, 'collection_0');
    await renameActiveField(frame, page, 'my_collection');
    await expectMiddlePaneIdentifier(frame, 'my_collection', 'collection_0');
    await expectMiddlePaneIdentifier(frame, 'collection_text');

    // Final sanity pass: the full expected identifier set is in the middle pane.
    for (const id of ['root_text', 'my_collection', 'collection_text', 'text_0', 'my_palette', 'palette_textarea']) {
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
    let dropped = await dropFieldType(page, 'Basic', 'basic_0');
    expect(dropped, 'Drop Basic field (record type)').toBe(true);
    await page.waitForTimeout(400);
    await clickField(frame, 'basic_0');
    await page.waitForTimeout(300);
    const rtDropdown = frame.locator('content-block-editor-right-pane select#identifier');
    await expect(rtDropdown).toBeVisible({ timeout: 5000 });
    await expect(
      rtDropdown.locator('option', { hasText: 'TYPO3/Appearance' }),
      'Appearance must not be selectable for record types',
    ).toHaveCount(0);

    // Content Element: the same dropdown offers Appearance.
    frame = await openNewEditorByType(page, 'content-block');
    dropped = await dropFieldType(page, 'Basic', 'basic_0');
    expect(dropped, 'Drop Basic field (content element)').toBe(true);
    await page.waitForTimeout(400);
    await clickField(frame, 'basic_0');
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
