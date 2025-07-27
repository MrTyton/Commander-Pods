import { test, expect } from '@playwright/test';
import { setPowerLevels, expectPlayerValidation, generatePods, setBracketLevels } from './test-helpers';

test.describe('Input Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
    });

    test('should validate empty name field on interaction', async ({ page }) => {
        const nameInput = page.locator('.player-row:nth-child(1) .player-name');
        await nameInput.click();
        await nameInput.fill('Test');
        await nameInput.fill('');
        await expect(nameInput).toHaveClass(/input-error/);
        await nameInput.fill('Test Player');
        await expect(nameInput).not.toHaveClass(/input-error/);
    });

    test('should trigger validation on pod generation', async ({ page }) => {
        await generatePods(page);
        await expectPlayerValidation(page, 1, true);
    });

    test('should clear validation error after correction', async ({ page }) => {
        await generatePods(page);
        await expectPlayerValidation(page, 1, true);
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
        await setPowerLevels(page, 1, [7]);
        await expectPlayerValidation(page, 1, false);
    });

    test('should detect and highlight duplicate player names', async ({ page }) => {
        await page.fill('.player-row:nth-child(1) .player-name', 'Alice');
        await page.fill('.player-row:nth-child(2) .player-name', 'Alice');
        await setPowerLevels(page, 1, [7]);
        await setPowerLevels(page, 2, [7]);

        page.on('dialog', dialog => dialog.accept());
        await generatePods(page);

        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveClass(/name-duplicate-error-1/);
        await expect(page.locator('.player-row:nth-child(2) .player-name')).toHaveClass(/name-duplicate-error-1/);
    });

    test('Basic validation behavior - name field only', async ({ page }) => {
        const nameInput = page.locator('.player-row:nth-child(1) .player-name');
        await expect(nameInput).not.toHaveClass(/input-error/);
        await nameInput.click();
        await nameInput.fill('Test');
        await nameInput.fill('');
        await expect(nameInput).toHaveClass(/input-error/);
        await nameInput.fill('Test Player');
        await expect(nameInput).not.toHaveClass(/input-error/);
    });

    test('Bracket mode validation behavior', async ({ page }) => {
        await page.click('#bracket-radio');
        const nameInput = page.locator('.player-row:nth-child(1) .player-name');
        const bracketBtn = page.locator('.player-row:nth-child(1) .bracket-selector-btn');
        await nameInput.fill('Player 1');
        await expect(bracketBtn).not.toHaveClass(/error/);
        await generatePods(page);
        await expect(bracketBtn).toHaveClass(/error/);
        await setBracketLevels(page, 1, [3]);
        await expect(bracketBtn).not.toHaveClass(/error/);
    });

    test('Multiple players validation flow', async ({ page }) => {
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');
        await setPowerLevels(page, 1, [7]);
        const secondRowName = page.locator('.player-row:nth-child(2) .player-name');
        const secondRowPower = page.locator('.player-row:nth-child(2) .power-selector-btn');
        await expect(secondRowName).not.toHaveClass(/input-error/);
        await expect(secondRowPower).not.toHaveClass(/error/);
        await generatePods(page);
        await expect(secondRowName).toHaveClass(/input-error/);
        await expect(secondRowPower).toHaveClass(/error/);
        await page.fill('.player-row:nth-child(2) .player-name', 'Player 2');
        await expect(secondRowName).not.toHaveClass(/input-error/);
        await setPowerLevels(page, 2, [6]);
        await expect(secondRowPower).not.toHaveClass(/error/);
    });
});
