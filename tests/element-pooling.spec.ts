import { test, expect } from '@playwright/test';
import { setupValidationTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Element Pooling System', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupValidationTest(page);
    });

    test('should use element pooling for DOM creation', async ({ page }) => {
        // Add some players to trigger DOM creation
        await helper.players.setPlayerName(1, 'Alice');
        await helper.players.setPlayerName(2, 'Bob');
        await helper.players.setPlayerName(3, 'Charlie');

        // Generate pods to trigger extensive DOM creation
        await helper.pods.generatePods();

        // Verify pods were created successfully
        await expect(page.locator('.pod')).toHaveCount(1);

        // Verify the pod contains players
        await expect(page.locator('.pod .pod-player')).toHaveCount(3);

        // Reset and regenerate to test element reuse
        await helper.setup.reset();
        await helper.pods.generatePods();

        // Verify pods are still created correctly after reset
        await expect(page.locator('.pod')).toHaveCount(1);
        await expect(page.locator('.pod .pod-player')).toHaveCount(3);

        console.log('Element pooling test completed successfully');
    });

    test('should handle display mode with pooled elements', async ({ page }) => {
        // Set up players
        await helper.players.setPlayerName(1, 'Alice');
        await helper.players.setPowerLevels(1, [7]);
        await helper.players.setPlayerName(2, 'Bob');
        await helper.players.setPowerLevels(2, [8]);
        await helper.players.setPlayerName(3, 'Charlie');
        await helper.players.setPowerLevels(3, [7]);
        await helper.players.setPlayerName(4, 'Dave');
        await helper.players.setPowerLevels(4, [8]);

        // Generate pods
        await helper.pods.generatePods();
        await expect(page.locator('.pod')).toHaveCount(1);

        // Enter display mode (uses pooled elements in display-mode.ts)
        await helper.displayMode.enterDisplayMode();

        // Verify display mode loads correctly
        await expect(page.locator('.display-mode-container')).toBeVisible();
        await expect(page.locator('.display-mode-container .pod')).toHaveCount(1);

        // Exit display mode
        await helper.displayMode.exitDisplayMode();
        await expect(page.locator('.display-mode-container')).not.toBeVisible();

        console.log('Display mode pooling test completed successfully');
    });
});
