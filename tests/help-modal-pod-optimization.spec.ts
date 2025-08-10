import { test, expect } from '@playwright/test';

test.describe('Help Modal Pod Optimization Documentation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('file://' + process.cwd().replace(/\\/g, '/') + '/index.html');
    });

    test('should include pod optimization information in help modal', async ({ page }) => {
        // Open help modal
        const helpButton = page.locator('#help-btn');
        await helpButton.click();

        const helpModal = page.locator('#help-modal');
        await expect(helpModal).toBeVisible();

        // Check for pod size preference section
        await expect(page.locator('.help-content')).toContainText('Pod Size Preference');
        await expect(page.locator('.help-content')).toContainText('Balanced:');
        await expect(page.locator('.help-content')).toContainText('Avoid Large Pods:');
        
        // Check for specific details about the feature
        await expect(page.locator('.help-content')).toContainText('may create pods of 3, 4, or 5 players');
        await expect(page.locator('.help-content')).toContainText('Prioritizes pods of 3 players');
        await expect(page.locator('.help-content')).toContainText('Mathematical Constraint');
        await expect(page.locator('.help-content')).toContainText('9+ players');
        
        // Check for examples
        await expect(page.locator('.help-content')).toContainText('Examples:');
        await expect(page.locator('.help-content')).toContainText('10 players, creates [4,3,3] instead of [5,5]');
        await expect(page.locator('.help-content')).toContainText('13 players, creates [4,3,3,3] instead of [5,4,4]');

        // Close modal
        const closeButton = page.locator('.help-close');
        await closeButton.click();
        await expect(helpModal).not.toBeVisible();
    });

    test('should contain pod optimization information in the right location (after tolerance settings)', async ({ page }) => {
        // Open help modal
        const helpButton = page.locator('#help-btn');
        await helpButton.click();

        // Get the help content
        const helpContent = page.locator('.help-content');
        const content = await helpContent.textContent();

        // Verify the pod optimization section comes after tolerance settings but before pod generation
        const toleranceIndex = content!.indexOf('Power Level Tolerance');
        const podSizeIndex = content!.indexOf('Pod Size Preference');
        const podGenerationIndex = content!.indexOf('Generating Pods');

        expect(toleranceIndex).toBeGreaterThan(-1);
        expect(podSizeIndex).toBeGreaterThan(toleranceIndex);
        expect(podGenerationIndex).toBeGreaterThan(podSizeIndex);

        // Close modal
        await page.keyboard.press('Escape');
    });
});
