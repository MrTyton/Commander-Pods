import { test, expect } from '@playwright/test';
import { setPowerLevels, expectPlayerValidation } from './test-helpers';

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
        await page.click('#generate-pods-btn');
        await expectPlayerValidation(page, 1, true);
    });

    test('should clear validation error after correction', async ({ page }) => {
        await page.click('#generate-pods-btn');
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
        await page.click('#generate-pods-btn');

        await expect(page.locator('.player-row:nth-child(1) .player-name')).toHaveClass(/name-duplicate-error-1/);
        await expect(page.locator('.player-row:nth-child(2) .player-name')).toHaveClass(/name-duplicate-error-1/);
    });
});
