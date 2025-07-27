import { test, expect } from '@playwright/test';

test.describe('Debug Group ID Management', () => {
    test('debug simple group ID reuse scenario', async ({ page }) => {
        // Capture console logs
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            if (msg.text().includes('DEBUG:')) {
                consoleLogs.push(msg.text());
            }
        });

        await page.goto('http://localhost:8080/index.html');

        // Add 3 players with power levels
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
        await page.click('.player-row:nth-child(1) .power-selector-btn');
        await page.check('.player-row:nth-child(1) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(1) .power-selector-btn'); // Close dropdown

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
        await page.click('.player-row:nth-child(2) .power-selector-btn');
        await page.check('.player-row:nth-child(2) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(2) .power-selector-btn'); // Close dropdown

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(3) .player-name', 'Player 3');
        await page.click('.player-row:nth-child(3) .power-selector-btn');
        await page.check('.player-row:nth-child(3) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(3) .power-selector-btn'); // Close dropdown

        // Create groups 1, 2, 3
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        console.log('Console logs after group 1:');
        consoleLogs.forEach(log => console.log(log));
        consoleLogs.length = 0; // Clear logs

        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        console.log('Console logs after group 2:');
        consoleLogs.forEach(log => console.log(log));
        consoleLogs.length = 0; // Clear logs

        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        console.log('Console logs after group 3:');
        consoleLogs.forEach(log => console.log(log));
        consoleLogs.length = 0; // Clear logs

        // Verify initial groups
        let groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        console.log('Initial groups:', groupOptions);

        // Remove group 2 by setting player 2 to "No Group"
        await page.selectOption('.player-row:nth-child(2) .group-select', 'no-group');

        // Add a new player and create a new group (should reuse group 2)
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await page.click('.player-row:nth-child(4) .power-selector-btn');
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn'); // Close dropdown

        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        console.log('Console logs after creating new group:');
        consoleLogs.forEach(log => console.log(log));

        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        console.log('Final groups:', groupOptions);

        expect(groupOptions).toContain('Group 2'); // Should be recreated
    });
});
