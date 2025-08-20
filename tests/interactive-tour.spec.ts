import { test, expect } from '@playwright/test';
import { setupBasicTest, teardownBasicTest, teardownDisplayModeTest, teardownNoOp } from './test-setup';
import TestHelper from './test-helpers';

test.describe('Interactive Tour', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async ({ }, testInfo) => {
        if (helper) {
            // Special handling for display mode test - no teardown needed
            if (testInfo.title.includes('display mode')) {
                await teardownNoOp(helper);
            } else {
                await teardownBasicTest(helper);
            }
        }
    });

    test('should show start tour button in help modal', async ({ page }) => {
        // Open help modal
        await page.click('#help-btn');
        await expect(page.locator('#help-modal')).toBeVisible();

        // Check that tour button exists and is visible
        const tourButton = page.locator('#start-tour-btn');
        await expect(tourButton).toBeVisible();
        await expect(tourButton).toContainText('Start Interactive Tour');
    });

    test('should start tour when tour button is clicked', async ({ page }) => {
        // Open help modal and click tour button
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Help modal should be hidden
        await expect(page.locator('#help-modal')).toBeHidden();

        // Tour overlay should be visible
        await expect(page.locator('.tour-overlay')).toBeVisible();
        await expect(page.locator('.tour-highlight')).toBeVisible();
        await expect(page.locator('.tour-tooltip')).toBeVisible();

        // Should show progress indicator
        await expect(page.locator('.tour-progress')).toBeVisible();
        await expect(page.locator('.tour-progress')).toContainText('Step 1 of');
    });

    test('should navigate through tour steps', async ({ page }) => {
        // Start tour
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // First step should be welcome
        await expect(page.locator('.tour-tooltip h3')).toContainText('Welcome to Commander Pod Generator');

        // Click next to go to second step (Settings Button)
        await page.click('.tour-btn-primary');
        await page.waitForTimeout(100);

        // Should advance to settings button step
        await expect(page.locator('.tour-tooltip h3')).toContainText('Settings Button');
        await expect(page.locator('.tour-progress')).toContainText('Step 2 of');

        // Click next to go to third step (Ranking System)
        await page.click('.tour-btn-primary');
        await page.waitForTimeout(100);

        // Should advance to ranking system step and settings should be open
        await expect(page.locator('.tour-tooltip h3')).toContainText('Choose Your Ranking System');
        await expect(page.locator('.tour-progress')).toContainText('Step 3 of');
        
        // Wait for the beforeStep function to execute and DOM to update
        await page.waitForTimeout(300);
        
        // Settings sidebar should be open during this step
        await expect(page.locator('#settings-sidebar')).toHaveClass(/open/);

        // Test previous button
        await page.click('.tour-btn-secondary:has-text("Previous")');
        await page.waitForTimeout(100);

        // Should go back to settings button step
        await expect(page.locator('.tour-tooltip h3')).toContainText('Settings Button');
        await expect(page.locator('.tour-progress')).toContainText('Step 2 of');
        
        // Go back one more time to welcome step  
        await page.click('.tour-btn-secondary:has-text("Previous")');
        await page.waitForTimeout(100);

        // Should go back to welcome step
        await expect(page.locator('.tour-tooltip h3')).toContainText('Welcome to Commander Pod Generator');
        await expect(page.locator('.tour-progress')).toContainText('Step 1 of');
    });

    test('should handle tour keyboard shortcuts', async ({ page }) => {
        // Start tour
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Test escape key to end tour
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Tour should be ended
        await expect(page.locator('.tour-overlay')).toBeHidden();
        await expect(page.locator('.tour-progress')).toBeHidden();

        // Start tour again
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Test arrow right to advance
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        await expect(page.locator('.tour-progress')).toContainText('Step 2 of');

        // Test arrow left to go back
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        await expect(page.locator('.tour-progress')).toContainText('Step 1 of');
    });

    test('should perform step actions correctly', async ({ page }) => {
        // Start tour
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Navigate to the player name step (step 4)
        for (let i = 0; i < 3; i++) {
            await page.click('.tour-btn-primary');
            await page.waitForTimeout(200);
        }

        // Should be on adding players step
        await expect(page.locator('.tour-tooltip h3')).toContainText('Adding Players');

        // Click next, which should type "Alice" in the first player name field
        await page.click('.tour-btn-primary');
        await page.waitForTimeout(500);

        // Verify that "Alice" was typed
        const firstPlayerName = page.locator('.player-row:first-child .player-name');
        await expect(firstPlayerName).toHaveValue('Alice');
    });

    test('should handle exit tour correctly', async ({ page }) => {
        // Start tour
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Click exit tour button
        await page.click('.tour-btn-secondary:has-text("✕ Exit Tour")');
        await page.waitForTimeout(100);

        // Tour should be ended
        await expect(page.locator('.tour-overlay')).toBeHidden();
        await expect(page.locator('.tour-progress')).toBeHidden();
    });

    test('should complete full tour without errors', async ({ page }) => {
        // Start tour
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Track progress through all steps (22 total: 0-21)
        let currentStep = 1;

        while (currentStep < 22) { // Go through steps 1-21
            await expect(page.locator('.tour-progress')).toContainText(`Step ${currentStep} of`);

            // Click next button
            const nextBtn = page.locator('.tour-btn-primary');
            await nextBtn.click();
            await page.waitForTimeout(300); // Allow time for actions to complete

            currentStep++;
        }

        // Now we should be at step 22 (index 21, the final step)
        await expect(page.locator('.tour-progress')).toContainText('Step 22 of');

        // Final step should have "Finish Tour" button
        await expect(page.locator('.tour-btn-primary')).toContainText('Finish Tour');

        // Click finish
        await page.click('.tour-btn-primary');
        await page.waitForTimeout(100);

        // Tour should be ended
        await expect(page.locator('.tour-overlay')).toBeHidden();
        await expect(page.locator('.tour-progress')).toBeHidden();
    });

    test('should handle display mode tour steps correctly', async ({ page }) => {
        // Start tour and navigate to display mode steps (need to generate pods first)
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Skip to near the end where display mode happens
        // This might require adjusting based on actual step order
        for (let i = 0; i < 12; i++) {
            await page.click('.tour-btn-primary');
            await page.waitForTimeout(200);
        }

        // Should eventually reach display mode step
        // The tour should handle entering and exiting display mode
        const isInDisplayMode = await page.locator('body.display-mode').isVisible().catch(() => false);

        if (isInDisplayMode) {
            // If we're in display mode, the tour should show display mode content
            await expect(page.locator('.display-mode-container')).toBeVisible();
        }

        // Complete the remaining steps more reliably
        let attempts = 0;
        const maxAttempts = 25; // Reasonable limit for 17 total steps

        while (attempts < maxAttempts) {
            try {
                // Check if we're at the final step
                const finishButton = page.locator('.tour-btn-primary:has-text("Finish Tour")');
                if (await finishButton.isVisible({ timeout: 1000 })) {
                    // Found finish button, click it and exit loop
                    await finishButton.click();
                    break;
                }

                // Not at final step, click next
                const nextButton = page.locator('.tour-btn-primary');
                if (await nextButton.isVisible({ timeout: 1000 })) {
                    await nextButton.click();
                    await page.waitForTimeout(300);
                }

                attempts++;
            } catch (error) {
                console.warn(`Tour step attempt ${attempts} failed:`, error);
                attempts++;
                await page.waitForTimeout(500);
            }
        }

        await page.waitForTimeout(200);

        // Should be back to normal mode
        await expect(page.locator('.tour-overlay')).toBeHidden();
    });

    test('should restore proper state after tour completion', async ({ page }) => {
        // Start tour
        await page.click('#help-btn');
        await page.click('#start-tour-btn');

        // Complete tour quickly but safely
        let attempts = 0;
        const maxAttempts = 25; // Reasonable limit for 17 total steps

        while (attempts < maxAttempts) {
            try {
                // Check if we're at the final step
                const finishButton = page.locator('.tour-btn-primary:has-text("Finish Tour")');
                if (await finishButton.isVisible({ timeout: 1000 })) {
                    // Found finish button, click it and exit loop
                    await finishButton.click();
                    break;
                }

                // Not at final step, click next
                const nextButton = page.locator('.tour-btn-primary');
                if (await nextButton.isVisible({ timeout: 1000 })) {
                    await nextButton.click();
                    await page.waitForTimeout(200);
                }

                attempts++;
            } catch (error) {
                console.warn(`Tour completion attempt ${attempts} failed:`, error);
                attempts++;
                await page.waitForTimeout(300);
            }
        }

        await page.waitForTimeout(300);

        // Application should be functional after tour
        await expect(page.locator('#add-player-btn')).toBeVisible();
        await expect(page.locator('#generate-pods-btn')).toBeVisible();
        await expect(page.locator('#help-btn')).toBeVisible();

        // Should be able to add players normally
        await page.click('#add-player-btn');
        const playerRows = await page.locator('.player-row').count();
        expect(playerRows).toBeGreaterThan(1);
    });
});
