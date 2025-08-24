/**
 * Test script to verify improved duplicate names error formatting
 */

import { test, expect } from '@playwright/test';
import { setupPowerModeTest, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Improved Error Formatting Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupPowerModeTest(page, 'regular');
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should show improved duplicate names formatting', async ({ page }) => {
        // Create duplicate names scenario - Player 1 and Player 2 both named "Alice"
        await helper.players.setPlayerName(1, 'Alice');
        await helper.players.setPlayerName(2, 'Alice');
        await helper.players.setPowerLevels(1, [7]);
        await helper.players.setPowerLevels(2, [7]);
        
        // Try to generate pods
        await helper.pods.generatePods();

        // Should see modern toast with improved duplicate name formatting
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        
        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Duplicate Player Names');
        
        // Check for improved formatting - should say "Player 2 and Player 3 both have the same name: Alice"
        const problemsList = toast.locator('.toast-suggestions li');
        await expect(problemsList.first()).toContainText('Player 2 and Player 3 both have the same name: "alice"');
    });

    test('should show comprehensive validation errors', async ({ page }) => {
        // Create a scenario with multiple types of errors:
        // Player 1: has name "Alice", has power levels (valid)
        // Player 2: has name "Bob", missing power levels
        // Player 3: missing name but has power levels
        // Player 4: completely empty (should be ignored)
        
        await helper.players.setPlayerName(0, 'Alice');
        await helper.players.setPowerLevels(0, [7]);
        
        await helper.players.setPlayerName(1, 'Bob');
        // Don't set power levels for Player 2
        
        // Player 3 - set power levels but leave name empty
        await helper.players.setPowerLevels(2, [5]);
        
        // Player 4 - completely empty, should be ignored
        
        await helper.pods.generatePods();

        // Should see validation errors toast
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        
        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Validation Errors Found');
        
        // Should show Player 2's missing power levels
        const problemsList = toast.locator('.toast-suggestions li');
        await expect(problemsList.nth(0)).toContainText('Player 2 (Bob): No power levels selected');
        
        // Should also show Player 3's missing name
        await expect(problemsList.nth(1)).toContainText('Player 3: Missing name');
    });
});
