import { test, expect } from '@playwright/test';

test.describe('Group Reassignment Bug Fix', () => {
    test('should not reassign players who moved to different groups', async ({ page }) => {
        await page.goto('file:///c:/Users/Joshua/Documents/GitHub/Commander%20Pairings/index.html');

        // Add 4 players
        for (let i = 1; i <= 4; i++) {
            await page.click('#add-player-btn');
            await page.fill(`.player-row:nth-child(${i}) .player-name`, `Player ${i}`);
            await page.click(`.player-row:nth-child(${i}) .power-selector-btn`);
            await page.check(`.player-row:nth-child(${i}) .power-checkbox input[value="6"]`);
            await page.click(`.player-row:nth-child(${i}) .power-selector-btn`);
        }

        // Create groups 1, 2, 3
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group'); // Player 1 creates Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group'); // Player 2 creates Group 2
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group'); // Player 3 creates Group 3

        // Verify initial state
        let player2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Value).toBe('group-2');

        // Move Player 2 from Group 2 to Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        
        // Verify Player 2 is now in Group 1
        player2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Value).toBe('group-1');

        // Create a new group with Player 4 (should reuse Group 2)
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');

        // Verify Player 4 is in Group 2
        const player4Value = await page.locator('.player-row:nth-child(4) .group-select').inputValue();
        expect(player4Value).toBe('group-2');

        // CRITICAL: Verify Player 2 is STILL in Group 1 (not reassigned back to Group 2)
        const finalPlayer2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(finalPlayer2Value).toBe('group-1');
        
        // Verify final group assignments
        const player1Value = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        const player3Value = await page.locator('.player-row:nth-child(3) .group-select').inputValue();
        
        expect(player1Value).toBe('group-1'); // Player 1 in Group 1
        expect(finalPlayer2Value).toBe('group-1'); // Player 2 moved to Group 1 and stayed there
        expect(player3Value).toBe('group-3'); // Player 3 in Group 3
        expect(player4Value).toBe('group-2'); // Player 4 in reused Group 2
    });
});
