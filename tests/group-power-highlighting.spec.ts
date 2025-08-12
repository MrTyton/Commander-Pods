import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest, teardownDisplayModeTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Group Power Level Highlighting', () => {
    let helper: TestHelper;
    let isDisplayModeTest = false;

    test.afterEach(async () => {
        if (helper) {
            if (isDisplayModeTest) {
                await teardownDisplayModeTest(helper);
            } else {
                await teardownBasicTest(helper);
            }
        }
        isDisplayModeTest = false; // Reset for next test
    });

    test('should highlight power levels correctly when group has mixed power ranges', async ({ page }) => {
        helper = await setupBasicTest(page);

        // Create players with mixed power levels (matching the user's scenario)
        // Player 'a' has power 5 only, players 'b' have 6,7
        // Even though 'a' can't play at 7, the pod should still highlight 7 for others
        await helper.players.createPlayers([
            { name: 'a', power: [5] },
            { name: 'b', power: [6, 7] },
            { name: 'c', power: [7, 8] },
            { name: 'd', power: [7, 8] }
        ]);

        // Create a group with the first two players using the group dropdown
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.waitForTimeout(300); // Wait for group creation
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(300); // Wait for group assignment

        // Generate pods
        await helper.pods.generatePods();

        // Check the pod to see power level highlighting
        const podElement = await helper.page.locator('.pod').first();
        const podHTML = await podElement.innerHTML();

        // The key test: Power 7 should be highlighted for players that can play it
        // even if some players in a group can't play at that level
        expect(podHTML).toContain('<span class="power-highlight">7</span>');

        // Power 5 should be highlighted (it's the only option for player 'a')
        expect(podHTML).toContain('<span class="power-highlight">5</span>');

        // Verify that power 7 appears multiple times as highlighted (for multiple players)
        const highlightedSevens = (podHTML.match(/<span class="power-highlight">7<\/span>/g) || []).length;
        expect(highlightedSevens).toBeGreaterThan(1); // Should appear for multiple players
    });

    test('should work correctly in display mode for group scenarios', async ({ page }) => {
        helper = await setupBasicTest(page);
        isDisplayModeTest = true; // Signal to use display mode teardown

        // Create the same scenario as above
        await helper.players.createPlayers([
            { name: 'a', power: [5] },
            { name: 'b', power: [6, 7] },
            { name: 'c', power: [7, 8] },
            { name: 'd', power: [7, 8] }
        ]);

        // Create a group with the first two players using the group dropdown
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.waitForTimeout(300); // Wait for group creation
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(300); // Wait for group assignment

        // Generate pods
        await helper.pods.generatePods();

        // Enter display mode
        await helper.displayMode.waitForDisplayModeButton();
        await helper.displayMode.enterDisplayMode();

        // Check highlighting in display mode
        const displayContainer = page.locator('.display-mode-container');

        // Find all power displays
        const powerDisplays = await displayContainer.locator('.player-power').all();

        for (const powerDisplay of powerDisplays) {
            const powerHTML = await powerDisplay.innerHTML();

            // Power 7 should be highlighted for players that can play it
            if (powerHTML.includes('7')) {
                expect(powerHTML).toContain('<span class="power-highlight">7</span>');
            }

            // Power 5 should be highlighted (it's the only option for player 'a')
            if (powerHTML.includes('5')) {
                expect(powerHTML).toContain('<span class="power-highlight">5</span>');
            }
        }

        // Note: Display mode exit is now handled by teardownDisplayModeTest()
    });
});
