import { test, expect } from '@playwright/test';
import { setupWithPods, teardownBasicTest } from './test-setup.js';
import TestHelper from './test-helpers.js';

test.describe('Manual Power Level Bolding Verification', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownBasicTest(helper);
        }
    });

    test('Show what the bolded power levels actually look like', async ({ page }) => {
        // Create realistic scenario
        helper = await setupWithPods(page, [
            { name: 'Alice', power: [6, 7, 8] },
            { name: 'Bob', power: [7, 8, 9] },
            { name: 'Charlie', power: [7, 8] },
            { name: 'Dave', power: [5, 7, 8] }
        ]);

        // Log what each player looks like
        const playerElements = await helper.page.locator('.pod li.pod-player').all();

        for (let i = 0; i < playerElements.length; i++) {
            const playerHTML = await playerElements[i].innerHTML();
            const playerText = await playerElements[i].textContent();
            console.log(`Player ${i + 1} HTML:`, playerHTML);
            console.log(`Player ${i + 1} Text:`, playerText);
        }

        // Check pod title shows intersection
        const podTitle = await helper.page.locator('.pod h3').first().textContent();
        console.log('Pod title:', podTitle);
    });
});
