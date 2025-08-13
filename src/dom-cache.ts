import { isHTMLElement } from './type-guards.js';

/**
 * DOM Cache utility for performance optimization
 * Caches frequently accessed DOM elements to reduce repeated queries
 */
export class DOMCache {
    private cache = new Map<string, Element | NodeList>();
    private weakRefCache = new WeakMap<Element, Map<string, Element | NodeList>>();

    /**
     * Get cached element or query and cache it
     */
    get<T extends Element>(selector: string, root: Document | Element = document): T | null {
        const cacheKey = this.getCacheKey(selector, root);

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey) as T;
            // Verify element is still in DOM
            if (cached && cached.isConnected) {
                return cached;
            } else {
                this.cache.delete(cacheKey);
            }
        }

        const element = root.querySelector(selector) as T;
        if (element) {
            this.cache.set(cacheKey, element);
        }
        return element;
    }

    /**
     * Get cached NodeList or query and cache it
     */
    getAll<T extends Element>(selector: string, root: Document | Element = document): NodeListOf<T> {
        const cacheKey = this.getCacheKey(selector + ':all', root);

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey) as NodeListOf<T>;
            // Verify at least first element is still in DOM
            if (cached && cached.length > 0 && cached[0].isConnected) {
                return cached;
            } else {
                this.cache.delete(cacheKey);
            }
        }

        const elements = root.querySelectorAll(selector) as NodeListOf<T>;
        this.cache.set(cacheKey, elements);
        return elements;
    }

    /**
     * Get elements from a specific row (uses WeakMap for automatic cleanup)
     */
    getFromRow<T extends Element>(row: Element, selector: string): T | null {
        let rowCache = this.weakRefCache.get(row);
        if (!rowCache) {
            rowCache = new Map();
            this.weakRefCache.set(row, rowCache);
        }

        if (rowCache.has(selector)) {
            const cached = rowCache.get(selector) as T;
            if (cached && cached.isConnected) {
                return cached;
            } else {
                rowCache.delete(selector);
            }
        }

        const element = row.querySelector(selector) as T;
        if (element) {
            rowCache.set(selector, element);
        }
        return element;
    }

    /**
     * Get all elements from a specific row
     */
    getAllFromRow<T extends Element>(row: Element, selector: string): NodeListOf<T> {
        let rowCache = this.weakRefCache.get(row);
        if (!rowCache) {
            rowCache = new Map();
            this.weakRefCache.set(row, rowCache);
        }

        const cacheKey = selector + ':all';
        if (rowCache.has(cacheKey)) {
            const cached = rowCache.get(cacheKey) as NodeListOf<T>;
            if (cached && cached.length > 0 && cached[0].isConnected) {
                return cached;
            } else {
                rowCache.delete(cacheKey);
            }
        }

        const elements = row.querySelectorAll(selector) as NodeListOf<T>;
        rowCache.set(cacheKey, elements);
        return elements;
    }

    /**
     * Invalidate cache for a specific selector or clear all
     */
    invalidate(selector?: string, root: Document | Element = document): void {
        if (selector) {
            const cacheKey = this.getCacheKey(selector, root);
            this.cache.delete(cacheKey);
            this.cache.delete(cacheKey + ':all');
        } else {
            this.cache.clear();
        }
    }

    /**
     * Clear all cached elements
     */
    clear(): void {
        this.cache.clear();
        // WeakMap will be automatically cleaned up when elements are garbage collected
    }

    private getCacheKey(selector: string, root: Document | Element): string {
        if (root === document) {
            return selector;
        }
        // Use a simple identifier for element-scoped queries
        return `${selector}@${(root as Element).tagName}:${(root as Element).className}`;
    }
}

// Export singleton instance
export const domCache = new DOMCache();
