import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';

test.describe('DOM Structure Debug', () => {
    test('debug pod structure after generation', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.setup.goto();

        // Add players
        await helper.players.createPlayers([
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // Generate pods
        await helper.pods.generatePods();

        // Debug: Check what's in the output section
        const outputContent = await page.locator('#output-section').innerHTML();
        console.log('=== OUTPUT SECTION CONTENT ===');
        console.log(outputContent);

        // Debug: Check pod count
        const podCount = await helper.pods.getPodCount();
        console.log('Pod count:', podCount);

        // Debug: Check if pods exist
        const pods = page.locator('.pod:not(.unassigned-pod):not(.new-pod)');
        const actualPodCount = await pods.count();
        console.log('Actual pod elements found:', actualPodCount);

        if (actualPodCount > 0) {
            // Debug first pod structure
            const firstPod = pods.first();
            const firstPodHTML = await firstPod.innerHTML();
            console.log('=== FIRST POD HTML ===');
            console.log(firstPodHTML);

            // Check for pod-player elements
            const podPlayers = firstPod.locator('.pod-player');
            const playerCount = await podPlayers.count();
            console.log('Pod-player elements count:', playerCount);

            // Check for all li elements
            const allLis = firstPod.locator('li');
            const liCount = await allLis.count();
            console.log('All li elements count:', liCount);

            for (let i = 0; i < liCount; i++) {
                const liText = await allLis.nth(i).textContent();
                const liClasses = await allLis.nth(i).getAttribute('class');
                console.log(`Li ${i}: text="${liText}", classes="${liClasses}"`);
            }
        }

        // Debug: Test the helper methods with our fix
        const playersInPod1 = await helper.pods.getPlayerNamesInPod(1);
        console.log('Players in pod 1:', playersInPod1);

        // Test expectPodHasPlayers method
        try {
            await helper.pods.expectPodHasPlayers(1, ['Alice', 'Bob', 'Charlie', 'Dave']);
            console.log('✅ expectPodHasPlayers passed!');
        } catch (error) {
            console.log('❌ expectPodHasPlayers failed:', error);
        }
    });
});
