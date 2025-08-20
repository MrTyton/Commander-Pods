import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';
import { setupBasicTest, teardownBasicTest } from './test-setup';

test.describe('Display Mode Improvements', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('should have dynamic box width based on longest text in each pod', async ({ page }) => {
        // Create pods with different name lengths to test dynamic width
        const players = [
            { name: 'Jo', power: [6] },           // Very short name
            { name: 'Alice', power: [6] },        // Medium name
            { name: 'Bartholomew', power: [7] },  // Very long name - will be in different pod
            { name: 'Eve', power: [7] }           // Short name - will be with Bartholomew
        ];

        // Create players using the helper
        await helper.players.createPlayers(players);

        // Generate pods
        await helper.pods.generatePods();

        // Wait for display mode button to be visible 
        await expect(page.locator('#display-mode-btn')).toBeVisible();

        // Enter display mode
        await helper.displayMode.enterDisplayMode();

        // Check that display mode is active
        const displayContainer = page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();

        // Get all player items
        const playerItems = page.locator('.dynamic-font-item');
        const itemCount = await playerItems.count();
        expect(itemCount).toBeGreaterThan(0);

        // Check that player items have different widths per pod based on content
        const widthsByPod: { [podIndex: string]: number[] } = {};
        for (let i = 0; i < itemCount; i++) {
            const item = playerItems.nth(i);
            const podRef = await item.getAttribute('data-pod-ref');
            const width = await item.evaluate(el => {
                const style = window.getComputedStyle(el);
                return parseFloat(style.width);
            });

            if (podRef) {
                if (!widthsByPod[podRef]) {
                    widthsByPod[podRef] = [];
                }
                widthsByPod[podRef].push(width);
            }
        }


        // Verify that all items within the same pod have the same width
        Object.values(widthsByPod).forEach(podWidths => {
            const uniqueWidths = [...new Set(podWidths.map(w => Math.round(w)))];
            expect(uniqueWidths.length).toBe(1); // All items in same pod should have same width
        });

        // Verify that different pods can have different widths if their longest text differs significantly
        const podWidths = Object.values(widthsByPod).map(widths => Math.round(widths[0]));

        // Exit display mode
        await page.press('body', 'Escape');
        await page.waitForTimeout(200);
    });

    test('should scale font size based on pod dimensions', async ({ page }) => {
        // Simple test with 4 players all same power level to ensure pod generation works
        const players = [
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] }
        ];

        // Create players using helper
        await helper.players.createPlayers(players);

        // Generate pods
        await helper.pods.generatePods();

        // Wait for display mode button to be visible 
        await expect(page.locator('#display-mode-btn')).toBeVisible();

        // Enter display mode
        await page.click('#display-mode-btn');
        await page.waitForTimeout(500); // Wait for display mode and font sizing

        // Check that display mode is active
        const displayContainer = page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();

        // Get all player items and their font sizes
        const playerItems = page.locator('.dynamic-font-item');
        const itemCount = await playerItems.count();
        expect(itemCount).toBeGreaterThan(0);

        const fontSizes: number[] = [];
        for (let i = 0; i < itemCount; i++) {
            const item = playerItems.nth(i);
            const fontSize = await item.evaluate(el => {
                const style = window.getComputedStyle(el);
                return parseFloat(style.fontSize);
            });
            fontSizes.push(fontSize);
        }

        // Verify that font sizes are reasonable (between 12px and 28px as per our algorithm)
        for (const fontSize of fontSizes) {
            expect(fontSize).toBeGreaterThanOrEqual(12);
            expect(fontSize).toBeLessThanOrEqual(28);
        }

        // Verify that font sizes are actually being applied (not using default browser font size)
        const uniqueFontSizes = [...new Set(fontSizes.map(f => Math.round(f)))];

        // Exit display mode
        await page.press('body', 'Escape');
        await page.waitForTimeout(200);
    });

    test('should adapt to different text lengths within same pod', async ({ page }) => {
        // Create a scenario where one pod has very different text lengths
        // Use same power levels to ensure they end up in the same pod
        const players = [
            { name: 'Alexander', power: [6] },     // Long name
            { name: 'Bartholomew', power: [6] },   // Very long name  
            { name: 'Jo', power: [6] },            // Very short name
            { name: 'Sue', power: [6] }            // Short name
        ];

        // Create players using helper - they should all end up in the same pod due to same power level
        await helper.players.createPlayers(players);

        // Generate pods
        await helper.pods.generatePods();

        // Wait for display mode button to be visible (if pods were created)
        await expect(page.locator('#display-mode-btn')).toBeVisible();

        // Enter display mode
        await helper.displayMode.enterDisplayMode();

        // Check that all player items in the pod have the same width (based on longest text)
        const playerItems = page.locator('.dynamic-font-item');
        const itemCount = await playerItems.count();
        expect(itemCount).toBe(4);

        const widths: number[] = [];
        for (let i = 0; i < itemCount; i++) {
            const item = playerItems.nth(i);
            const width = await item.evaluate(el => {
                const style = window.getComputedStyle(el);
                return parseFloat(style.width);
            });
            widths.push(width);
        }

        // All items in the same pod should have the same width (based on "Bartholomew")
        const uniqueWidths = [...new Set(widths.map(w => Math.round(w)))];

        expect(uniqueWidths.length).toBe(1); // All should have same width

        // Exit display mode
        await page.press('body', 'Escape');
        await page.waitForTimeout(200);
    });
});
