/**
 * Event Listener Manager for memory leak prevention
 * Tracks and manages event listeners to ensure proper cleanup
 */
export class EventListenerManager {
    private listeners = new Map<string, { element: EventTarget; type: string; listener: EventListener; options?: boolean | AddEventListenerOptions }>();
    private abortController = new AbortController();

    /**
     * Add an event listener with automatic cleanup tracking
     */
    addEventListener<K extends keyof HTMLElementEventMap>(
        element: EventTarget,
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): string;
    addEventListener(
        element: EventTarget,
        type: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): string {
        const id = this.generateId();

        // Add abort signal to options for automatic cleanup
        const enhancedOptions = {
            ...(typeof options === 'object' ? options : { capture: options }),
            signal: this.abortController.signal
        };

        element.addEventListener(type, listener, enhancedOptions);

        // Track the listener for manual removal if needed
        this.listeners.set(id, { element, type, listener, options: enhancedOptions });

        return id;
    }

    /**
     * Remove a specific event listener by ID
     */
    removeEventListener(id: string): boolean {
        const listenerData = this.listeners.get(id);
        if (!listenerData) {
            return false;
        }

        listenerData.element.removeEventListener(listenerData.type, listenerData.listener, listenerData.options);
        this.listeners.delete(id);
        return true;
    }

    /**
     * Remove all event listeners from a specific element
     */
    removeAllFromElement(element: EventTarget): number {
        let removedCount = 0;

        for (const [id, listenerData] of this.listeners.entries()) {
            if (listenerData.element === element) {
                listenerData.element.removeEventListener(listenerData.type, listenerData.listener, listenerData.options);
                this.listeners.delete(id);
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Remove all tracked event listeners (cleanup)
     */
    removeAll(): void {
        // Abort all listeners that were added with AbortController
        this.abortController.abort();

        // Create new AbortController for future listeners
        this.abortController = new AbortController();

        // Clear tracking
        this.listeners.clear();
    }

    /**
     * Get count of tracked listeners (for debugging)
     */
    getListenerCount(): number {
        return this.listeners.size;
    }

    /**
     * Generate unique ID for listener tracking
     */
    private generateId(): string {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Singleton instance for global use
 */
export const eventManager = new EventListenerManager();
