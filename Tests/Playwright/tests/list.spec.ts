import { test, expect } from '@playwright/test';
import { createAuthContext, openModule } from './helpers';

test.describe('List View', () => {
  test('module loads list component', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openModule(page);
    await expect(frame.locator('content-block-list')).toBeAttached({ timeout: 10000 });
    await context.close();
  });

  test('shows tab navigation', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openModule(page);
    await expect(frame.locator('.nav-tabs').first()).toBeVisible({ timeout: 10000 });
    await context.close();
  });

  test('selection mode roundtrip: select all, toggle single, re-select all', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openModule(page);

    // Wait for list to render with at least one row
    const listComponent = frame.locator('content-block-list');
    await expect(listComponent).toBeAttached({ timeout: 10000 });
    const rows = frame.locator('table.table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const totalRows = await rows.count();
    // Need at least 2 rows for this test to be meaningful
    test.skip(totalRows < 2, 'Need at least 2 content blocks in the list');

    // Enter selection mode
    const selectionModeButton = frame.getByText('Select Multiple');
    await selectionModeButton.click();
    await expect(frame.getByText('Cancel Selection')).toBeVisible();

    // Verify row checkboxes appeared and none are checked
    const rowCheckboxes = frame.locator('table.table tbody tr td.col-checkbox input[type="checkbox"]');
    await expect(rowCheckboxes.first()).toBeVisible();
    const downloadButton = frame.locator('button', { hasText: 'Download Selected' });
    await expect(downloadButton).toContainText('(0)');

    // Click select-all header checkbox
    const selectAllCheckbox = frame.locator('table.table thead input[type="checkbox"]');
    await selectAllCheckbox.click();

    // All rows should be checked, counter should match total
    await expect(downloadButton).toContainText(`(${totalRows})`);
    for (let i = 0; i < totalRows; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }

    // Uncheck the first row
    await rowCheckboxes.first().click();
    await expect(rowCheckboxes.first()).not.toBeChecked();
    await expect(downloadButton).toContainText(`(${totalRows - 1})`);

    // The select-all checkbox should now be indeterminate (not fully checked)
    await expect(selectAllCheckbox).not.toBeChecked();

    // Click select-all again — this is the regression scenario:
    // all rows including the unchecked one must become checked again
    await selectAllCheckbox.click();
    await expect(downloadButton).toContainText(`(${totalRows})`);
    for (let i = 0; i < totalRows; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }

    // Click select-all once more to deselect all
    await selectAllCheckbox.click();
    await expect(downloadButton).toContainText('(0)');
    for (let i = 0; i < totalRows; i++) {
      await expect(rowCheckboxes.nth(i)).not.toBeChecked();
    }

    // Exit selection mode
    await frame.getByText('Cancel Selection').click();
    await expect(frame.getByText('Select Multiple')).toBeVisible();

    await context.close();
  });
});
