import { test, expect } from '@playwright/test';
import { createPlayers, setLeniency, setGroup, generatePods } from './test-helpers';

test.describe('Pod Generation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/index.html');
    });

    test('should generate pods with same power levels', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] },
        ]);
        await generatePods(page);
        const pods = page.locator('.pod:not(.new-pod):not(.new-pod-target)');
        await expect(pods.first()).toBeVisible();
        await expect(page.locator('.pod:not(.new-pod):not(.new-pod-target) h3')).toContainText('(Power: 7)');
    });

    test('should handle mixed power levels correctly', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Alice', power: [8] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [6] },
            { name: 'Dave', power: [6] },
        ]);
        await generatePods(page);
        const pods = page.locator('.pod:not(.new-pod):not(.new-pod-target)');
        await expect(pods.first()).toBeVisible();
        const podContent = await page.locator('#output-section').textContent();
        const hasPowerLevel8 = podContent?.includes('Power: 8') || false;
        const hasPowerLevel6 = podContent?.includes('Power: 6') || false;
        expect(hasPowerLevel8 || hasPowerLevel6).toBeTruthy();
    });

    test('should handle leniency setting', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7.5] },
            { name: 'Charlie', power: [6.5] },
            { name: 'Dave', power: [7] },
        ]);
        await setLeniency(page, 'regular');
        await generatePods(page);
        const pods = page.locator('.pod:not(.new-pod):not(.new-pod-target)');
        await expect(pods.first()).toBeVisible();
    });

    test('should display unassigned players when they cannot be placed', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Player1', power: [5] },
            { name: 'Player2', power: [5] },
            { name: 'Player3', power: [5] },
            { name: 'Player4', power: [5] },
            { name: 'Player5', power: [9] },
        ]);
        await generatePods(page);
        const unassignedSection = page.locator('.unassigned-pod');
        await expect(unassignedSection).toBeVisible();
        await expect(unassignedSection.locator('h3')).toContainText('Unassigned Players');
    });

    test('should handle group averaging correctly', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Alice', power: [6] },
            { name: 'Bob', power: [8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] },
        ]);
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await generatePods(page);
        const pods = page.locator('.pod:not(.new-pod):not(.new-pod-target)');
        await expect(pods.first()).toBeVisible();
        await expect(page.locator('.pod:not(.new-pod):not(.new-pod-target)')).toContainText('Group 1 (Avg Power: 7)');
    });

    test('should create multiple pods for larger groups', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] },
            { name: 'Eve', power: [8] },
            { name: 'Frank', power: [8] },
            { name: 'Grace', power: [8] },
            { name: 'Henry', power: [8] },
        ]);
        await generatePods(page);
        const pods = page.locator('.pod:not(.unassigned-pod)');
        await expect(pods).toHaveCount(3);
    });

    test('should keep groups together across multiple pods', async ({ page }) => {
        await createPlayers(page, [
            { name: 'Alice', power: [7] },
            { name: 'Bob', power: [7] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7] },
            { name: 'Eve', power: [8] },
            { name: 'Frank', power: [8] },
            { name: 'Grace', power: [8] },
            { name: 'Henry', power: [8] },
        ]);
        await setGroup(page, 1, { new: true });
        await setGroup(page, 2, { existing: 1 });
        await generatePods(page);
        const pods = page.locator('.pod:not(.unassigned-pod)');
        let groupFound = false;
        for (let i = 0; i < await pods.count(); i++) {
            const podContent = await pods.nth(i).textContent();
            if (podContent?.includes('Group 1')) {
                expect(podContent).toContain('Alice');
                expect(podContent).toContain('Bob');
                groupFound = true;
                break;
            }
        }
        expect(groupFound).toBeTruthy();
    });
});
