/**
 * Centralized Element Pooling Service
 * 
 * Provides efficient DOM element creation and reuse across the entire application.
 * This reduces garbage collection pressure and improves performance by reusing
 * DOM elements instead of creating new ones for each operation.
 * 
 * **Performance Benefits:**
 * - Reduces memory allocation/deallocation overhead
 * - Minimizes garbage collection pressure
 * - Improves consistent frame timing
 * - Better memory usage patterns
 * 
 * **Usage:**
 * ```typescript
 * import { elementPool } from './element-pool';
 * 
 * // Instead of: document.createElement('div')
 * const div = elementPool.get('div');
 * 
 * // When done with element:
 * elementPool.release(div);
 * ```
 */

export class ElementPool {
    private pools: Map<string, HTMLElement[]> = new Map();
    private readonly POOL_SIZE = 15; // Increased from 10 for better coverage

    /**
     * Get a pooled element or create a new one
     * @param tagName The HTML tag name (e.g., 'div', 'ul', 'li')
     * @returns A clean, reusable HTMLElement
     */
    get<T extends HTMLElement>(tagName: string): T {
        const pool = this.pools.get(tagName.toLowerCase()) || [];
        
        if (pool.length > 0) {
            const element = pool.pop()! as T;
            this.resetElement(element);
            return element;
        }
        
        return document.createElement(tagName) as T;
    }

    /**
     * Return an element to the pool for reuse
     * @param element The element to return to the pool
     */
    release(element: HTMLElement): void {
        const tagName = element.tagName.toLowerCase();
        let pool = this.pools.get(tagName);
        
        if (!pool) {
            pool = [];
            this.pools.set(tagName, pool);
        }
        
        if (pool.length < this.POOL_SIZE) {
            this.resetElement(element);
            pool.push(element);
        }
    }

    /**
     * Reset element to clean state for reuse
     * @param element The element to reset
     */
    private resetElement(element: HTMLElement): void {
        // Clear content and attributes
        element.innerHTML = '';
        element.className = '';
        element.removeAttribute('style');
        element.removeAttribute('draggable');
        element.removeAttribute('id');
        
        // Remove all dataset attributes
        Object.keys(element.dataset).forEach(key => {
            delete element.dataset[key];
        });
        
        // Note: We don't clone during reset since elements in pool aren't attached to DOM
        // Event listener cleanup happens naturally when elements are removed from DOM
    }

    /**
     * Clear all pools - useful for memory cleanup
     */
    clear(): void {
        this.pools.clear();
    }

    /**
     * Get pool statistics for debugging
     */
    getStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        this.pools.forEach((pool, tagName) => {
            stats[tagName] = pool.length;
        });
        return stats;
    }

    /**
     * Pre-warm pools with commonly used elements
     * Call this during app initialization for better performance
     */
    preWarm(): void {
        const commonElements = [
            { tag: 'div', count: 8 },
            { tag: 'li', count: 6 },
            { tag: 'ul', count: 4 },
            { tag: 'h3', count: 3 },
            { tag: 'p', count: 3 },
            { tag: 'strong', count: 3 },
            { tag: 'button', count: 2 }
        ];

        commonElements.forEach(({ tag, count }) => {
            const pool: HTMLElement[] = [];
            for (let i = 0; i < count; i++) {
                const element = document.createElement(tag);
                this.resetElement(element);
                pool.push(element);
            }
            this.pools.set(tag, pool);
        });
    }
}

// Export singleton instance
export const elementPool = new ElementPool();

// Pre-warm the pool when the module loads
elementPool.preWarm();
