import { test, expect } from '@playwright/test';
import { createPlayers, generatePods, goToDisplayMode, setGroup } from './test-helpers';

test.describe('Display Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
        await createPlayers(page, [
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] },
        ]);
        await generatePods(page);
        await goToDisplayMode(page);
    });

    test('should enter and exit display mode correctly', async ({ page }) => {
        const displayContainer = await page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();
        const originalContainer = await page.locator('.container');
        await expect(originalContainer).toHaveCSS('display', 'none');
        const exitBtn = await page.locator('#exit-display-btn');
        await exitBtn.click();
        await expect(displayContainer).not.toBeVisible();
        await expect(originalContainer).toHaveCSS('display', 'block');
    });

    test('should exit display mode with ESC key', async ({ page }) => {
        const displayContainer = await page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(displayContainer).not.toBeVisible();
    });

    test('should display pods in grid layout in display mode', async ({ page }) => {
        const podsGrid = await page.locator('#display-output > div');
        await expect(podsGrid).toHaveCSS('display', 'grid');
        const gridColumns = await podsGrid.evaluate((el) =>
            window.getComputedStyle(el).gridTemplateColumns
        );
        expect(gridColumns).not.toBe('none');
    });

    test('should assign random colors to pods in display mode', async ({ page }) => {
        await page.reload();
        await createPlayers(page, [
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] },
            { name: 'Eve', power: [7] },
            { name: 'Frank', power: [7] },
            { name: 'Grace', power: [7] },
            { name: 'Henry', power: [7] },
        ]);
        await generatePods(page);
        await goToDisplayMode(page);

        const podElements = await page.locator('#display-output > div > div').all();
        const borderColors: string[] = [];
        for (const pod of podElements) {
            const borderColor = await pod.evaluate((el) =>
                window.getComputedStyle(el).borderColor
            );
            borderColors.push(borderColor);
        }
        const uniqueColors = new Set(borderColors);
        expect(uniqueColors.size).toBe(borderColors.length);
    });

    test('should flatten groups in display mode', async ({ page }) => {
        await page.reload();
        await createPlayers(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'David', power: [7] },
        ]);
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await generatePods(page);
        await goToDisplayMode(page);

        const displayOutput = await page.locator('#display-output').textContent();
        expect(displayOutput).not.toContain('Group 1');
    });
});
