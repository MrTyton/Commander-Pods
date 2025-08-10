import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Exact User Scenario Debug', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('reproduce user scenario: 1,2,3 -> move 2 to 1 -> create new', async ({ page }) => {
        // Add 3 players using helper
        await helper.players.createPlayers([
            { name: 'Player 1', power: [6] },
            { name: 'Player 2', power: [6] },
            { name: 'Player 3', power: [6] }
        ]);

        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.waitForTimeout(100);

        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.waitForTimeout(100);

        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        await page.waitForTimeout(100);

        let groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(100);

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await page.click('.player-row:nth-child(4) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(4) .power-checkbox input[value="6"]', { state: 'visible' });
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn');

        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        await page.waitForTimeout(100);

        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        // Check what actually got created
        const player4GroupValue = await page.locator('.player-row:nth-child(4) .group-select').inputValue();

        expect(player4GroupValue).toBe('group-2');
        expect(groupOptions).not.toContain('Group 4');
    });
});
