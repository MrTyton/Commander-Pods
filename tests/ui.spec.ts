import { test, expect } from '@playwright/test';
import { createPlayers } from './test-helpers';

test.describe('UI Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
    });

    test('should load the page with correct title and initial elements', async ({ page }) => {
        await expect(page).toHaveTitle('MTG Commander Pod Generator');
        await expect(page.locator('h1')).toHaveText('MTG Commander Pod Generator');
        const playerRows = page.locator('.player-row');
        await expect(playerRows).toHaveCount(4);
        await expect(page.locator('#add-player-btn')).toBeVisible();
        await expect(page.locator('#generate-pods-btn')).toBeVisible();
        await expect(page.locator('#reset-all-btn')).toBeVisible();
        await expect(page.locator('#no-leniency-radio')).toBeVisible();
        await expect(page.locator('#leniency-radio')).toBeVisible();
        await expect(page.locator('#super-leniency-radio')).toBeVisible();
    });

    test('should add and remove player rows', async ({ page }) => {
        let playerRows = page.locator('.player-row');
        await expect(playerRows).toHaveCount(4);
        await page.click('#add-player-btn');
        await expect(playerRows).toHaveCount(5);
        await page.locator('.remove-player-btn').first().click();
        await expect(playerRows).toHaveCount(4);
    });

    test('should reset all data when reset button is clicked', async ({ page }) => {
        await createPlayers(page, [{ name: 'TestPlayer', power: [5] }]);
        await page.check('#leniency-radio');
        await page.click('#generate-pods-btn');
        await page.click('#reset-all-btn');
        await expect(page.locator('.player-name').first()).toHaveValue('');
        await expect(page.locator('.power-selector-btn').first()).toContainText('Select Power Levels');
        await expect(page.locator('#no-leniency-radio')).toBeChecked();
        await expect(page.locator('#output-section')).toBeEmpty();
        await expect(page.locator('.player-row')).toHaveCount(4);
    });

    test('should display and interact with help modal correctly', async ({ page }) => {
        const helpButton = await page.locator('#help-btn');
        await expect(helpButton).toBeVisible();
        const helpModal = await page.locator('#help-modal');
        await expect(helpModal).not.toBeVisible();
        await helpButton.click();
        await expect(helpModal).toBeVisible();
        const closeButton = await page.locator('.help-close');
        await closeButton.click();
        await expect(helpModal).not.toBeVisible();
    });
});
