import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Display Mode Styling', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should have centered, adaptive player names in display mode', async ({ page }) => {
        // Add 4 players with power levels using helper
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Enter display mode
        await helper.displayMode.enterDisplayMode();

        // Check that we entered display mode
        await expect(page.locator('.display-mode-container')).toBeVisible();

        // Verify player items have the new styling
        const firstPlayerItem = page.locator('.display-mode-container li').first();

        // Check text alignment
        await expect(firstPlayerItem).toHaveCSS('text-align', 'center');

        // Check that width is dynamically calculated based on content (should be much smaller than 80% now due to improvements)
        const playerItemWidth = await firstPlayerItem.evaluate(el => el.getBoundingClientRect().width);
        const containerWidth = await page.locator('.display-mode-container ul').first().evaluate(el => el.getBoundingClientRect().width);
        const widthRatio = playerItemWidth / containerWidth;
        // With the display mode improvements, width should be much more efficient (around 30-40% for short names like "Alice")
        expect(widthRatio).toBeLessThan(0.5); // Should be less than 50% now due to dynamic sizing
        expect(widthRatio).toBeGreaterThan(0.2); // But still reasonable minimum

        // Check that font-size uses clamp (should be larger than 1rem)
        const fontSize = await firstPlayerItem.evaluate(el => getComputedStyle(el).fontSize);
        const fontSizeValue = parseFloat(fontSize);
        expect(fontSizeValue).toBeGreaterThanOrEqual(16); // 1rem = 16px typically

        // Check background color for better visibility (updated value)
        await expect(firstPlayerItem).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.12)');

        // Check border radius is now larger (12px instead of 8px based on our updates)
        await expect(firstPlayerItem).toHaveCSS('border-radius', '12px');

        // Check that player items now have flex display for better centering
        await expect(firstPlayerItem).toHaveCSS('display', 'flex');
        await expect(firstPlayerItem).toHaveCSS('align-items', 'center');
        await expect(firstPlayerItem).toHaveCSS('justify-content', 'center');

        // Check that player items have dynamic minimum height (80px from our CSS)
        const minHeight = await firstPlayerItem.evaluate(el => getComputedStyle(el).minHeight);
        const minHeightValue = parseFloat(minHeight);
        expect(minHeightValue).toBeGreaterThanOrEqual(70); // Should be at least 70px (allowing some variance)

        // Verify the ul container uses grid display and gap
        const playersList = page.locator('.display-mode-container ul').first();
        await expect(playersList).toHaveCSS('display', 'grid');
        await expect(playersList).toHaveCSS('gap', '12px');

        // Exit display mode to clean up
        await page.click('#exit-display-btn');
        await expect(page.locator('.display-mode-container')).not.toBeVisible();
    });
});
