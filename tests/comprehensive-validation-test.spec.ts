import { test, expect } from '@playwright/test';
import { setupPowerModeTest, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Comprehensive Error Validation Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupPowerModeTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should show multiple errors per player when applicable', async ({ page }) => {
        // Create a scenario where we have a name but no power levels
        // This should definitely trigger validation

        // Player 1: Missing power levels only (Bob with no power)
        await helper.players.setPlayerName(0, 'Bob');
        // Don't set power levels for Player 1

        await helper.pods.generatePods();

        // Should see validation errors toast
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });

        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Validation Errors Found');

        // Should show Player 1 with missing power levels
        const problemsList = toast.locator('.toast-suggestions li');
        await expect(problemsList.nth(0)).toContainText('Player 1 (Bob): No power levels selected');
    });
});
