import { test, expect } from '@playwright/test';
import { setupWithPods, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Initial Pod Title Power Range Fix', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('Initial pod titles should show power intersections like display mode', async ({ page }) => {
        // Add players with overlapping power levels
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [7, 8] },
            { name: 'Bob', power: [7, 8] },
            { name: 'Charlie', power: [7, 8] },
            { name: 'Dave', power: [7, 8] }
        ]);

        // Check that the initial pod title shows the intersection
        const podTitle = await helper.page.locator('.pod h3').first().textContent();

        // Should show "Pod 1 (Power: 7, 8)" not "Pod 1 (Power: 7.5)"
        expect(podTitle).toMatch(/Pod 1 \(Power: (7, 8|7-8)\)/);
        expect(podTitle).not.toMatch(/Pod 1 \(Power: 7\.5\)/);
        expect(podTitle).not.toMatch(/Pod 1 \(Power: 7\)$/); // Not just single value
    });

    test('Initial pod titles should match display mode titles exactly', async ({ page }) => {
        // Add players with overlapping power levels
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [6, 7] },
            { name: 'Bob', power: [7, 8] },
            { name: 'Charlie', power: [7, 8] },
            { name: 'Dave', power: [7, 8] }
        ]);

        // Get initial pod title (before display mode)
        const initialPodTitle = await helper.page.locator('.pod h3').first().textContent();

        // Enter display mode
        await helper.displayMode.enterDisplayMode();

        // Get display mode pod title
        const displayPodTitle = await helper.page.locator('.display-mode-container .pod h3').first().textContent();

        // They should be identical (both should show the intersection)
        expect(initialPodTitle).toBe(displayPodTitle);
    });

    test('Single power intersection should work in initial generation', async ({ page }) => {
        // Add players where only power 8 works for everyone
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [7, 8] },
            { name: 'Bob', power: [8, 9] },
            { name: 'Charlie', power: [8] },
            { name: 'Dave', power: [6, 8] }
        ]);

        // Check pod title
        const podTitle = await helper.page.locator('.pod h3').first().textContent();

        // Should show only power 8 since that's the only intersection
        expect(podTitle).toBe('Pod 1 (Power: 8)');
    });

    test('Mixed power levels should show correct intersection in initial generation', async ({ page }) => {
        // Add players with different power overlaps
        // Alice: 5,6,7  Bob: 6,7,8  Charlie: 6,7  Dave: 7,8,9
        // Intersection should be only 7 (Dave cannot play 6)
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [5, 6, 7] },
            { name: 'Bob', power: [6, 7, 8] },
            { name: 'Charlie', power: [6, 7] },
            { name: 'Dave', power: [7, 8, 9] }
        ]);

        // Check pod title - intersection should be only 7
        const podTitle = await helper.page.locator('.pod h3').first().textContent();

        // Should show only power 7 since Dave can't play power 6
        expect(podTitle).toBe('Pod 1 (Power: 7)');
    });

    test('TRUE mixed power levels should show multiple power intersection', async ({ page }) => {
        // Add players where 6 AND 7 work for everyone
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [5, 6, 7] },
            { name: 'Bob', power: [6, 7, 8] },
            { name: 'Charlie', power: [6, 7] },
            { name: 'Dave', power: [6, 7, 8] } // Changed Dave to include 6
        ]);

        // Check pod title - intersection should be 6, 7
        const podTitle = await helper.page.locator('.pod h3').first().textContent();

        // Should show powers 6 and 7 since all players can play both
        expect(podTitle).toMatch(/Pod 1 \(Power: (6, 7|6-7)\)/);
    });

    test('Bracket mode initial titles should use bracket intersection', async ({ page }) => {
        // Add players with bracket overlaps
        helper = await setupWithPods(page, [
            { name: 'Alice', bracket: [1, 2] },
            { name: 'Bob', bracket: [1, 2] },
            { name: 'Charlie', bracket: [1, 2] },
            { name: 'Dave', bracket: [1, 2] }
        ], 'bracket');

        // Check pod title shows bracket intersection
        const podTitle = await helper.page.locator('.pod h3').first().textContent();

        // Should show bracket intersection
        expect(podTitle).toMatch(/Pod 1 \(Bracket: (1, 2|1-2)\)/);
    });
});
