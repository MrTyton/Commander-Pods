/**
 * Dynamic module loader with loading states and error handling
 * Provides consistent loading experience across lazy-loaded features
 */

interface LoadingState {
    isLoading: boolean;
    error: string | null;
    module: any;
}

interface LoadModuleOptions {
    showLoadingMessage?: boolean;
    loadingMessage?: string;
    onLoadingStart?: () => void;
    onLoadingComplete?: () => void;
    onError?: (error: Error) => void;
}

class ModuleLoader {
    private loadingStates = new Map<string, LoadingState>();
    private moduleCache = new Map<string, any>();

    /**
     * Load a module dynamically with loading states and error handling
     */
    async loadModule<T>(
        modulePathFactory: () => Promise<T>,
        moduleId: string,
        options: LoadModuleOptions = {}
    ): Promise<T> {
        // Return cached module if already loaded
        if (this.moduleCache.has(moduleId)) {
            return this.moduleCache.get(moduleId);
        }

        // Check if already loading
        const currentState = this.loadingStates.get(moduleId);
        if (currentState?.isLoading) {
            // Wait for existing load to complete
            return new Promise((resolve, reject) => {
                const checkLoading = () => {
                    const state = this.loadingStates.get(moduleId);
                    if (!state?.isLoading) {
                        if (state?.error) {
                            reject(new Error(state.error));
                        } else if (state?.module) {
                            resolve(state.module);
                        }
                    } else {
                        setTimeout(checkLoading, 50);
                    }
                };
                checkLoading();
            });
        }

        // Initialize loading state
        this.loadingStates.set(moduleId, {
            isLoading: true,
            error: null,
            module: null
        });

        try {
            // Show loading feedback
            if (options.showLoadingMessage) {
                this.showLoadingMessage(options.loadingMessage || `Loading ${moduleId}...`);
            }

            options.onLoadingStart?.();

            // Load the module
            const module = await modulePathFactory();

            // Cache the loaded module
            this.moduleCache.set(moduleId, module);
            this.loadingStates.set(moduleId, {
                isLoading: false,
                error: null,
                module
            });

            options.onLoadingComplete?.();
            this.hideLoadingMessage();

            return module;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown loading error';

            this.loadingStates.set(moduleId, {
                isLoading: false,
                error: errorMessage,
                module: null
            });

            options.onError?.(error instanceof Error ? error : new Error(errorMessage));
            this.hideLoadingMessage();
            this.showErrorMessage(`Failed to load ${moduleId}: ${errorMessage}`);

            throw error;
        }
    }

    /**
     * Check if a module is currently loading
     */
    isLoading(moduleId: string): boolean {
        return this.loadingStates.get(moduleId)?.isLoading ?? false;
    }

    /**
     * Check if a module is loaded and cached
     */
    isLoaded(moduleId: string): boolean {
        return this.moduleCache.has(moduleId);
    }

    /**
     * Clear module cache (useful for development)
     */
    clearCache(): void {
        this.moduleCache.clear();
        this.loadingStates.clear();
    }

    /**
     * Show loading message in UI
     */
    private showLoadingMessage(message: string): void {
        // Remove any existing loading message
        this.hideLoadingMessage();

        const loadingElement = document.createElement('div');
        loadingElement.id = 'module-loading-message';
        loadingElement.textContent = message;
        loadingElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007acc;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(loadingElement);
    }

    /**
     * Hide loading message
     */
    private hideLoadingMessage(): void {
        const loadingElement = document.getElementById('module-loading-message');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * Show error message in UI
     */
    private showErrorMessage(message: string): void {
        console.error(message);

        const errorElement = document.createElement('div');
        errorElement.textContent = message;
        errorElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(errorElement);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }
}

// Export singleton instance
export const moduleLoader = new ModuleLoader();

// Convenience functions for common loading patterns
export async function loadDisplayMode() {
    return moduleLoader.loadModule(
        () => import('./display-mode.js'),
        'display-mode',
        {
            showLoadingMessage: true,
            loadingMessage: 'Loading Display Mode...'
        }
    );
}

export async function loadDragDrop() {
    return moduleLoader.loadModule(
        () => import('./drag-drop.js'),
        'drag-drop',
        {
            showLoadingMessage: false // Silent loading for drag-drop
        }
    );
}

export async function loadRealTimeValidator() {
    return moduleLoader.loadModule(
        () => import('./real-time-validator.js'),
        'real-time-validator',
        {
            showLoadingMessage: false // Silent loading for validator
        }
    );
}
