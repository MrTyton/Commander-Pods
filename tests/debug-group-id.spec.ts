import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Debug Group ID Management', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('debug simple group ID reuse scenario', async ({ page }) => {
        // Add 3 players with power levels using helper
        await helper.players.createPlayers([
            { name: 'Player 1', power: [6] },
            { name: 'Player 2', power: [6] },
            { name: 'Player 3', power: [6] }
        ]);

        // Create groups 1, 2, 3
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');

        // Verify initial groups
        let groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        // Remove group 2 by setting player 2 to "No Group"
        await page.selectOption('.player-row:nth-child(2) .group-select', 'no-group');

        // Add a new player and create a new group (should reuse group 2)
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await page.click('.player-row:nth-child(4) .power-selector-btn');
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn'); // Close dropdown

        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');

        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        expect(groupOptions).toContain('Group 2'); // Should be recreated
    });
});
