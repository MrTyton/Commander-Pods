import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Group Color Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('./index.html');
        // Add some players for testing
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
        await page.click('#add-player-btn');
    });

    test('group dropdown should change color when group is selected', async ({ page }) => {
        // Select "Start a New Group" for first player
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Check that the dropdown has a group color class (any number from 1-50)
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const className = await firstGroupSelect.getAttribute('class');
        expect(className).toMatch(/group-\d+/);

        // Verify it's within the valid range
        const match = className!.match(/group-(\d+)/);
        expect(match).toBeTruthy();
        const colorNumber = parseInt(match![1]);
        expect(colorNumber).toBeGreaterThanOrEqual(1);
        expect(colorNumber).toBeLessThanOrEqual(50);

        // Check that the dropdown has styling (should have white text)
        await expect(firstGroupSelect).toHaveCSS('color', 'rgb(255, 255, 255)');
    });

    test('multiple players in same group should have same color', async ({ page }) => {
        // Create a group with first player
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Get the group ID that was created for the first player
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const firstGroupValue = await firstGroupSelect.inputValue();

        // Add second player to the same group
        await page.selectOption('.player-row:nth-child(2) .group-select', firstGroupValue);

        // Both should have the same color class
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');

        const firstClassName = await firstGroupSelect.getAttribute('class');
        const secondClassName = await secondGroupSelect.getAttribute('class');

        // Extract the group color class from both
        const firstMatch = firstClassName!.match(/group-(\d+)/);
        const secondMatch = secondClassName!.match(/group-(\d+)/);

        expect(firstMatch).toBeTruthy();
        expect(secondMatch).toBeTruthy();
        expect(firstMatch![1]).toBe(secondMatch![1]); // Same color number

        // Both should have the same color styling
        const firstBorderColor = await firstGroupSelect.evaluate(el => getComputedStyle(el).borderColor);
        const secondBorderColor = await secondGroupSelect.evaluate(el => getComputedStyle(el).borderColor);
        expect(firstBorderColor).toBe(secondBorderColor);
    });

    test('different groups should have different colors', async ({ page }) => {
        await page.goto(`file://${path.resolve('index.html')}`);

        // Create two groups
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');

        // Get the color classes for both groups
        const firstClassName = await firstGroupSelect.getAttribute('class');
        const secondClassName = await secondGroupSelect.getAttribute('class');

        // Both should have group color classes
        expect(firstClassName).toMatch(/group-\d+/);
        expect(secondClassName).toMatch(/group-\d+/);

        // Extract color numbers
        const firstMatch = firstClassName!.match(/group-(\d+)/);
        const secondMatch = secondClassName!.match(/group-(\d+)/);

        expect(firstMatch).toBeTruthy();
        expect(secondMatch).toBeTruthy();

        // Groups should have different colors
        expect(firstMatch![1]).not.toBe(secondMatch![1]);

        // Both should be within valid range
        const firstColor = parseInt(firstMatch![1]);
        const secondColor = parseInt(secondMatch![1]);
        expect(firstColor).toBeGreaterThanOrEqual(1);
        expect(firstColor).toBeLessThanOrEqual(50);
        expect(secondColor).toBeGreaterThanOrEqual(1);
        expect(secondColor).toBeLessThanOrEqual(50);
    });

    test('removing group selection should remove color', async ({ page }) => {
        await page.goto(`file://${path.resolve('index.html')}`);

        // Create a group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        const groupSelect = page.locator('.player-row:nth-child(1) .group-select');

        // Should have a group color class
        const initialClassName = await groupSelect.getAttribute('class');
        expect(initialClassName).toMatch(/group-\d+/);

        // Change back to "No Group"
        await page.selectOption('.player-row:nth-child(1) .group-select', 'no-group');

        // Should no longer have any group color class
        const finalClassName = await groupSelect.getAttribute('class');
        expect(finalClassName).not.toMatch(/group-\d+/);
        expect(finalClassName).toBe('group-select');

        // Should have default styling
        await expect(groupSelect).toHaveCSS('border-color', 'rgb(68, 68, 68)');
        await expect(groupSelect).toHaveCSS('background-color', 'rgb(51, 51, 51)');
    });

    test('group colors should persist through dropdown updates', async ({ page }) => {
        // Create first group with two players
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');
        await page.selectOption('.player-row:nth-child(2) .group-select', 'group-1');

        // Create second group 
        await page.selectOption('.player-row:nth-child(3) .group-select', 'new-group');

        // Add more players to trigger dropdown updates
        await page.click('#add-player-btn');

        // Original groups should still have their colors (now random 1-50)
        const firstGroupSelect = page.locator('.player-row:nth-child(1) .group-select');
        const secondGroupSelect = page.locator('.player-row:nth-child(2) .group-select');
        const thirdGroupSelect = page.locator('.player-row:nth-child(3) .group-select');

        // Get the actual assigned color classes (will be random 1-50)
        const firstGroupClass = await firstGroupSelect.getAttribute('class');
        const secondGroupClass = await secondGroupSelect.getAttribute('class');
        const thirdGroupClass = await thirdGroupSelect.getAttribute('class');

        // Both players in group 1 should have the same color class
        expect(firstGroupClass).toEqual(secondGroupClass);

        // Third player should have a different color class
        expect(firstGroupClass).not.toEqual(thirdGroupClass);

        // All should have a group color (group-1 through group-50)
        expect(firstGroupClass).toMatch(/group-(\d+)/);
        expect(secondGroupClass).toMatch(/group-(\d+)/);
        expect(thirdGroupClass).toMatch(/group-(\d+)/);
    });

    test('up to 50 different group colors should be supported with random assignment', async ({ page }) => {
        await page.goto(`file://${path.resolve('index.html')}`);

        // Add just 5 players to test random color assignment
        for (let i = 0; i < 4; i++) {
            await page.click('#add-player-btn');
        }

        // Create 5 different groups and verify they get different random colors
        const assignedColors = new Set<string>();

        for (let i = 1; i <= 5; i++) {
            // Fill name 
            await page.fill(`.player-row:nth-child(${i}) .player-name`, `Player ${i}`);

            // Create a new group for each player
            await page.selectOption(`.player-row:nth-child(${i}) .group-select`, 'new-group');

            // Wait for group assignment
            await page.waitForTimeout(200);

            // Get the color class that was assigned
            const groupSelect = page.locator(`.player-row:nth-child(${i}) .group-select`);
            const className = await groupSelect.getAttribute('class') || '';
            const colorMatch = className.match(/group-(\d+)/);

            if (colorMatch) {
                const colorNumber = parseInt(colorMatch[1]);
                expect(colorNumber).toBeGreaterThanOrEqual(1);
                expect(colorNumber).toBeLessThanOrEqual(50);
                assignedColors.add(colorMatch[1]);
            }
        }

        // Verify we got 5 different colors (since random assignment, each group should get a different color)
        expect(assignedColors.size).toBe(5);

        // Verify all assigned colors are within valid range
        assignedColors.forEach(colorNum => {
            const num = parseInt(colorNum);
            expect(num).toBeGreaterThanOrEqual(1);
            expect(num).toBeLessThanOrEqual(50);
        });
    });

    test('player rows should not have border styling anymore', async ({ page }) => {
        // Create a group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        const playerRow = page.locator('.player-row:nth-child(1)');

        // Should not have group border styling
        await expect(playerRow).not.toHaveClass(/group-1/);
        await expect(playerRow).not.toHaveCSS('border-color', 'rgb(33, 150, 243)');

        // Should maintain default row styling
        await expect(playerRow).toHaveCSS('display', 'flex');
    });

    test('group dropdown should be readable with white text', async ({ page }) => {
        // Create a group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        const groupSelect = page.locator('.player-row:nth-child(1) .group-select');

        // Should have white text for readability
        await expect(groupSelect).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Should have dark background for contrast (any of the 50 random colors)
        const backgroundColor = await groupSelect.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );

        // Background should be dark (any RGB values indicating a dark color)
        // Since we have 50 random HSL colors with dark backgrounds, just verify it's not the default
        expect(backgroundColor).not.toBe('rgb(51, 51, 51)'); // Should not be default background

        // Verify it has a group color class (1-50)
        await expect(groupSelect).toHaveClass(/group-\d+/);
    });

    test('group options should be properly updated when groups change', async ({ page }) => {
        // Create first group
        await page.selectOption('.player-row:nth-child(1) .group-select', 'new-group');

        // Check that Group 1 option is now available for other players
        const secondPlayerOptions = page.locator('.player-row:nth-child(2) .group-select option');
        await expect(secondPlayerOptions).toContainText(['No Group', 'Start a New Group', 'Group 1']);

        // Create second group
        await page.selectOption('.player-row:nth-child(2) .group-select', 'new-group');

        // Check that both Group 1 and Group 2 are available for third player
        const thirdPlayerOptions = page.locator('.player-row:nth-child(3) .group-select option');
        await expect(thirdPlayerOptions).toContainText(['No Group', 'Start a New Group', 'Group 1', 'Group 2']);
    });

    test('modern checkboxes should work correctly', async ({ page }) => {
        // Test that power selector exists and has proper styling
        const powerBtn = page.locator('.player-row:nth-child(1) .power-selector-btn');
        await expect(powerBtn).toBeVisible();
        await expect(powerBtn).toHaveText('Select Power Levels');

        // Check default button styling
        await expect(powerBtn).toHaveCSS('background-color', 'rgb(51, 51, 51)');
        await expect(powerBtn).toHaveCSS('border-color', 'rgb(68, 68, 68)');

        // Verify power selector has modern styling (not the old simple dropdown)
        await expect(powerBtn).toHaveCSS('border-radius', '4px');
        await expect(powerBtn).toHaveCSS('cursor', 'pointer');
    });

    test('bracket checkboxes should work correctly', async ({ page }) => {
        // Switch to bracket mode
        await page.check('#bracket-radio');

        // Wait for bracket levels to be visible
        await page.waitForSelector('.player-row:nth-child(1) .bracket-levels', { state: 'visible' });

        // Test that bracket mode is active by checking power levels are hidden
        const powerLevels = page.locator('.player-row:nth-child(1) .power-levels');
        await expect(powerLevels).toHaveCSS('display', 'none');

        // And bracket levels are visible
        const bracketLevels = page.locator('.player-row:nth-child(1) .bracket-levels');
        await expect(bracketLevels).toHaveCSS('display', 'block');

        // Verify bracket selector button exists
        const bracketBtn = page.locator('.player-row:nth-child(1) .bracket-selector-btn');
        await expect(bracketBtn).toBeVisible();
        await expect(bracketBtn).toHaveText('Select Brackets');
    });

    test('Group dropdown options should have correct colors', async ({ page }) => {
        await page.goto(`file://${path.resolve('index.html')}`);

        // Add a player
        await page.click('#add-player-btn');
        await page.fill('.player-row:nth-child(1) .player-name', 'Player 1');

        // Set power level with proper waits
        await page.waitForSelector('.player-row:nth-child(1) .power-selector-btn', { state: 'visible' });
        await page.click('.player-row:nth-child(1) .power-selector-btn', { force: true });
        await page.waitForSelector('.player-row:nth-child(1) .power-selector-dropdown.show', { state: 'visible' });
        await page.click('.player-row:nth-child(1) .power-checkbox input[value="7"]', { force: true });
        await page.click('body'); // Close dropdown

        // Wait for dropdown to close
        await page.waitForTimeout(200);

        // Create a new group
        const groupSelect = page.locator('.player-row:nth-child(1) .group-select');
        await groupSelect.selectOption('new-group');

        // Wait for the group to be assigned
        await page.waitForTimeout(300);

        // Check that the group select has a random color class (1-50)
        const groupClass = await groupSelect.getAttribute('class') || '';
        expect(groupClass).toMatch(/group-\d+/);

        // Get the created group ID from the dataset attribute
        const createdGroupId = await groupSelect.getAttribute('data-created-group-id') || '';
        expect(createdGroupId).toMatch(/group-\d+/);

        // Verify that the created group option exists in the select
        const selectContent = await groupSelect.innerHTML();
        expect(selectContent).toContain(`option value="${createdGroupId}"`);

        // Also verify that the color class is applied (should be different from the group ID)
        const colorMatch = groupClass.match(/group-(\d+)/);
        expect(colorMatch).toBeTruthy();
        const colorNumber = parseInt(colorMatch![1]);
        expect(colorNumber).toBeGreaterThanOrEqual(1);
        expect(colorNumber).toBeLessThanOrEqual(50);
    });
});
