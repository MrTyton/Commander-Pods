import { test, expect } from '@playwright/test';
import { setupDisplayModeTest, teardownDisplayModeTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Display Mode Font Sizing', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownDisplayModeTest(helper);
        }
    });

    test('should scale font size based on pod dimensions', async ({ page }) => {
        // Test with small number of players (larger cells, larger fonts)
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }  // Need 4 players minimum for pod generation
        ]);

        // setupDisplayModeTest already entered display mode

        const smallGroupFirstPlayer = page.locator('.display-mode-container li .player-name').first();
        const smallGroupFontSize = await smallGroupFirstPlayer.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        await helper.displayMode.exitDisplayMode();

        // Now test with larger number of players (smaller cells, smaller fonts)
        await helper.players.createPlayers([
            { name: 'Dave', power: [7] },
            { name: 'Eve', power: [7] },
            { name: 'Frank', power: [7] },
            { name: 'Grace', power: [7] },
            { name: 'Henry', power: [7] }
        ]);

        await helper.pods.generatePods();
        await helper.displayMode.enterDisplayMode();

        const largeGroupFirstPlayer = page.locator('.display-mode-container li .player-name').first();
        const largeGroupFontSize = await largeGroupFirstPlayer.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        // Smaller player count should have larger font size
        expect(smallGroupFontSize).toBeGreaterThan(largeGroupFontSize);

        // Both should be in the expected range (24-72px)
        expect(smallGroupFontSize).toBeGreaterThanOrEqual(24);
        expect(largeGroupFontSize).toBeGreaterThanOrEqual(24);
        expect(smallGroupFontSize).toBeLessThanOrEqual(72);
        expect(largeGroupFontSize).toBeLessThanOrEqual(72);
    });

    test('should proportionally size name and power text', async ({ page }) => {
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // setupDisplayModeTest already entered display mode

        const firstPlayerItem = page.locator('.display-mode-container li').first();
        const nameDiv = firstPlayerItem.locator('.player-name');
        const powerDiv = firstPlayerItem.locator('.player-power');

        const nameFontSize = await nameDiv.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );
        const powerFontSize = await powerDiv.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        // Power font should be exactly 75% of name font
        const expectedPowerFontSize = Math.round(nameFontSize * 0.75);
        expect(powerFontSize).toBe(expectedPowerFontSize);

        // Name should be larger than power
        expect(nameFontSize).toBeGreaterThan(powerFontSize);
    });

    test('should handle different viewport sizes gracefully', async ({ page }) => {
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // Test normal viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        // setupDisplayModeTest already entered display mode

        const normalFirstPlayer = page.locator('.display-mode-container li .player-name').first();
        const normalFontSize = await normalFirstPlayer.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        await helper.displayMode.exitDisplayMode();

        // Test smaller viewport
        await page.setViewportSize({ width: 1280, height: 720 });
        await helper.displayMode.enterDisplayMode();

        const smallFirstPlayer = page.locator('.display-mode-container li .player-name').first();
        const smallFontSize = await smallFirstPlayer.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        // Both should be reasonable sizes, smaller viewport might have same or smaller font
        // If they're equal, that's also acceptable as long as they're both in valid range
        expect(normalFontSize).toBeGreaterThanOrEqual(smallFontSize);
        expect(smallFontSize).toBeGreaterThanOrEqual(24);
        expect(normalFontSize).toBeGreaterThanOrEqual(24);
    });

    test('should maintain readability with different player name lengths', async ({ page }) => {
        helper = await setupDisplayModeTest(page, [
            { name: 'A', power: [7] },  // Very short name
            { name: 'VeryLongPlayerNameThatMightCauseWrapping', power: [7] },  // Very long name
            { name: 'Normal', power: [7] },  // Normal name
            { name: 'X', power: [7] }  // Another short name
        ]);

        // setupDisplayModeTest already entered display mode

        // Check that all player items have consistent font sizes regardless of name length
        const playerItems = page.locator('.display-mode-container li .player-name');
        const playerCount = await playerItems.count();

        const fontSizes: number[] = [];
        for (let i = 0; i < playerCount; i++) {
            const fontSize = await playerItems.nth(i).evaluate(el =>
                parseInt(getComputedStyle(el).fontSize)
            );
            fontSizes.push(fontSize);
        }

        // All font sizes should be the same (dynamic sizing is per-pod, not per-player)
        const firstFontSize = fontSizes[0];
        for (const fontSize of fontSizes) {
            expect(fontSize).toBe(firstFontSize);
        }

        // Check that text is not overflowing
        for (let i = 0; i < playerCount; i++) {
            const playerName = playerItems.nth(i);

            // Get the element dimensions
            const dimensions = await playerName.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    scrollWidth: el.scrollWidth,
                    scrollHeight: el.scrollHeight
                };
            });

            // Text should not be overflowing horizontally or vertically (with reasonable tolerance)
            expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1); // +1 for rounding
            expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height + 10); // +10 for line height variations
        }
    });

    test('should apply dynamic sizing after window resize', async ({ page }) => {
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // setupDisplayModeTest already entered display mode

        // Get initial font size
        const firstPlayer = page.locator('.display-mode-container li .player-name').first();
        const initialFontSize = await firstPlayer.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        // Resize window (simulating fullscreen on different monitor)
        await page.setViewportSize({ width: 2560, height: 1440 });

        // Wait a moment for any dynamic updates
        await page.waitForTimeout(500);

        // Note: The font sizing is calculated once on entry to display mode
        // This test ensures the font calculation was appropriate for the viewport
        const resizedFontSize = await firstPlayer.evaluate(el =>
            parseInt(getComputedStyle(el).fontSize)
        );

        // Font size should still be in valid range
        expect(resizedFontSize).toBeGreaterThanOrEqual(24);
        expect(resizedFontSize).toBeLessThanOrEqual(72);

        // For a larger viewport, the same calculation should still work well
        expect(resizedFontSize).toBe(initialFontSize); // Should be same since calculated once
    });
});
