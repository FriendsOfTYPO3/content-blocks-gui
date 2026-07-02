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

  test('search filters rows to matches, shows no-results for unknown, restores on clear', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openModule(page);

    const rows = frame.locator('table.table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const initialCount = await rows.count();
    expect(initialCount, 'need at least one content block to exercise search').toBeGreaterThanOrEqual(1);

    // Derive a real search term from the first row's name cell (the first
    // td.col holds the name; the second holds the label).
    const firstName = (await rows.first().locator('td.col a').first().innerText()).trim();
    const namePart = firstName.split('/').pop() || firstName;
    const term = namePart.substring(0, Math.min(5, Math.max(3, namePart.length)));
    expect(term.length, 'derived search term must be >= 3 chars').toBeGreaterThanOrEqual(3);

    const searchInput = frame.locator('input[type="search"]');
    await searchInput.fill(term);
    await page.waitForTimeout(300);

    // Every remaining row must contain the term in name/label/extension.
    const filteredCount = await rows.count();
    expect(filteredCount, 'search must keep at least the source row').toBeGreaterThanOrEqual(1);
    expect(filteredCount, 'search must not widen the list').toBeLessThanOrEqual(initialCount);
    const termLower = term.toLowerCase();
    for (let i = 0; i < filteredCount; i++) {
      const text = (await rows.nth(i).innerText()).toLowerCase();
      expect(text, `filtered row ${i} should contain "${term}"`).toContain(termLower);
    }

    // Unknown term -> explicit no-results state.
    await searchInput.fill('zzzznomatch12345');
    await page.waitForTimeout(300);
    await expect(frame.getByText(/No results found for/i)).toBeVisible({ timeout: 3000 });

    // Clearing restores the full list.
    await searchInput.fill('');
    await page.waitForTimeout(300);
    await expect(rows).toHaveCount(initialCount);

    await context.close();
  });

  test('sort by name toggles ascending and descending order', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openModule(page);

    const rows = frame.locator('table.table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await rows.count();
    expect(rowCount, 'need at least two rows to verify ordering').toBeGreaterThanOrEqual(2);

    const readNames = async (): Promise<string[]> => {
      const count = await rows.count();
      const names: string[] = [];
      for (let i = 0; i < count; i++) {
        names.push((await rows.nth(i).locator('td.col a').first().innerText()).trim());
      }
      return names;
    };

    // Default sort is name ascending.
    const ascNames = await readNames();
    const expectedAsc = [...ascNames].sort((a, b) => a.localeCompare(b));
    expect(ascNames, 'default order should be name ascending').toEqual(expectedAsc);

    // Clicking the name header toggles to descending.
    const nameHeader = frame.locator('th.sortable').first();
    await nameHeader.click();
    await page.waitForTimeout(300);

    const descNames = await readNames();
    expect(descNames, 'clicking name header should reverse the order').toEqual([...expectedAsc].reverse());

    await context.close();
  });

  test('multi-select accumulates across type tabs (type-übergreifend)', async ({ browser }) => {
    const context = await createAuthContext(browser);
    const page = await context.newPage();
    const frame = await openModule(page);

    const rows = frame.locator('table.table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const ceCount = await rows.count();
    expect(ceCount, 'need content elements to select').toBeGreaterThanOrEqual(1);

    // Enter selection mode and select all Content Elements.
    await frame.getByText('Select Multiple').click();
    await expect(frame.getByText('Cancel Selection')).toBeVisible();
    const downloadButton = frame.locator('button', { hasText: 'Download Selected' });
    const selectAll = frame.locator('table.table thead input[type="checkbox"]');
    await selectAll.click();
    await expect(downloadButton).toContainText(`(${ceCount})`);

    // Switching tabs must NOT drop the selection — selection is keyed per
    // tab (`${tab}:${name}`) so the counter is cumulative across types.
    const rtTab = frame.locator('.nav-tabs button, .nav-tabs a').filter({ hasText: 'Record Types' });
    await expect(rtTab.first()).toBeVisible();
    await rtTab.first().click();
    await page.waitForTimeout(500);
    await expect(frame.getByText('Cancel Selection')).toBeVisible();
    await expect(downloadButton).toContainText(`(${ceCount})`);

    const rtRows = frame.locator('table.table tbody tr');
    await expect(rtRows.first()).toBeVisible({ timeout: 10000 });
    const rtCount = await rtRows.count();
    expect(rtCount, 'need record types to verify cross-type selection').toBeGreaterThanOrEqual(1);

    // Select all Record Types → counter accumulates across both types.
    await selectAll.click();
    await expect(downloadButton).toContainText(`(${ceCount + rtCount})`);

    await context.close();
  });
});
