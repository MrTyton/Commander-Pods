import { test, expect } from '@playwright/test';

test.describe('Exact User Scenario Debug', () => {
    test('reproduce user scenario: 1,2,3 -> move 2 to 1 -> create new', async ({ page }) => {

        await page.goto('http://localhost:8080/index.html');

        // Add 3 players
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
