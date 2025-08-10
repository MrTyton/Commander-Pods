import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

let helper: TestHelper;

test.describe('Display Mode Button Functionality', () => {
    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should show both top and bottom display mode buttons after generating pods', async ({ page }) => {
        // Add 4 players with power levels using the framework
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ]);

        // Check that both display mode buttons are hidden initially
        const topDisplayBtn = page.locator('#display-mode-btn');
        const bottomDisplayBtn = page.locator('#display-mode-btn-bottom');

        await expect(topDisplayBtn).toHaveCSS('display', 'none');
        await expect(bottomDisplayBtn).toHaveCount(0); // Bottom button doesn't exist until pods are generated

        // Generate pods
        await helper.pods.generatePods();

        // Check that both display mode buttons are now visible
        await expect(topDisplayBtn).toHaveCSS('display', 'inline-block');
        await expect(bottomDisplayBtn).toBeVisible();

        // Verify both buttons have the correct text
        await expect(topDisplayBtn).toHaveText('Display Mode');
        await expect(bottomDisplayBtn).toHaveText('Display Mode');

        // Verify bottom button is positioned before help section
        const helpBtn = page.locator('#help-btn');
        await expect(helpBtn).toBeVisible();

        // Check that bottom button comes before help button in DOM order
        const bottomBtnBox = await bottomDisplayBtn.boundingBox();
        const helpBtnBox = await helpBtn.boundingBox();
        expect(bottomBtnBox!.y).toBeLessThan(helpBtnBox!.y);
    });

    test('should allow entering display mode from both top and bottom buttons', async ({ page }) => {
        // Add 4 players and generate pods using the framework
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ]);

        await helper.pods.generatePods();

        // Test top button functionality
        await helper.displayMode.enterDisplayMode();

        // Check that we entered display mode
        await helper.displayMode.expectDisplayModeActive();
        await expect(page.locator('#exit-display-btn')).toBeVisible();

        // Exit display mode
        await helper.displayMode.exitDisplayMode();
        await helper.displayMode.expectDisplayModeInactive();

        // Test bottom button functionality
        await page.click('#display-mode-btn-bottom');

        // Check that we entered display mode again
        await expect(page.locator('.display-mode-container')).toBeVisible();
        await expect(page.locator('#exit-display-btn')).toBeVisible();

        // Exit display mode
        await page.click('#exit-display-btn');
        await expect(page.locator('.display-mode-container')).not.toBeVisible();
    });

    test('should remove bottom button when pods are cleared', async ({ page }) => {
        // Add 4 players and generate pods using the framework
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ]);

        await helper.pods.generatePods();

        // Verify both buttons exist
        await expect(page.locator('#display-mode-btn')).toHaveCSS('display', 'inline-block');
        await expect(page.locator('#display-mode-btn-bottom')).toBeVisible();

        // Reset all (this should clear the pods and bottom button)
        await helper.setup.reset();

        // Check that output section is cleared (pods are gone)
        await expect(page.locator('#output-section')).toBeEmpty();

        // Check that top button is hidden after reset
        await expect(page.locator('#display-mode-btn')).toHaveCSS('display', 'none');

        // And check that bottom button is removed
        await expect(page.locator('#display-mode-btn-bottom')).toHaveCount(0);
    });
});
