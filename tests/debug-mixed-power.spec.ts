import { test, expect } from '@playwright/test';
import { setupWithPods, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Debug Mixed Power Intersection', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('Debug what powers each player actually has', async ({ page }) => {
        // Add players with different power overlaps
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [5, 6, 7] },
            { name: 'Bob', power: [6, 7, 8] },
            { name: 'Charlie', power: [6, 7] },
            { name: 'Dave', power: [7, 8, 9] }
        ]);

        // Debug: Check what power levels each player shows in the UI
        for (let i = 1; i <= 4; i++) {
            const playerRow = helper.page.locator(`.player-row:nth-child(${i})`);
            const nameInput = await playerRow.locator('input[type="text"]').inputValue();
            const powerButton = await playerRow.locator('.power-selector-btn').textContent();
        }

        // Check pod title
        const podTitle = await helper.page.locator('.pod h3').first().textContent();
        
        // Check individual pod players
        const podPlayers = await helper.page.locator('.pod li').allTextContents();
        
        // Expected intersection should be 6, 7
        // Alice: [5,6,7], Bob: [6,7,8], Charlie: [6,7], Dave: [7,8,9] 
        // Only 7 works for all (Dave can't play 6)
        expect(podTitle).toBe('Pod 1 (Power: 7)');
    });
});
