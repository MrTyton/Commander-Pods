/**
 * Test for bracket mode error message using proper framework helpers
 */

import { test, expect } from '@playwright/test';
import { setupBracketModeTest, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Bracket Mode Error Fix', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBracketModeTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should show "No bracket selected" in bracket mode', async ({ page }) => {
        // Set player name but no bracket using helper
        await helper.players.setPlayerName(0, 'TestPlayer');

        // Try to generate pods using helper
        await helper.pods.generatePods();

        // Wait for toast to appear
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });

        // Verify bracket-specific error message
        const toast = page.locator('.toast-container .toast').first();
        const suggestions = toast.locator('.toast-suggestions li').first();
        await expect(suggestions).toContainText('No bracket selected');
    });
});
