import { test, expect } from '@playwright/test';

test.describe('Exact User Scenario Debug', () => {
    test('reproduce user scenario: 1,2,3 -> move 2 to 1 -> create new', async ({ page }) => {
        const consoleLogs: string[] = [];

        page.on('console', msg => {
            if (msg.text().includes('DEBUG')) {
                consoleLogs.push(msg.text());
                console.log('CAPTURED:', msg.text());
            }
        });

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

        console.log('=== Step 1: Create Group 1 ===');
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.waitForTimeout(100);

        console.log('=== Step 2: Create Group 2 ===');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.waitForTimeout(100);

        console.log('=== Step 3: Create Group 3 ===');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        await page.waitForTimeout(100);

        let groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        console.log('After creating 1,2,3:', groupOptions);

        console.log('=== Step 4: Move Player 2 from Group 2 to Group 1 ===');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(100);

        console.log('=== Step 5: Add 4th player ===');
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await page.click('.player-row:nth-child(4) .power-selector-btn');
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn');

        console.log('=== Step 6: Create new group (should reuse Group 2, not create Group 4) ===');
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        await page.waitForTimeout(100);

        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        console.log('Final groups after new creation:', groupOptions);

        // Check what actually got created
        const player4GroupValue = await page.locator('.player-row:nth-child(4) .group-select').inputValue();
        console.log('Player 4 ended up in group:', player4GroupValue);

        expect(player4GroupValue).toBe('group-2');
        expect(groupOptions).not.toContain('Group 4');
    });
});
