import { test, expect } from '@playwright/test';

test.describe('Group ID Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('./index.html');
        // Add players for testing
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
    });

    test('should reuse group IDs when groups are removed', async ({ page }) => {
        // Create Group 1
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Verify Group 1 was created
        let groupOptions = await page.locator('.player-row:nth-child(2) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');

        // Create Group 2
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        // Verify Group 2 was created
        groupOptions = await page.locator('.player-row:nth-child(3) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).toContain('Group 2');

        // Create Group 3
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');

        // Verify Group 3 was created
        groupOptions = await page.locator('.player-row:nth-child(4) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).toContain('Group 2');
        expect(groupOptions).toContain('Group 3');

        // Remove Group 2 by moving its player to Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Verify Group 2 is no longer available but Groups 1 and 3 still exist
        groupOptions = await page.locator('.player-row:nth-child(4) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).not.toContain('Group 2');
        expect(groupOptions).toContain('Group 3');

        // Create a new group - it should reuse ID 2, not create ID 4
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');

        // Wait a moment for the dropdown options to update
        await page.waitForTimeout(100);

        // Check that Group 2 was recreated (not Group 4)
        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).toContain('Group 2'); // Should be recreated
        expect(groupOptions).toContain('Group 3');
        expect(groupOptions).not.toContain('Group 4'); // Should not exist
    });

    test('should create sequential group IDs when no gaps exist', async ({ page }) => {
        // Create groups 1, 2, 3 in sequence
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');

        // Verify all groups exist
        const groupOptions = await page.locator('.player-row:nth-child(4) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).toContain('Group 2');
        expect(groupOptions).toContain('Group 3');
        expect(groupOptions).not.toContain('Group 4');

        // Create fourth group
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');

        // Verify Group 4 was created
        const updatedOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(updatedOptions).toContain('Group 4');
    });

    test('should reuse lowest available group ID', async ({ page }) => {
        // Create groups 1, 2, 3, 4
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(4) .group-select', 'new-group');

        // Add more players to test with
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');

        // Remove Group 2 by moving player to Group 1
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Remove Group 3 by moving player to Group 1
        await page.selectOption('.player-row:nth-child(3) .group-select', 'group-1');

        // Now we should have Groups 1 and 4, with 2 and 3 available
        let groupOptions = await page.locator('.player-row:nth-child(5) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 1');
        expect(groupOptions).not.toContain('Group 2');
        expect(groupOptions).not.toContain('Group 3');
        expect(groupOptions).toContain('Group 4');

        // Create a new group - should reuse Group 2 (lowest available)
        await page.selectOption('.player-row:nth-child(5) .group-select', 'new-group');
        await page.waitForTimeout(100);

        // Verify Group 2 was recreated
        groupOptions = await page.locator('.player-row:nth-child(6) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 2');
        expect(groupOptions).not.toContain('Group 5');

        // Create another new group - should reuse Group 3 (next lowest available)
        await page.selectOption('.player-row:nth-child(6) .group-select', 'new-group');
        await page.waitForTimeout(100);

        // Verify Group 3 was recreated
        groupOptions = await page.locator('.player-row:nth-child(1) .group-select option').allTextContents();
        expect(groupOptions).toContain('Group 3');
        expect(groupOptions).not.toContain('Group 5');
    });

    test('should maintain group colors when IDs are reused', async ({ page }) => {
        // Create Group 1 and note its color
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        const group1OriginalClass = await page.locator('.player-row:nth-child(1) .group-select').getAttribute('class');

        // Create Group 2
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        // Remove Group 1 by moving player to Group 2
        await page.selectOption('.player-row:nth-child(1) .group-select', 'group-2');

        // Recreate Group 1
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');

        // Verify Group 1 has the same color as before
        const group1NewClass = await page.locator('.player-row:nth-child(3) .group-select').getAttribute('class');
        expect(group1NewClass).toBe(group1OriginalClass);
    });

    test('group colors should be synchronized between selection and dropdown options', async ({ page }) => {
        // Create a group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Get the background color of the selected dropdown
        const selectedDropdown = page.locator('.player-row:nth-child(1) .group-select');
        const selectedBgColor = await selectedDropdown.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
        });

        // Get the background color of the corresponding option in another dropdown
        const optionBgColor = await page.locator('.player-row:nth-child(2) .group-select option[value="group-1"]').evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
        });

        // They should match (accounting for potential browser rendering differences)
        expect(selectedBgColor).toBe(optionBgColor);
    });
});
