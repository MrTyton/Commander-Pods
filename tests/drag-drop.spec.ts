import { test, expect } from '@playwright/test';
import { createPlayers } from './test-helpers';

test.describe('Drag and Drop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
        await createPlayers(page, [
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [6] },
            { name: 'Charlie', power: [6] },
            { name: 'David', power: [6] },
            { name: 'Eve', power: [7] },
            { name: 'Frank', power: [7] },
            { name: 'Grace', power: [7] },
            { name: 'Henry', power: [7] },
        ]);
        await page.click('#generate-pods-btn');
    });

    test('should make players draggable in pod view', async ({ page }) => {
        const playerElements = await page.locator('.pod-player');
        const firstPlayer = playerElements.first();
        await expect(firstPlayer).toHaveAttribute('draggable', 'true');
    });

    test('should support drag and drop between pods', async ({ page }) => {
        const pods = await page.locator('.pod:not(.unassigned-pod)');
        const pod1Initial = await pods.nth(0).textContent();
        const pod2Initial = await pods.nth(1).textContent();
        const firstPlayerInPod1 = await pods.nth(0).locator('.pod-player').first();
        const pod2Element = pods.nth(1);

        await firstPlayerInPod1.dragTo(pod2Element);
        await page.waitForTimeout(500);

        const pod1After = await pods.nth(0).textContent();
        const pod2After = await pods.nth(1).textContent();
        expect(pod1After).not.toBe(pod1Initial);
        expect(pod2After).not.toBe(pod2Initial);
    });

    test('should create new pod when dropping items on new pod target', async ({ page }) => {
        const newPodTarget = await page.locator('.new-pod.new-pod-target');
        const firstPlayer = await page.locator('.pod-player').first();
        const initialPodCount = await page.locator('.pod:not(.unassigned-pod):not(.new-pod)').count();

        await firstPlayer.dragTo(newPodTarget);
        await page.waitForTimeout(100);

        const finalPodCount = await page.locator('.pod:not(.unassigned-pod):not(.new-pod)').count();
        expect(finalPodCount).toBe(initialPodCount + 1);
    });

    test('should remove empty pods after all players are moved out', async ({ page }) => {
        const actualPods = await page.locator('.pod:not(.unassigned-pod):not(.new-pod)');
        const initialActualCount = await actualPods.count();
        const firstPod = actualPods.first();
        const secondPod = actualPods.nth(1);
        const firstPodPlayers = await firstPod.locator('.pod-player');
        const playerCount = await firstPodPlayers.count();

        for (let i = 0; i < playerCount; i++) {
            const playerToMove = await firstPod.locator('.pod-player').first();
            await playerToMove.dragTo(secondPod);
            await page.waitForTimeout(50);
        }

        const finalActualPods = await page.locator('.pod:not(.unassigned-pod):not(.new-pod)');
        const finalActualCount = await finalActualPods.count();
        expect(finalActualCount).toBe(initialActualCount - 1);
    });
});
