/**
 * Manual toast test
 */

import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers.js';
import { setupBasicTest, teardownBasicTest } from './test-setup.js';

test.describe('Manual Toast Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should manually create toast', async ({ page }) => {
        // Manually inject a toast to see if the CSS is working
        await page.evaluate(() => {
            const toastContainer = document.getElementById('toast-container');
            if (toastContainer) {
                // Create a simple toast manually
                const toast = document.createElement('div');
                toast.className = 'toast toast-error toast-show';
                toast.innerHTML = `
                    <div class="toast-header">
                        <span class="toast-icon">❌</span>
                        <h4 class="toast-title">Manual Test</h4>
                        <button class="toast-close">✖️</button>
                    </div>
                    <div class="toast-body">
                        <p class="toast-message">This is a manual test toast</p>
                    </div>
                `;
                toastContainer.appendChild(toast);
                console.log('Manual toast created');
            } else {
                console.log('Toast container not found');
            }
        });

        // Check if the toast appears
        await page.waitForTimeout(1000);
        const toast = page.locator('.toast-container .toast');
        await expect(toast).toBeVisible();
        
        // Check toast content
        await expect(toast.locator('.toast-title')).toContainText('Manual Test');
    });
});
