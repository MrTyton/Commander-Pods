import { test, expect } from '@playwright/test';
import { createPlayers } from './test-helpers';

test.describe('Group Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
        // The createPlayers helper function will add 4 players by default
        await createPlayers(page, [
            { name: 'Player 1', power: [6] },
            { name: 'Player 2', power: [6] },
            { name: 'Player 3', power: [6] },
            { name: 'Player 4', power: [6] },
        ]);
    });

    test('should reuse group IDs when groups are removed', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        const groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 2');
        expect(groupOptions).not.toContain('Group 3');
    });

    test('should not reassign players who moved from their created group to another group', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        const player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Group).toBe('group-1');
    });

    test('group dropdown should change color when group is selected', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const className = await firstGroupSelect.getAttribute('class');
        expect(className).toMatch(/group-\d+/);
    });

    test('multiple players in same group should have same color', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        const firstGroupValue = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        await page.selectOption('.player-row:nth-child(2) .group-select', firstGroupValue);

        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');
        const firstClassName = await firstGroupSelect.getAttribute('class');
        const secondClassName = await secondGroupSelect.getAttribute('class');
        expect(firstClassName).toBe(secondClassName);
    });

    test('different groups should have different colors', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');
        const firstClassName = await firstGroupSelect.getAttribute('class');
        const secondClassName = await secondGroupSelect.getAttribute('class');
        expect(firstClassName).not.toBe(secondClassName);
    });

    test('removing group selection should remove color', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        const groupSelect = page.locator('.player-row:nth-child(1) .group-select');
        await expect(groupSelect).toHaveClass(/group-\d+/);
        await page.selectOption('.player-row:nth-child(1) .group-select', 'no-group');
        await expect(groupSelect).not.toHaveClass(/group-\d+/);
    });

    test('group options should be properly updated when groups change', async ({ page }) => {
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        let secondPlayerOptions = page.locator('.player-row:nth-child(2) .group-select option');
        await expect(secondPlayerOptions).toContainText(['No Group', 'Start a New Group', 'Group 1']);
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        const thirdPlayerOptions = page.locator('.player-row:nth-child(3) .group-select option');
        await expect(thirdPlayerOptions).toContainText(['No Group', 'Start a New Group', 'Group 1', 'Group 2']);
    });
});
