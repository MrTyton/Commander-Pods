/**
 * Direct ErrorMessages test
 */

import { test, expect } from '@playwright/test';
import TestHelper from './test-helpers.js';
import { setupBasicTest, teardownBasicTest } from './test-setup.js';

test.describe('Direct ErrorMessages Test', () => {
    let helper: TestHelper;

    test.beforeEach(async ({ page }) => {
        helper = await setupBasicTest(page);
    });

    test.afterEach(async () => {
        await teardownBasicTest(helper);
    });

    test('should test ErrorMessages.show directly', async ({ page }) => {
        // Test if we can access and use ErrorMessages
        const result = await page.evaluate(() => {
            // Try to find ErrorMessages in the global scope or import it
            console.log('Checking for ErrorMessages...');
            
            // Check window object
            const windowKeys = Object.keys(window);
            console.log('Window keys:', windowKeys.filter(k => k.toLowerCase().includes('error')));
            
            // Try to access from script globals
            try {
                // Look for any error-related globals
                for (const key of windowKeys) {
                    if (key.toLowerCase().includes('error')) {
                        console.log(`Found ${key}:`, (window as any)[key]);
                    }
                }
                
                // Try importing if available
                if (typeof (window as any).ErrorMessages !== 'undefined') {
                    console.log('Found ErrorMessages, testing...');
                    (window as any).ErrorMessages.show('E005');
                    return 'ErrorMessages.show called';
                } else {
                    console.log('ErrorMessages not found on window');
                    return 'ErrorMessages not found';
                }
            } catch (error) {
                console.error('Error:', error);
                return `Error: ${error}`;
            }
        });

        console.log('Test result:', result);
        
        // Wait for potential toast
        await page.waitForTimeout(2000);
        
        // Check if toast appeared
        const toastExists = await page.locator('.toast-container .toast').count();
        console.log('Toast count:', toastExists);
    });
});
