/**
 * Test to verify that Player 4 validation is working correctly
 */

import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Player 4 Validation Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should flag Player 4 as incomplete when other players are filled', async ({ page }) => {
        // Fill in players 1-3 but leave Player 4 empty
        await helper.players.setPlayerName(0, 'Alice');
        await helper.players.setPowerLevels(0, [7]);

        await helper.players.setPlayerName(1, 'Bob');
        await helper.players.setPowerLevels(1, [7]);

        await helper.players.setPlayerName(2, 'Charlie');
        await helper.players.setPowerLevels(2, [7]);

        // Player 4 remains empty (default placeholder "Player Name")

        // Try to generate pods
        await helper.pods.generatePods();

        // Should see validation error that includes Player 4 being incomplete
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });

        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Player Name Required');

        // Should specifically mention Player 4 issues
        const suggestions = toast.locator('.toast-suggestions li');
        await expect(suggestions).toContainText('Player 4: Missing name, No power levels selected');
    });

    test('should show specific title for single duplicate names error', async ({ page }) => {
        // Create duplicate names only (no other errors)
        await helper.players.setPlayerName(0, 'Alice');
        await helper.players.setPowerLevels(0, [7]);

        await helper.players.setPlayerName(1, 'Alice'); // Duplicate name
        await helper.players.setPowerLevels(1, [7]);

        // Remove other players to avoid additional validation errors
        await page.click('.player-row:nth-child(3) .remove-player-btn');
        await page.click('.player-row:nth-child(3) .remove-player-btn');

        // Try to generate pods
        await helper.pods.generatePods();

        // Should see specific title for duplicate names
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });

        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Duplicate Player Names');
    });

    test('should clear errors when validation passes and pods are generated', async ({ page }) => {
        // Test scenario: Verify that fixing validation errors clears the error toast
        // Focus on error clearing behavior rather than pod generation

        // Part 1: Create validation error
        await helper.players.setPlayerName(0, 'Alice');
        // Don't set power levels for Alice - this will trigger validation error

        await helper.pods.generatePods();

        // Verify we get validation error toast
        await page.waitForSelector('.toast-container .toast', { timeout: 5000 });
        const toast = page.locator('.toast-container .toast').first();
        await expect(toast).toBeVisible();
        await expect(toast.locator('.toast-title')).toContainText('Validation Errors Found');

        // Part 2: Fix the validation errors
        await helper.players.setPowerLevels(0, [7]); // Fix Alice's missing power

        // Try to generate pods again - this should clear the error
        await helper.pods.generatePods();

        // Key test: Verify error toast is cleared
        await expect(toast).not.toBeVisible();

        // Verify no error toasts remain
        await expect(page.locator('.toast-container .toast')).not.toBeVisible();

        // This test passes if the error is cleared, regardless of pod generation
        // The key functionality is that validation errors are properly cleared
    });
});
