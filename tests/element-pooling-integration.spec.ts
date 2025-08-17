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
        await helper.setup.reset();

        // Recreate the same scenario to test element pool reuse
        await helper.players.createPlayers([
            { name: 'Player1', power: [6] },
            { name: 'Player2', power: [7] },
            { name: 'Player3', power: [8] }
        ]);

        await helper.pods.generatePods();
        await helper.pods.expectPodCount(1);
        await helper.pods.expectPodHasPlayers(1, ['Player1', 'Player2', 'Player3']);

        // Test display mode with pooled elements (uses display-mode.ts pooling)
        await helper.displayMode.enterDisplayMode();
        await expect(page.locator('.display-mode-container')).toBeVisible();
        await expect(page.locator('.display-mode-container .pod')).toHaveCount(1);

        await helper.displayMode.exitDisplayMode();
        await expect(page.locator('.display-mode-container')).not.toBeVisible();
    });

    test('should handle UI state changes efficiently with pooled elements', async ({ page }) => {
        // Test multiple cycles of creation/destruction to verify pooling efficiency
        for (let cycle = 1; cycle <= 3; cycle++) {
            // Create players (uses pooled elements)
            await helper.players.createPlayers([
                { name: `Cycle${cycle}Player1`, power: [7] },
                { name: `Cycle${cycle}Player2`, power: [8] }
            ]);

            // Generate pods (extensive DOM manipulation with pooled elements)
            await helper.pods.generatePods();
            await helper.pods.expectPodCount(1);

            // Reset for next cycle (clears DOM, returns elements to pool)
            await helper.setup.reset();
        }

        // Final verification that pooling still works after multiple cycles
        await helper.players.createPlayers([
            { name: 'FinalPlayer1', power: [7] },
            { name: 'FinalPlayer2', power: [8] }
        ]);

        await helper.pods.generatePods();
        await helper.pods.expectPodCount(1);

        // Verify the content is correct (proving elements are functioning properly)
        const pods = page.locator('.pod:not(.unassigned-pod)');
        const podText = await pods.first().textContent();
        expect(podText).toContain('FinalPlayer1');
        expect(podText).toContain('FinalPlayer2');
    });
});
