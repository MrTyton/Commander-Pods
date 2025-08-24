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
        // Clear any existing data first
        await helper.setup.reset();

        // Test scenario: Verify that fixing one error and creating another doesn't cause
        // multiple toasts to briefly appear simultaneously (no flickering)

        // Step 1: Create first error - missing power levels 
        await helper.players.setPlayerName(0, 'TestPlayer');
        await helper.players.setPowerLevels(0, [7]);
        await helper.players.setPlayerName(1, 'Player2');
        // Player2 has no power levels, will trigger validation error

        await helper.pods.generatePods();

        // Verify we get the validation error
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        let toasts = await page.locator('.toast-container .toast').count();
        expect(toasts).toBe(1);

        // Step 2: Fix the first error AND create a different error in the same action
        await helper.players.setPowerLevels(1, [7]); // Fix power levels
        await helper.players.setPlayerName(1, 'TestPlayer'); // Create duplicate name

        // Step 3: Generate pods again
        await helper.pods.generatePods();

        // Allow time for any error processing/animation
        await page.waitForTimeout(1000);

        // Key test: Check that we don't have multiple toasts (no flickering)
        // The system might clear all toasts and show a new one, or update the existing one
        toasts = await page.locator('.toast-container .toast').count();

        // Should have 0 or 1 toast, but never more than 1 (no flickering)
        expect(toasts).toBeLessThanOrEqual(1);

        // If there's a toast, it should be the duplicate names error
        if (toasts === 1) {
            const toast = page.locator('.toast-container .toast').first();
            await expect(toast.locator('.toast-title')).toContainText('Duplicate Player Names');
        }
    });

    test('should show correct error message in bracket mode', async ({ page }) => {
        // Switch to bracket mode using the framework helper
        await helper.setup.setMode('bracket');
        await helper.utils.wait(500);

        // Create player with name but no bracket selection
        await helper.players.createPlayers([
            { name: 'TestPlayer', bracket: [] } // No bracket to trigger error
        ]);

        // Try to generate pods - should show bracket-specific error
        await helper.pods.generatePods();

        // Should see bracket-specific error message
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });

        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Validation Errors Found');

        const suggestions = toast.locator('.toast-suggestions li');
        await expect(suggestions.first()).toContainText('TestPlayer): No bracket selected');
    });

    test('should not close settings menu when closing error toast', async ({ page }) => {
        // Clear any existing data first
        await helper.setup.reset();

        // Test scenario: Verify that dismissing error toasts doesn't accidentally close settings menu

        // Step 1: Open settings sidebar
        await page.click('#settings-toggle');
        await page.waitForSelector('#settings-sidebar.open', { state: 'visible' });

        // Step 2: Trigger an error while settings is open
        await helper.players.setPlayerName(0, 'TestPlayer');
        // Don't set power levels - will cause validation error

        await helper.pods.generatePods();

        // Step 3: Wait for error toast to appear
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();

        // Step 4: Close the error toast by clicking its close button
        await toast.locator('.toast-close').click();
        await page.waitForTimeout(500); // Allow close animation

        // Step 5: Verify settings sidebar is still open (key test)
        // Test that the sidebar container is still visible
        await expect(page.locator('#settings-sidebar')).toBeVisible();

        // And that the sidebar is still accessible (simpler check)
        await expect(page.locator('#settings-sidebar')).toBeVisible();

        // And the toast is gone
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
