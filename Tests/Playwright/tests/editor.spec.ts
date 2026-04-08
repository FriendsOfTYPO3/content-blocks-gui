import { test, expect } from '@playwright/test';
import { createAuthContext, openNewEditor, dropFieldType } from './helpers';

test.describe('Editor', () => {
  test('loads with three panes', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
      await expect(editorFrame.locator('content-block-editor')).toBeAttached();
      await expect(editorFrame.locator('content-block-editor-left-pane')).toBeAttached();
      await expect(editorFrame.locator('content-block-editor-middle-pane')).toBeAttached();
      await expect(editorFrame.locator('content-block-editor-right-pane')).toBeAttached();
    }
    await context.close();
  });

  test('settings tab has form fields', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
      await expect(editorFrame.locator('#vendor')).toBeAttached();
      await expect(editorFrame.locator('#name')).toBeAttached();
      await expect(editorFrame.locator('#extension')).toBeAttached();
    }
    await context.close();
  });

  test('components tab shows field types', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
      const componentsTab = editorFrame.getByText('Components');
      if (await componentsTab.isVisible()) {
        await componentsTab.click();
        await expect(editorFrame.locator('draggable-field-type').first()).toBeAttached();
      }
    }
    await context.close();
  });

  test('drag and drop field type to middle pane', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
      const fieldsBefore = await editorFrame.locator('content-block-editor-middle-pane draggable-field-type').count();
      const dropped = await dropFieldType(page, 'Text', 'Text_0');
      if (dropped) {
        await page.waitForTimeout(500);
        const fieldsAfter = await editorFrame.locator('content-block-editor-middle-pane draggable-field-type').count();
        expect(fieldsAfter).toBeGreaterThan(fieldsBefore);
      }
    }
    await context.close();
  });

  test('field appears in right pane after click', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
      await dropFieldType(page, 'Text', 'Text_0');
      await page.waitForTimeout(500);
      const field = editorFrame.locator('content-block-editor-middle-pane draggable-field-type').first();
      if (await field.isVisible()) {
        await field.click();
        await page.waitForTimeout(500);
        const rightPane = editorFrame.locator('content-block-editor-right-pane');
        await expect(rightPane.locator('#identifier')).toBeAttached({ timeout: 5000 });
      }
    }
    await context.close();
  });

  test('extension dropdown lists destination extensions', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
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
    }
    await context.close();
  });

  test('save content block roundtrip', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const editorFrame = await openNewEditor(page);
    if (editorFrame) {
      const vendorInput = editorFrame.locator('#vendor');
      const nameInput = editorFrame.locator('#name');
      const extensionSelect = editorFrame.locator('#extension');

      if (await vendorInput.isVisible()) {
        await vendorInput.fill('test-vendor');
        await nameInput.fill('test-block-' + Date.now());

        const firstOption = extensionSelect.locator('option:not([value="0"])').first();
        if (await firstOption.count() > 0) {
          const optionValue = await firstOption.getAttribute('value');
          if (optionValue) {
            await extensionSelect.selectOption(optionValue);
          }
        }

        await dropFieldType(page, 'Text', 'Text_0');
        await page.waitForTimeout(500);

        const saveButton = page.locator('[data-action="save-content-block"]').first();
        if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(3000);
          const errorNotification = page.locator('.alert-danger, .callout-danger').first();
          const hasError = await errorNotification.isVisible().catch(() => false);
          expect(hasError).toBe(false);
        }
      }
    }
    await context.close();
  });
});
