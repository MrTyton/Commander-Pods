import { test, expect } from '@playwright/test';
import { setupDisplayModeTest, teardownDisplayModeTest } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Pod Title Power Range Display', () => {
    let helper: TestHelper;

    test.afterEach(async () => {
        if (helper) {
            await teardownDisplayModeTest(helper);
        }
    });

    test('should show full power range intersection in pod title when all players can play multiple levels', async ({ page }) => {
        // Create players who all can play power levels 7 and 8
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [7, 8] },
            { name: 'Bob', power: [7, 8] },
            { name: 'Charlie', power: [7, 8] },
            { name: 'Dave', power: [7, 8] }
        ]);

        // Get the pod title text
        const podTitle = page.locator('.display-mode-container .pod h3').first();
        const titleText = await podTitle.textContent();
        
        console.log('Pod title text:', titleText);
        
        // The title should show "Pod 1 (Power: 7, 8)" or "Pod 1 (Power: 7-8)" 
        // instead of just "Pod 1 (Power: 7)"
        expect(titleText).toMatch(/Pod 1 \(Power: (7, 8|7-8)\)/);
    });

    test('should show single power level when only one level works for all players', async ({ page }) => {
        // Create players where only power level 7 works for everyone
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [6, 7] },
            { name: 'Bob', power: [7, 8] },
            { name: 'Charlie', power: [7] },
            { name: 'Dave', power: [7, 8] }
        ]);

        // Get the pod title text
        const podTitle = page.locator('.display-mode-container .pod h3').first();
        const titleText = await podTitle.textContent();
        
        console.log('Pod title text:', titleText);
        
        // Only power level 7 should work for all players
        expect(titleText).toBe('Pod 1 (Power: 7)');
    });

    test('should handle bracket mode correctly showing intersection', async ({ page }) => {
        // Switch to bracket mode first
        await page.goto('./index.html');
        await page.check('#bracket-radio');
        
        // Create players who all can play brackets 2 and 3
        await helper.players.createPlayers([
            { name: 'Alice', bracket: [2, 3] },
            { name: 'Bob', bracket: [2, 3] },
            { name: 'Charlie', bracket: [2, 3] },
            { name: 'Dave', bracket: [2, 3] }
        ]);

        await helper.pods.generatePods();
        await helper.displayMode.enterDisplayMode();

        // Get the pod title text
        const podTitle = page.locator('.display-mode-container .pod h3').first();
        const titleText = await podTitle.textContent();
        
        console.log('Bracket pod title text:', titleText);
        
        // The title should show both brackets that work for everyone
        expect(titleText).toMatch(/Pod 1 \(Bracket: (2, 3|2-3)\)/);
    });

    test('should handle mixed power levels with different overlaps', async ({ page }) => {
        // Create players with varying power levels
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [6, 7, 8] },   // Can play 6, 7, 8
            { name: 'Bob', power: [7, 8, 9] },     // Can play 7, 8, 9
            { name: 'Charlie', power: [7, 8] },    // Can play 7, 8
            { name: 'Dave', power: [8] }           // Can only play 8
        ]);

        // Get the pod title text
        const podTitle = page.locator('.display-mode-container .pod h3').first();
        const titleText = await podTitle.textContent();
        
        console.log('Mixed pod title text:', titleText);
        
        // Only power level 8 should work for all players
        expect(titleText).toBe('Pod 1 (Power: 8)');
    });

    test('should debug what data is available to the display mode', async ({ page }) => {
        helper = await setupDisplayModeTest(page, [
            { name: 'Alice', power: [7, 8] },
            { name: 'Bob', power: [7, 8] }
        ]);

        // Check what's in the pods data structure
        const podData = await page.evaluate(() => {
            // Access the currentPods from the global scope if available
            return (window as any).currentPods || 'No currentPods found';
        });
        
        console.log('Pod data structure:', JSON.stringify(podData, null, 2));

        // Get the pod title text
        const podTitle = page.locator('.display-mode-container .pod h3').first();
        const titleText = await podTitle.textContent();
        
        console.log('Actual pod title:', titleText);
    });
});
