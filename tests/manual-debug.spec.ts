import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Manual Debug Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('manual debug test with console capture', async ({ page }) => {
        // Add 3 players and create groups using helper
        await helper.players.createPlayers([
            { name: 'Player 1', power: [6] },
            { name: 'Player 2', power: [6] },
            { name: 'Player 3', power: [6] }
        ]);

        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.waitForTimeout(200);

        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.waitForTimeout(200);

        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        await page.waitForTimeout(200);

        let groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        await page.selectOption('.player-row:nth-child(2) .group-select', 'no-group');
        await page.waitForTimeout(200);

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await page.click('.player-row:nth-child(4) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(4) .power-checkbox input[value="6"]', { state: 'visible' });
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn');

        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        await page.waitForTimeout(200);

        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        // The test doesn't need to pass, we just want to see the debug output
    });
});
