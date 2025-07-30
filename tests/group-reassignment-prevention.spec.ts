import { test, expect } from '@playwright/test';

test.describe('Group Reassignment Prevention', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080/index.html');
    });

    test('should not reassign players who moved from their created group to another group', async ({ page }) => {
        // Add 4 players
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

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(4) .player-name', 'Player 4');
        await page.click('.player-row:nth-child(4) .power-selector-btn');
        await page.check('.player-row:nth-child(4) .power-checkbox input[value="6"]');
        await page.click('.player-row:nth-child(4) .power-selector-btn');

        // Create groups 1, 2, 3
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group'); // Player 1 creates Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group'); // Player 2 creates Group 2
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group'); // Player 3 creates Group 3

        // Verify initial state
        let player1Group = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        let player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        let player3Group = await page.locator('.player-row:nth-child(3) .group-select').inputValue();

        expect(player1Group).toBe('group-1');
        expect(player2Group).toBe('group-2');
        expect(player3Group).toBe('group-3');

        // Move Player 2 from Group 2 to Group 1 (Player 2 abandons the group they created)
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.waitForTimeout(100);

        // Verify Player 2 moved to Group 1
        player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Group).toBe('group-1');

        // Player 4 creates a new group (should reuse Group 2 since it's now empty)
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');
        await page.waitForTimeout(100);

        // Verify Player 4 got assigned to Group 2 (reused the empty group)
        const player4Group = await page.locator('.player-row:nth-child(4) .group-select').inputValue();
        expect(player4Group).toBe('group-2');

        // CRITICAL: Player 2 should remain in Group 1, NOT be reassigned back to Group 2
        player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Group).toBe('group-1');

        // Verify all final assignments
        player1Group = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        player3Group = await page.locator('.player-row:nth-child(3) .group-select').inputValue();

        expect(player1Group).toBe('group-1'); // Player 1 still in Group 1
        expect(player2Group).toBe('group-1'); // Player 2 still in Group 1 (moved here deliberately)
        expect(player3Group).toBe('group-3'); // Player 3 still in Group 3
        expect(player4Group).toBe('group-2'); // Player 4 in reused Group 2

        // Verify group options show correct groups
        const groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).toContain('Group 2');
        expect(groupOptions).toContain('Group 3');
        expect(groupOptions).not.toContain('Group 4'); // Should not have created Group 4
    });

    test('should preserve user group assignments during group ID reuse', async ({ page }) => {
        // Add 3 players
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await page.click('.player-row:nth-child(1) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(1) .power-checkbox input[value="5"]', { state: 'visible' });
        await page.check('.player-row:nth-child(1) .power-checkbox input[value="5"]');
        await page.click('.player-row:nth-child(1) .power-selector-btn');

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(2) .player-name', 'Bob');
        await page.click('.player-row:nth-child(2) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(2) .power-checkbox input[value="5"]', { state: 'visible' });
        await page.check('.player-row:nth-child(2) .power-checkbox input[value="5"]');
        await page.click('.player-row:nth-child(2) .power-selector-btn');

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(3) .player-name', 'Carol');
        await page.click('.player-row:nth-child(3) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(3) .power-checkbox input[value="5"]', { state: 'visible' });
        await page.check('.player-row:nth-child(3) .power-checkbox input[value="5"]');
        await page.click('.player-row:nth-child(3) .power-selector-btn');

        // Create Group 1 and Group 2
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group'); // Alice creates Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group'); // Bob creates Group 2

        // Bob leaves Group 2 and joins Alice in Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Carol creates a new group, which should reuse Group 2
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');

        // Verify final state: Bob should stay in Group 1, not get reassigned to Group 2
        const aliceGroup = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        const bobGroup = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        const carolGroup = await page.locator('.player-row:nth-child(3) .group-select').inputValue();

        expect(aliceGroup).toBe('group-1');
        expect(bobGroup).toBe('group-1'); // Bob should remain in Group 1
        expect(carolGroup).toBe('group-2'); // Carol should get the reused Group 2
    });

    test('should NOT reassign players who manually left their created group', async ({ page }) => {
        // Add 2 players
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
        await page.click('.player-row:nth-child(1) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(1) .power-checkbox input[value="7"]', { state: 'visible' });
        await page.check('.player-row:nth-child(1) .power-checkbox input[value="7"]');
        await page.click('.player-row:nth-child(1) .power-selector-btn');

        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
        await page.click('.player-row:nth-child(2) .power-selector-btn');
        await page.waitForSelector('.player-row:nth-child(2) .power-checkbox input[value="7"]', { state: 'visible' });
        await page.check('.player-row:nth-child(2) .power-checkbox input[value="7"]');
        await page.click('.player-row:nth-child(2) .power-selector-btn');

        // Player 1 creates Group 1
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Player 1 leaves their group (sets to "No Group")
        await page.selectOption('.player-row:nth-child(1) .group-select', 'no-group');

        // Player 2 creates a new group (should reuse Group 1)
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        // Now Player 1 should NOT be reassigned since they actively chose to leave their group
        const player1Group = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        const player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();

        expect(player1Group).toBe('no-group'); // Should NOT be reassigned - they chose to leave
        expect(player2Group).toBe('group-1'); // Should be in Group 1 (reused ID)
    });
});
