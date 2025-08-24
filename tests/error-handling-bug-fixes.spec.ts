/**
 * Test for the three specific bug fixes:
 * 1. Toast flickering when clearing previous errors
 * 2. Bracket mode error messaging
 * 3. Settings menu overlay issues
 */

import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Error Handling Bug Fixes', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should not flicker when showing new error after clearing previous', async ({ page }) => {
        // First create an error
        await helper.players.setPlayerName(0, 'TestPlayer');
        // Don't set power levels to create error

        await helper.pods.generatePods();

        // Wait for first toast to appear
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        let toasts = await page.locator('.toast-container .toast').count();
        expect(toasts).toBe(1);

        // Now fix the first error but create a different error
        await helper.players.setPowerLevels(0, [7]);
        // Create duplicate name error instead
        await helper.players.setPlayerName(1, 'TestPlayer'); // Same name as Player 1
        await helper.players.setPowerLevels(1, [8]);

        // Generate pods again - should clear first error and show new one
        await helper.pods.generatePods();

        // Should still have exactly 1 toast (not flickering between 2)
        await page.waitForTimeout(200); // Small delay for animations
        toasts = await page.locator('.toast-container .toast').count();
        expect(toasts).toBe(1);

        // Should show duplicate names error
        const toast = page.locator('.toast-container .toast').first();
        await expect(toast.locator('.toast-title')).toContainText('Duplicate Player Names');
    });

    test('should show correct error message in bracket mode', async ({ page }) => {
        // Switch to bracket mode
        await page.click('#toggle-bracket-mode');
        await helper.utils.wait(500);

        // Set player name but no bracket selection
        await helper.players.setPlayerName(0, 'TestPlayer');
        // Don't select any bracket

        await helper.pods.generatePods();

        // Should see bracket-specific error message
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });

        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Bracket Required');

        const suggestions = toast.locator('.toast-suggestions li');
        await expect(suggestions).toContainText('Player 1 (TestPlayer): No bracket selected');
    });

    test('should not close settings menu when closing error toast', async ({ page }) => {
        // Open settings menu
        await page.click('#sidebar-toggle');
        await helper.utils.wait(500);

        // Verify settings sidebar is open
        const settingsSidebar = page.locator('#settings-sidebar');
        await expect(settingsSidebar).toHaveClass(/open/);

        // Create an error while settings is open
        await helper.players.setPlayerName(0, 'TestPlayer');
        // Don't set power levels

        await helper.pods.generatePods();

        // Should see error toast
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();

        // Close the error toast
        await toast.locator('.toast-close').click();

        // Settings sidebar should still be open
        await expect(settingsSidebar).toHaveClass(/open/);

        // Error toast should be gone
        await expect(toast).not.toBeVisible();
    });

    test('should handle rapid error generation without positioning issues', async ({ page }) => {
        // Create multiple rapid errors to test positioning
        for (let i = 0; i < 3; i++) {
            // Create different validation errors
            await helper.players.setPlayerName(0, `Player${i}`);
            if (i % 2 === 0) {
                // Sometimes don't set power levels - just leave them empty
                await helper.players.setPowerLevels(0, []);
            } else {
                // Sometimes set power levels
                await helper.players.setPowerLevels(0, [7]);
            }

            await helper.pods.generatePods();
            await helper.utils.wait(100); // Small delay between attempts
        }

        // Should only have one toast visible (the latest)
        await page.waitForTimeout(500); // Wait for animations
        const toastCount = await page.locator('.toast-container .toast').count();
        expect(toastCount).toBeLessThanOrEqual(1);

        if (toastCount === 1) {
            const toast = page.locator('.toast-container .toast').first();
            await expect(toast).toBeVisible();
        }
    });
});
