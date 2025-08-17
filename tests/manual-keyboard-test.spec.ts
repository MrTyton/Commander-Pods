import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Manual Keyboard Test - Debug Issues', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should not show tooltip and escape/enter should work', async ({ page }) => {
        // Add a player first
        await helper.players.createPlayers([{ name: 'Test Player', power: [] }]);

        const powerBtn = page.locator('.player-row:first-child .power-selector-btn');
        const dropdown = page.locator('.player-row:first-child .power-selector-dropdown');

        // Click to open dropdown
        await powerBtn.click();
        await expect(dropdown).toBeVisible();

        // Check if tooltip exists - it should not
        const tooltip = page.locator('.player-row:first-child .keyboard-hint');
        await expect(tooltip).not.toBeVisible();

        // Focus the power selector button
        await powerBtn.focus();

        // Test Escape key - should close dropdown
        await page.keyboard.press('Escape');
        await expect(dropdown).not.toBeVisible();

        // Open dropdown again
        await powerBtn.click();
        await expect(dropdown).toBeVisible();
        await powerBtn.focus();

        // Test Enter key behavior - should work with number input
        await page.keyboard.press('7');
        await page.keyboard.press('Enter');

        // Should have selected power 7
        await expect(powerBtn).toContainText('Power: 7');
        await expect(dropdown).not.toBeVisible();
    });
});
