import { test, expect } from '@playwright/test';
import { createPlayers, setGroup } from './test-helpers';

test.describe('Group Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
        await createPlayers(page, [
            { name: 'Player 1', power: [6] },
            { name: 'Player 2', power: [6] },
            { name: 'Player 3', power: [6] },
            { name: 'Player 4', power: [6] },
        ]);
    });

    test('should reuse group IDs when groups are removed', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 3, { new: true });
        const groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 2');
        expect(groupOptions).not.toContain('Group 3');
    });

    test('should not reassign players who moved from their created group to another group', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 3, { new: true });
        const player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player2Group).toBe('group-1');
    });

    test('group dropdown should change color when group is selected', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const className = await firstGroupSelect.getAttribute('class');
        expect(className).toMatch(/group-\d+/);
    });

    test('multiple players in same group should have same color', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        const firstGroupValue = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        await setGroup(page, 2, firstGroupValue);
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');
        const firstClassName = await firstGroupSelect.getAttribute('class');
        const secondClassName = await secondGroupSelect.getAttribute('class');
        expect(firstClassName).toBe(secondClassName);
    });

    test('different groups should have different colors', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');
        const firstClassName = await firstGroupSelect.getAttribute('class');
        const secondClassName = await secondGroupSelect.getAttribute('class');
        expect(firstClassName).not.toBe(secondClassName);
    });

    test('removing group selection should remove color', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        const groupSelect = page.locator('.player-row:nth-child(1) .group-select');
        await expect(groupSelect).toHaveClass(/group-\d+/);
        await setGroup(page, 1, 'no-group');
        await expect(groupSelect).not.toHaveClass(/group-\d+/);
    });

    test('group options should be properly updated when groups change', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        let secondPlayerOptions = page.locator('.player-row:nth-child(2) .group-select option');
        await expect(secondPlayerOptions).toContainText(['No Group', 'Start a New Group', 'Group 1']);
        await setGroup(page, 2, { new: true });
        const thirdPlayerOptions = page.locator('.player-row:nth-child(3) .group-select option');
        await expect(thirdPlayerOptions).toContainText(['No Group', 'Start a New Group', 'Group 1', 'Group 2']);
    });

    test('group colors should persist through dropdown updates', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 3, { new: true });
        await page.click('#add-player-btn');
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');
        const thirdGroupSelect = page.locator('.player-row:nth-child(3) .group-select');
        const firstGroupClass = await firstGroupSelect.getAttribute('class');
        const secondGroupClass = await secondGroupSelect.getAttribute('class');
        const thirdGroupClass = await thirdGroupSelect.getAttribute('class');
        expect(firstGroupClass).toEqual(secondGroupClass);
        expect(firstGroupClass).not.toEqual(thirdGroupClass);
    });

    test('up to 50 different group colors should be supported with random assignment', async ({ page }) => {
        const assignedColors = new Set<string>();
        for (let i = 1; i <= 4; i++) {
            await setGroup(page, i, { new: true });
            const groupSelect = page.locator(`.player-row:nth-child(${i}) .group-select`);
            const className = await groupSelect.getAttribute('class') || '';
            const colorMatch = className.match(/group-(\d+)/);
            if (colorMatch) {
                assignedColors.add(colorMatch[1]);
            }
        }
        expect(assignedColors.size).toBe(4);
    });

    test('should create sequential group IDs when no gaps exist', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 3, { new: true });
        const groupOptions = await page.locator('.player-row:nth-child(4) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 3');
        await setGroup(page, 4, { new: true });
        const updatedOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(updatedOptions).toContain('Group 4');
    });

    test('should reuse lowest available group ID', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 3, { new: true });
        await setGroup(page, 4, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 3, { existing: 1 });
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
        await setGroup(page, 5, { new: true });
        let groupOptions = await page.locator('.player-row:nth-child(6) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 2');
        await setGroup(page, 6, { new: true });
        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 3');
    });

    test('should not reassign players who moved to different groups after group ID reuse', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 3, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 4, { new: true });
        const finalPlayer2Value = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(finalPlayer2Value).toBe('group-1');
    });

    test('should preserve user group assignments during group ID reuse', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 3, { new: true });
        const bobGroup = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        const carolGroup = await page.locator('.player-row:nth-child(3) .group-select').inputValue();
        expect(bobGroup).toBe('group-1');
        expect(carolGroup).toBe('group-2');
    });

    test('should NOT reassign players who manually left their created group', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 1, 'no-group');
        await setGroup(page, 2, { new: true });
        const player1Group = await page.locator('.player-row:nth-child(1) .group-select').inputValue();
        const player2Group = await page.locator('.player-row:nth-child(2) .group-select').inputValue();
        expect(player1Group).toBe('no-group');
        expect(player2Group).toBe('group-1');
    });

    test('debug simple group ID reuse scenario', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 3, { new: true });
        await setGroup(page, 2, 'no-group');
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(5) .player-name', 'Player 5');
        await setGroup(page, 5, { new: true });
        const groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 2');
    });

    test('reproduce user scenario: 1,2,3 -> move 2 to 1 -> create new', async ({ page }) => {
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { new: true });
        await setGroup(page, 3, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await setGroup(page, 4, { new: true });
        const player4GroupValue = await page.locator('.player-row:nth-child(4) .group-select').inputValue();
        expect(player4GroupValue).toBe('group-2');
    });
});
