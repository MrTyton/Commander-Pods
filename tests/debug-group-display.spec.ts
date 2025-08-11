import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers';

test.describe('Group Display Debug', () => {
    test('debug group display in pods', async ({ page }) => {
        const helper = new TestHelper(page);
        await helper.setup.goto();

        // Create players and group
        await helper.players.createPlayers([
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] }
        ]);

        // Put Alice and Bob in the same group
        await helper.groups.createNewGroup(1);
        await helper.groups.addPlayerToGroup(2, 'group-1');

        // Generate pods
        await helper.pods.generatePods();

        // Check pod arrangement
        const podArrangement = await helper.pods.getPodArrangement();

        // Check raw pod HTML
        const pods = page.locator('.pod:not(.unassigned-pod):not(.new-pod)');
        const podCount = await pods.count();

        for (let i = 0; i < podCount; i++) {
            const podHTML = await pods.nth(i).innerHTML();

            // Check for group elements
            const groupElements = pods.nth(i).locator('.pod-group');
            const groupCount = await groupElements.count();

            for (let j = 0; j < groupCount; j++) {
                const groupHTML = await groupElements.nth(j).innerHTML();
            }
        }

        // Check if groups are being rendered as expected
        const groupElements = page.locator('.pod-group');
        const totalGroupElements = await groupElements.count();

        if (totalGroupElements > 0) {
            for (let i = 0; i < totalGroupElements; i++) {
                const groupText = await groupElements.nth(i).textContent();
            }
        }
    });
});
