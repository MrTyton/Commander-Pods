import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

/**
 * Element Pooling System Validation
 * 
 * This test demonstrates proper usage of the established test framework
 * to validate that our centralized element pooling system works correctly.
 * 
 * Following patterns from FRAMEWORK-SUMMARY.md:
 * - Uses standardized setup/teardown functions
 * - Leverages TestHelper for semantic interactions
 * - Tests core functionality without duplicating setup code
 */
test.describe('Element Pooling Integration', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        // Using standardized setup function from test-setup.ts
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        // Using standardized teardown function
        await teardownBasicTest(helper);
    });

    test('should create and manage DOM elements efficiently through pooled system', async ({ page }) => {
        // Following framework patterns: semantic helper methods instead of raw DOM manipulation

        // Set to power mode for pod generation
        await helper.setup.setMode('power');

        // Use PlayerManager to create players (triggers element pooling in ui-manager.ts)
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [8] }
        ]);

        // Use PodManager to generate pods (triggers extensive DOM creation with pooled elements)
        await helper.pods.generatePods();

        // Verify pod generation worked with pooled elements
        await helper.pods.expectPodCount(1);
        await helper.pods.expectPodHasPlayers(1, ['Alice', 'Bob', 'Charlie', 'Dave']);

        // Test element reuse by resetting and regenerating
        await helper.setup.resetWithConfirmation(true);

        // Set to power mode for pod generation
        await helper.setup.setMode('power');

        // Recreate the same scenario to test element pool reuse
        await helper.players.createPlayers([
            { name: 'Player1', power: [6] },
            { name: 'Player2', power: [7] },
            { name: 'Player3', power: [8] },
            { name: 'Player4', power: [6] }
        ]);

        await helper.pods.generatePods();
        await helper.pods.expectPodCount(1);
        await helper.pods.expectPodHasPlayers(1, ['Player1', 'Player2', 'Player3', 'Player4']);

        // Test display mode with pooled elements (uses display-mode.ts pooling)
        await helper.displayMode.enterDisplayMode();
        await helper.displayMode.expectDisplayModeActive();
        await expect(helper.displayMode.getDisplayPods()).toHaveCount(1);

        await helper.displayMode.exitDisplayMode();
        await helper.displayMode.expectDisplayModeInactive();
    });

    test('should handle UI state changes efficiently with pooled elements', async ({ page }) => {
        // Test multiple cycles of creation/destruction to verify pooling efficiency
        for (let cycle = 1; cycle <= 3; cycle++) {
            // Set to power mode for pod generation
            await helper.setup.setMode('power');

            // Create players (uses pooled elements)
            await helper.players.createPlayers([
                { name: `Cycle${cycle}Player1`, power: [7] },
                { name: `Cycle${cycle}Player2`, power: [8] },
                { name: `Cycle${cycle}Player3`, power: [7] },
                { name: `Cycle${cycle}Player4`, power: [8] }
            ]);

            // Generate pods (extensive DOM manipulation with pooled elements)
            await helper.pods.generatePods();
            await helper.pods.expectPodCount(1);

            // Reset for next cycle (clears DOM, returns elements to pool)
            await helper.setup.resetWithConfirmation(true);
        }

        // Set to power mode for final verification
        await helper.setup.setMode('power');

        // Final verification that pooling still works after multiple cycles
        await helper.players.createPlayers([
            { name: 'FinalPlayer1', power: [7] },
            { name: 'FinalPlayer2', power: [8] },
            { name: 'FinalPlayer3', power: [7] },
            { name: 'FinalPlayer4', power: [8] }
        ]);

        await helper.pods.generatePods();
        await helper.pods.expectPodCount(1);

        // Verify the content is correct using framework helpers
        await helper.pods.expectPodHasPlayers(1, ['FinalPlayer1', 'FinalPlayer2', 'FinalPlayer3', 'FinalPlayer4']);
    });
});
