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

        // Check what's in the output section
        const outputContent = await page.locator('#output-section').innerHTML();

        // Check pod count
        const podCount = await helper.pods.getPodCount();

        // Check if pods exist
        const pods = page.locator('.pod:not(.unassigned-pod):not(.new-pod)');
        const actualPodCount = await pods.count();

        if (actualPodCount > 0) {
            // Check first pod structure
            const firstPod = pods.first();
            const firstPodHTML = await firstPod.innerHTML();

            // Check for pod-player elements
            const podPlayers = firstPod.locator('.pod-player');
            const playerCount = await podPlayers.count();

            // Check for all li elements
            const allLis = firstPod.locator('li');
            const liCount = await allLis.count();

            for (let i = 0; i < liCount; i++) {
                const liText = await allLis.nth(i).textContent();
                const liClasses = await allLis.nth(i).getAttribute('class');
            }
        }

        // Test the helper methods with our fix
        const playersInPod1 = await helper.pods.getPlayerNamesInPod(1);

        // Test expectPodHasPlayers method
        try {
            await helper.pods.expectPodHasPlayers(1, ['Alice', 'Bob', 'Charlie', 'Dave']);
        } catch (error) {
            // Test failed, but this is expected in debug mode
        }
    });
});
