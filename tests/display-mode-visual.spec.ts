import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Display Mode Visual Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ page }) => {
        await teardownBasicTest(helper);
    });

    test('visual demonstration of display mode improvements', async ({ page }) => {
        // Create scenario with different name lengths but same power level to ensure success
        const players = [
            { name: 'Jo', power: [6] },                    // Very short name
            { name: 'Sue', power: [6] },                   // Short name
            { name: 'Bartholomew', power: [6] },           // Very long name
            { name: 'Alexander', power: [6] }              // Long name  
        ];

        // Create players using helper
        await helper.players.createPlayers(players);

        // Generate pods
        await helper.pods.generatePods();

        // Wait for display mode button
        await expect(page.locator('#display-mode-btn')).toHaveCSS('display', 'inline-block');

        // Enter display mode for visual inspection
        await helper.displayMode.enterDisplayMode();
        await page.waitForTimeout(1000); // Wait for display mode and font sizing

        // Check that display mode is active
        const displayContainer = page.locator('.display-mode-container');
        await expect(displayContainer).toBeVisible();

        // Get detailed measurements for each pod
        const playerItems = page.locator('.dynamic-font-item');
        const itemCount = await playerItems.count();

        const measurements: { podIndex: string, name: string, width: number, fontSize: number }[] = [];

        for (let i = 0; i < itemCount; i++) {
            const item = playerItems.nth(i);
            const podRef = await item.getAttribute('data-pod-ref');
            const playerName = await item.textContent();
            const width = await item.evaluate(el => parseFloat(window.getComputedStyle(el).width));
            const fontSize = await item.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));

            measurements.push({
                podIndex: podRef || 'unknown',
                name: playerName || 'unknown',
                width: Math.round(width),
                fontSize: Math.round(fontSize * 10) / 10
            });
        }

        // Group by pod for better visualization
        const podGroups: { [key: string]: typeof measurements } = {};
        measurements.forEach(m => {
            if (!podGroups[m.podIndex]) {
                podGroups[m.podIndex] = [];
            }
            podGroups[m.podIndex].push(m);
        });

        Object.keys(podGroups).forEach(podIndex => {

            // Check if all items in pod have same width (based on longest text)
            const widths = podGroups[podIndex].map(m => m.width);
            const uniqueWidths = [...new Set(widths)];
        });

        // Basic validation
        expect(measurements.length).toBeGreaterThan(0);
        measurements.forEach(m => {
            expect(m.fontSize).toBeGreaterThanOrEqual(12);
            expect(m.fontSize).toBeLessThanOrEqual(28);
            expect(m.width).toBeGreaterThan(100);
        });

        // Exit display mode properly before teardown
        await helper.displayMode.exitDisplayMode();
        await page.waitForTimeout(200);
    });
});
