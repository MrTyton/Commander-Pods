import { test, expect } from '@playwright/test';
import TestHelpers from './test-helpers.js';

test.describe('Sidebar Toggle Functionality', () => {
    test('should open sidebar when settings button is clicked and sidebar is closed', async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.setup.goto();

        // Verify sidebar is initially closed
        const sidebar = page.locator('#settings-sidebar');
        await expect(sidebar).not.toHaveClass(/open/);

        // Click settings toggle button
        await page.click('#settings-toggle');

        // Verify sidebar is now open
        await expect(sidebar).toHaveClass(/open/);
    });

    test('should close sidebar when settings button is clicked and sidebar is open', async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.setup.goto();

        const sidebar = page.locator('#settings-sidebar');

        // First click to open sidebar
        await page.click('#settings-toggle');
        await expect(sidebar).toHaveClass(/open/);

        // Second click to close sidebar
        await page.evaluate(() => {
            const toggleBtn = document.getElementById('settings-toggle');
            if (toggleBtn) toggleBtn.click();
        });
        await page.waitForTimeout(150); // Give more time for WebKit
        await expect(sidebar).not.toHaveClass(/open/);
    });

    test('should toggle sidebar multiple times correctly', async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.setup.goto();

        const sidebar = page.locator('#settings-sidebar');

        // Initially closed
        await expect(sidebar).not.toHaveClass(/open/);

        // Click 1: Open
        await page.click('#settings-toggle');
        await expect(sidebar).toHaveClass(/open/);

        // Click 2: Close
        await page.evaluate(() => {
            const toggleBtn = document.getElementById('settings-toggle');
            if (toggleBtn) toggleBtn.click();
        });
        await page.waitForTimeout(100); // Small wait for transition
        await expect(sidebar).not.toHaveClass(/open/);

        // Click 3: Open again
        await page.click('#settings-toggle', { force: true });
        await expect(sidebar).toHaveClass(/open/);

        // Click 4: Close again
        await page.evaluate(() => {
            const toggleBtn = document.getElementById('settings-toggle');
            if (toggleBtn) toggleBtn.click();
        });
        await page.waitForTimeout(150); // Give more time for WebKit
        await expect(sidebar).not.toHaveClass(/open/);
    });

    test('should close sidebar with close button regardless of toggle state', async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.setup.goto();

        const sidebar = page.locator('#settings-sidebar');

        // Open sidebar with toggle button
        await page.click('#settings-toggle');
        await expect(sidebar).toHaveClass(/open/);

        // Close with close button
        await page.click('#sidebar-close');
        await expect(sidebar).not.toHaveClass(/open/);
    });

    test('should close sidebar when clicking outside', async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.setup.goto();

        const sidebar = page.locator('#settings-sidebar');

        // Open sidebar with toggle button
        await page.click('#settings-toggle');
        await expect(sidebar).toHaveClass(/open/);

        // Click outside the sidebar (on the main content area)
        await page.click('#player-rows');
        await expect(sidebar).not.toHaveClass(/open/);
    });

    test('should not close sidebar when clicking inside the sidebar', async ({ page }) => {
        const helpers = new TestHelpers(page);
        await helpers.setup.goto();

        const sidebar = page.locator('#settings-sidebar');

        // Open sidebar with toggle button
        await page.click('#settings-toggle');
        await expect(sidebar).toHaveClass(/open/);

        // Click inside the sidebar
        await page.click('#no-leniency-radio');
        await expect(sidebar).toHaveClass(/open/);
    });
});
