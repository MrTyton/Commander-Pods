import { test, expect } from '@playwright/test';

test.describe('Manual Debug Test', () => {
    test('manual debug test with console capture', async ({ page }) => {
        const consoleLogs: string[] = [];

        page.on('console', msg => {
            if (msg.text().includes('DEBUG')) {
                consoleLogs.push(msg.text());
            }
        });

        await page.goto('http://localhost:8080/index.html');

        // Add 3 players and create groups
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
        await page.click('.player-row:nth-child(1) .power-selector-btn');
        await page.check('.player-row:nth-child(1) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(1) .power-selector-btn');

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
        await page.click('.player-row:nth-child(2) .power-selector-btn');
        await page.check('.player-row:nth-child(2) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(2) .power-selector-btn');

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(3) .player-name', 'Player 3');
        await page.click('.player-row:nth-child(3) .power-selector-btn');
        await page.check('.player-row:nth-child(3) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(3) .power-selector-btn');

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
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn');

        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        await page.waitForTimeout(200);

        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();

        // The test doesn't need to pass, we just want to see the debug output
    });
});
