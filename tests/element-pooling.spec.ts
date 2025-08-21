import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Element Pooling System', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('should use element pooling for DOM creation', async ({ page }) => {
        // Set to power mode for pod generation
        await helper.setup.setMode('power');

        // Create players using the proper framework method
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Diana', power: [7] }
        ]);

        // Generate pods to trigger extensive DOM creation
        await helper.pods.generatePods();

        // Verify pods were created successfully using framework helpers
        await helper.pods.expectPodCount(1);
        await helper.pods.expectPodHasPlayers(1, ['Alice', 'Bob', 'Charlie', 'Diana']);

        // Reset and regenerate to test element reuse
        await helper.setup.resetWithConfirmation(true);

        // Set to power mode again after reset
        await helper.setup.setMode('power');

        // Create different players using the proper framework method
        await helper.players.createPlayers([
            { name: 'David', power: [8] },
            { name: 'Eve', power: [8] },
            { name: 'Frank', power: [8] },
            { name: 'Grace', power: [8] }
        ]);

        await helper.pods.generatePods();

        // Verify pods are still created correctly after reset using framework helpers
        await helper.pods.expectPodCount(1);
        await helper.pods.expectPodHasPlayers(1, ['David', 'Eve', 'Frank', 'Grace']);
    });

    test('should handle display mode with pooled elements', async ({ page }) => {
        // Set to power mode for pod generation
        await helper.setup.setMode('power');

        // Create players using the proper framework method
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [8] }
        ]);

        // Generate pods
        await helper.pods.generatePods();
        await helper.pods.expectPodCount(1);

        // Enter display mode (uses pooled elements in display-mode.ts)
        await helper.displayMode.enterDisplayMode();

        // Verify display mode loads correctly using framework helpers
        await helper.displayMode.expectDisplayModeActive();
        await expect(helper.displayMode.getDisplayPods()).toHaveCount(1);

        // Exit display mode
        await helper.displayMode.exitDisplayMode();
        await helper.displayMode.expectDisplayModeInactive();
    });
});
