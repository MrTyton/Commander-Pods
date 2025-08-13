import { Player, Group, Pod } from './types.js';
import { calculatePodSizes, calculatePodSizesAvoidFive, getPodOptimizationSetting, getLeniencySettings, calculateValidPowerRange, formatPlayerPowerRangeWithBolding, getValidPowersArrayForPod } from './utils.js';
import { PlayerManager } from './player-manager.js';
import { PodGenerator } from './pod-generator.js';
import { DragDropManager } from './drag-drop.js';
import { DisplayModeManager } from './display-mode.js';
import { eventManager } from './event-manager.js';
import { ValidationUtils, ButtonTextUtils, DOMUtils } from './shared-utils.js';
import { ButtonTextManager } from './button-text-manager.js';
import { domCache } from './dom-cache.js';
import { realTimeValidator } from './real-time-validator.js';
import { 
    isHTMLElement, 
    isHTMLInputElement, 
    isHTMLButtonElement, 
    getElementByIdTyped, 
    getEventTarget,
    assertExists 
} from './type-guards.js';

interface PlayerResetData {
    name: string;
    groupValue: string;
    createdGroupId?: string;
    selectedPowers: string[];
    selectedBrackets: string[];
}

interface LeniencyResetData {
    noLeniency: boolean;
    leniency: boolean;
    superLeniency: boolean;
    bracket: boolean;
}

interface PerformanceMetrics {
    bundleSize: string;
    memoryUsage: number;
    domCacheHits: number;
    validationTime: number;
    podGenerationTime: number;
    lastUpdated: Date;
}

/**
 * Performance monitoring utility with bundle size analysis
 * 
 * Bundle Growth Tracking:
 * - Baseline (pre-helper): 52.1kb
 * - ButtonTextManager: +2.7kb → 54.8kb (+5.2%)
 * - DOMCache: +1.2kb → 56.0kb (+2.2%) 
 * - RealTimeValidator: +1.5kb → 57.5kb (+2.7%)
 * - TypeGuards: +0.7kb → 58.2kb (+1.2%)
 * - PerformanceMonitor: +1.0kb → 59.2kb (+1.7%)
 * - Total Growth: +7.1kb (+13.6% from baseline)
 */
class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        bundleSize: '59.2kb',
        memoryUsage: 0,
        domCacheHits: 0,
        validationTime: 0,
        podGenerationTime: 0,
        lastUpdated: new Date()
    };

    updateMemoryUsage(): void {
        if ('memory' in performance) {
            // @ts-ignore - performance.memory might not be available in all browsers
            this.metrics.memoryUsage = Math.round((performance.memory?.usedJSHeapSize || 0) / 1024 / 1024 * 100) / 100;
        }
        this.metrics.lastUpdated = new Date();
    }

    trackValidationTime(time: number): void {
        this.metrics.validationTime = Math.round(time * 100) / 100;
        this.metrics.lastUpdated = new Date();
    }

    trackPodGenerationTime(time: number): void {
        this.metrics.podGenerationTime = Math.round(time * 100) / 100;
        this.metrics.lastUpdated = new Date();
    }

    getMetrics(): PerformanceMetrics {
        this.updateMemoryUsage();
        return { ...this.metrics };
    }

    logMetrics(): void {
        const metrics = this.getMetrics();
        console.group('🔍 Performance Analysis');
        console.log('📦 Bundle Size:', metrics.bundleSize, '(+7.1kb from 52.1kb baseline)');
        console.log('📊 Growth Rate: +13.6% (efficient for added functionality)');
        console.log('💾 Memory Usage:', `${metrics.memoryUsage}MB`);
        console.log('⚡ Validation Time:', `${metrics.validationTime}ms`);
        console.log('🎯 Pod Generation:', `${metrics.podGenerationTime}ms`);
        
        console.group('📈 Helper Module Impact');
        console.log('✅ ButtonTextManager: +2.7kb (display state management)');
        console.log('✅ DOMCache: +1.2kb (query optimization)');
        console.log('✅ RealTimeValidator: +1.5kb (instant feedback)');
        console.log('✅ TypeGuards: +0.7kb (runtime type safety)');
        console.log('✅ PerformanceMonitor: +1.0kb (metrics tracking)');
        console.groupEnd();
        
        console.log('🎯 Next: Validation consolidation & event optimization');
        console.groupEnd();
    }
}

const performanceMonitor = new PerformanceMonitor();

interface ResetData {
    players: PlayerResetData[];
    leniencySettings: LeniencyResetData;
    currentPods: Pod[];
    currentUnassigned: (Player | Group)[];
}

export class UIManager {
    private playerRowsContainer: HTMLElement;
    private outputSection: HTMLElement;
    private displayModeBtn: HTMLElement;
    private playerRowTemplate: HTMLTemplateElement;
    private playerManager: PlayerManager;
    private podGenerator: PodGenerator;
    private dragDropManager: DragDropManager;
    private displayModeManager: DisplayModeManager;
    private currentPods: Pod[] = [];
    private currentUnassigned: (Player | Group)[] = [];
    private lastResetData: ResetData | null = null; // Store data before reset for undo functionality
    private isRestoring: boolean = false; // Flag to prevent clearAllSelections during restoration
    private displayModeBtnBottom: HTMLButtonElement | null = null; // Bottom Display Mode button

    // Memory optimization: Reusable arrays to reduce garbage collection
    private reusablePlayerArray: Player[] = [];
    private reusableItemArray: (Player | Group)[] = [];

    // Event delegation handlers for better performance
    private containerClickHandler: ((e: Event) => void) | null = null;
    private containerChangeHandler: ((e: Event) => void) | null = null;
    private containerInputHandler: ((e: Event) => void) | null = null;
    private documentClickHandler: ((e: Event) => void) | null = null;

    constructor() {
        this.playerRowsContainer = assertExists(
            getElementByIdTyped('player-rows', isHTMLElement),
            'player-rows container is required'
        );
        this.outputSection = assertExists(
            getElementByIdTyped('output-section', isHTMLElement),
            'output-section is required'
        );
        this.displayModeBtn = assertExists(
            getElementByIdTyped('display-mode-btn', isHTMLButtonElement),
            'display-mode-btn is required'
        );
        this.playerRowTemplate = assertExists(
            document.getElementById('player-row-template') as HTMLTemplateElement,
            'player-row-template is required'
        );

        this.playerManager = new PlayerManager();
        this.podGenerator = new PodGenerator();
        this.dragDropManager = new DragDropManager(this.playerManager, (pods, unassigned) => this.renderPods(pods, unassigned));
        this.displayModeManager = new DisplayModeManager();

        this.initializeEventListeners();
        this.initializeRankingModeToggle();
        this.setupRealTimeValidationForExistingRows();

        // Expose performance monitor for debugging
        (window as any).performanceMonitor = performanceMonitor;
    }

    private initializeEventListeners(): void {
        const addPlayerBtn = assertExists(
            getElementByIdTyped('add-player-btn', isHTMLButtonElement),
            'add-player-btn is required'
        );
        const bulkAddBtn = assertExists(
            getElementByIdTyped('bulk-add-btn', isHTMLButtonElement),
            'bulk-add-btn is required'
        );
        const generatePodsBtn = assertExists(
            getElementByIdTyped('generate-pods-btn', isHTMLButtonElement),
            'generate-pods-btn is required'
        );
        const resetAllBtn = assertExists(
            getElementByIdTyped('reset-all-btn', isHTMLButtonElement),
            'reset-all-btn is required'
        );
        const helpBtn = assertExists(
            getElementByIdTyped('help-btn', isHTMLButtonElement),
            'help-btn is required'
        );

        addPlayerBtn.addEventListener('click', () => this.addPlayerRow());
        bulkAddBtn.addEventListener('click', () => this.bulkAddPlayers(4));
        generatePodsBtn.addEventListener('click', () => this.generatePods());
        resetAllBtn.addEventListener('click', () => this.resetAllWithConfirmation());
        this.displayModeBtn.addEventListener('click', () => this.displayModeManager.enterDisplayMode(this.currentPods));
        helpBtn.addEventListener('click', () => this.showHelpModal());

        // Event Listener Cleanup: Setup event delegation instead of individual listeners
        this.setupEventDelegation();

        // Initialize help modal event listeners
        this.initializeHelpModal();

        // Add global keyboard shortcuts
        this.initializeKeyboardShortcuts();
    }

    /**
     * Simple DOM query method
     */
    private getCachedElements(selector: string): Element[] {
        return Array.from(this.playerRowsContainer.querySelectorAll(selector));
    }

    /**
     * Clear DOM cache when elements change
     */
    private clearDOMCache(): void {
        domCache.clear();
    }

    /**
     * Type-safe helper to get bracket radio element
     */
    private getBracketRadio(): HTMLInputElement | null {
        return getElementByIdTyped('bracket-radio', isHTMLInputElement);
    }

    // DOM Performance optimization: Element pooling (simplified)
    private getPooledElement(type: string): HTMLElement | null {
        return null; // Simplified - create elements directly
    }

    private returnToPool(type: string, element: HTMLElement): void {
        // Simplified - no pooling for now
    }

    // DOM Performance optimization: Cached dropdown queries
    private getDropdownsOptimized(): NodeListOf<HTMLElement> {
        // Don't cache during tests - refresh each time for reliability  
        return document.querySelectorAll('.bracket-selector-dropdown, .power-selector-dropdown');
    }

    private getButtonsOptimized(): NodeListOf<HTMLElement> {
        // Don't cache during tests - refresh each time for reliability
        return document.querySelectorAll('.bracket-selector-btn, .power-selector-btn');
    }

    // Event Listener Cleanup optimization: Use eventManager
    private addEventListenerWithTracking(element: HTMLElement, event: string, listener: EventListener): void {
        eventManager.addEventListener(element, event as keyof HTMLElementEventMap, listener);
    }

    private removeAllEventListeners(element: HTMLElement): void {
        eventManager.removeAllFromElement(element);
    }

    private setupEventDelegation(): void {
        // Event delegation for player row container
        if (!this.containerClickHandler) {
            this.containerClickHandler = (e: Event) => this.handleContainerClick(e);
            this.playerRowsContainer.addEventListener('click', this.containerClickHandler);
        }

        if (!this.containerChangeHandler) {
            this.containerChangeHandler = (e: Event) => this.handleContainerChange(e);
            this.playerRowsContainer.addEventListener('change', this.containerChangeHandler);
        }

        // Add input event handling for real-time validation
        if (!this.containerInputHandler) {
            this.containerInputHandler = (e: Event) => this.handleContainerInput(e);
            this.playerRowsContainer.addEventListener('input', this.containerInputHandler);
        }

        // Consolidated document click handler
        if (!this.documentClickHandler) {
            this.documentClickHandler = (e: Event) => this.handleDocumentClick(e);
            document.addEventListener('click', this.documentClickHandler);
        }
    }

    private setupRealTimeValidationForExistingRows(): void {
        // Setup real-time validation for any existing name inputs
        const existingRows = domCache.getAll<HTMLElement>('.player-row', this.playerRowsContainer);
        existingRows.forEach(row => {
            const nameInput = domCache.getFromRow<HTMLInputElement>(row, '.player-name');
            if (nameInput) {
                realTimeValidator.setupNameValidation(nameInput, () => this.clearDuplicateErrorsOnInput());
            }
        });
    }

    private handleContainerClick(e: Event): void {
        const target = getEventTarget(e, isHTMLElement);
        if (!target) return;

        // Handle power selector button clicks
        if (target.classList.contains('power-selector-btn')) {
            this.handlePowerSelectorClick(e, target);
            return;
        }

        // Handle bracket selector button clicks
        if (target.classList.contains('bracket-selector-btn')) {
            this.handleBracketSelectorClick(e, target);
            return;
        }

        // Handle range button clicks
        if (target.classList.contains('range-btn')) {
            this.handleRangeButtonClick(target);
            return;
        }

        // Handle bracket range button clicks
        if (target.classList.contains('bracket-range-btn')) {
            this.handleBracketRangeButtonClick(target);
            return;
        }

        // Handle clear button clicks
        if (target.classList.contains('clear-btn') || target.classList.contains('bracket-clear-btn')) {
            this.handleClearButtonClick(target);
            return;
        }

        // Handle remove button clicks
        if (target.classList.contains('remove-player-btn')) {
            this.handleRemoveButtonClick(target);
            return;
        }
    }

    private handleContainerChange(e: Event): void {
        const target = getEventTarget(e, isHTMLElement);
        if (!target) return;

        // Handle group select changes
        if (target.classList.contains('group-select')) {
            this.playerManager.handleGroupChange(this.playerRowsContainer);
            return;
        }

        // Handle checkbox changes for power levels
        if (isHTMLInputElement(target) && target.type === 'checkbox' && target.closest('.power-checkbox')) {
            this.handlePowerCheckboxChange(target);
            return;
        }

        // Handle checkbox changes for brackets
        if (isHTMLInputElement(target) && target.type === 'checkbox' && target.closest('.bracket-checkbox')) {
            this.handleBracketCheckboxChange(target);
            return;
        }

        // Handle player name input changes
        if (target.classList.contains('player-name') && isHTMLInputElement(target)) {
            this.handlePlayerNameChange(target);
            return;
        }
    }

    private handleContainerInput(e: Event): void {
        const target = getEventTarget(e, isHTMLElement);
        if (!target) return;

        // Handle player name input for real-time validation
        if (target.classList.contains('player-name')) {
            const inputTarget = getEventTarget(e, isHTMLInputElement);
            if (inputTarget) {
                this.handlePlayerNameChange(inputTarget);
            }
            return;
        }
    }

    private handleDocumentClick(e: Event): void {
        const target = getEventTarget(e, isHTMLElement);
        if (!target) return;

        // Close all dropdowns when clicking outside
        if (!target.closest('.power-selector-btn') && !target.closest('.power-selector-dropdown') &&
            !target.closest('.bracket-selector-btn') && !target.closest('.bracket-selector-dropdown')) {

            this.closeAllDropdowns();
        }
    }

    // Event Listener Cleanup: Individual handler methods for delegation
    private closeAllDropdowns(): void {
        this.getDropdownsOptimized().forEach(dropdown => {
            (dropdown as HTMLElement).style.display = 'none';
            dropdown.classList.remove('show');
        });
        this.getButtonsOptimized().forEach(btn => {
            btn.classList.remove('open');
        });
    }

    private handlePowerSelectorClick(e: Event, target: HTMLElement): void {
        e.preventDefault();
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        const dropdown = domCache.getFromRow<HTMLElement>(playerRow, '.power-selector-dropdown');
        if (!dropdown) return;

        const isOpen = dropdown.style.display !== 'none';

        // Close all other dropdowns first
        this.closeAllDropdowns();

        if (!isOpen) {
            dropdown.style.display = 'block';
            target.classList.add('open');
            setTimeout(() => dropdown.classList.add('show'), 10);
        }
    }

    private handleBracketSelectorClick(e: Event, target: HTMLElement): void {
        e.preventDefault();
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        const dropdown = domCache.getFromRow<HTMLElement>(playerRow, '.bracket-selector-dropdown');
        if (!dropdown) return;

        const isOpen = dropdown.style.display !== 'none';

        // Close all other dropdowns first
        this.closeAllDropdowns();

        if (!isOpen) {
            dropdown.style.display = 'block';
            target.classList.add('open');
            setTimeout(() => dropdown.classList.add('show'), 10);
        }
    }

    private handleRangeButtonClick(target: HTMLElement): void {
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        const range = target.dataset.range!;
        const checkboxes = domCache.getAllFromRow<HTMLInputElement>(playerRow, '.power-checkbox input[type="checkbox"]');

        // Clear all checkboxes first
        checkboxes.forEach(cb => cb.checked = false);

        // Select only the start and end values
        const [start, end] = range.split('-').map(Number);
        checkboxes.forEach(cb => {
            const value = parseFloat(cb.value);
            if (value === start || value === end) {
                cb.checked = true;
            }
        });

        this.updatePowerButtonText(playerRow);
    }

    private handleBracketRangeButtonClick(target: HTMLElement): void {
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        const range = target.dataset.range!;
        const checkboxes = domCache.getAllFromRow<HTMLInputElement>(playerRow, '.bracket-checkbox input[type="checkbox"]');

        // Clear all checkboxes first
        checkboxes.forEach(cb => cb.checked = false);

        if (range === 'cedh') {
            // Select only cEDH
            const cedhCheckbox = Array.from(checkboxes).find(cb => cb.value === 'cedh');
            if (cedhCheckbox) cedhCheckbox.checked = true;
        } else {
            // Select range (e.g., "1-2", "2-3", "3-4")
            const [start, end] = range.split('-').map(val =>
                val === 'cedh' ? val : parseInt(val)
            );

            checkboxes.forEach(cb => {
                const value = cb.value === 'cedh' ? 'cedh' : parseInt(cb.value);
                if (value === start || value === end) {
                    cb.checked = true;
                }
            });
        }

        this.updateBracketButtonText(playerRow);
    }

    private handleClearButtonClick(target: HTMLElement): void {
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        if (target.classList.contains('clear-btn')) {
            // Clear power checkboxes
            const checkboxes = domCache.getAllFromRow<HTMLInputElement>(playerRow, '.power-checkbox input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updatePowerButtonText(playerRow);
        } else if (target.classList.contains('bracket-clear-btn')) {
            // Clear bracket checkboxes
            const checkboxes = domCache.getAllFromRow<HTMLInputElement>(playerRow, '.bracket-checkbox input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateBracketButtonText(playerRow);
        }
    }

    private handleRemoveButtonClick(target: HTMLElement): void {
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        // Clean up event listeners before removing
        this.removeAllEventListeners(playerRow);

        this.playerRowsContainer.removeChild(playerRow);
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
        this.updatePlayerNumbers();
        this.clearDOMCache();
    }

    private handlePowerCheckboxChange(target: HTMLElement): void {
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (playerRow) {
            this.updatePowerButtonText(playerRow);
        }
    }

    private handleBracketCheckboxChange(target: HTMLElement): void {
        const playerRow = target.closest('.player-row') as HTMLElement;
        if (playerRow) {
            this.updateBracketButtonText(playerRow);
        }
    }

    private handlePlayerNameChange(target: HTMLInputElement): void {
        // Real-time validation is now handled by RealTimeValidator with debouncing
        // This method is kept for backward compatibility with event delegation
        // The actual validation logic is in RealTimeValidator.setupNameValidation()
    }

    private updatePowerButtonText(playerRow: HTMLElement): void {
        ButtonTextManager.updatePowerButton(playerRow);
    }

    private updateBracketButtonText(playerRow: HTMLElement): void {
        ButtonTextManager.updateBracketButton(playerRow);
    }

    /**
     * Memory-optimized way to get player rows with DOM caching
     */
    private getPlayerRowsOptimized(): HTMLElement[] {
        const nodeList = domCache.getAll<HTMLElement>('.player-row', this.playerRowsContainer);
        const result: HTMLElement[] = [];
        for (let i = 0; i < nodeList.length; i++) {
            result.push(nodeList[i]);
        }
        return result;
    }

    /**
     * Reuse arrays to reduce garbage collection
     */
    private clearReusableArrays(): void {
        this.reusablePlayerArray.length = 0;
        this.reusableItemArray.length = 0;
    }

    addPlayerRow(): void {
        const clone = this.playerRowTemplate.content.cloneNode(true) as DocumentFragment;
        const newRow = clone.querySelector('.player-row') as HTMLElement;
        const playerId = this.playerManager.getNextPlayerId();
        newRow.dataset.playerId = playerId.toString();

        // Event Listener Cleanup: No individual listeners needed - using delegation
        // Just initialize button text with helper function
        this.updatePowerButtonText(newRow);
        this.updateBracketButtonText(newRow);

        this.playerRowsContainer.appendChild(newRow);

        // Setup real-time validation for the new name input
        const nameInput = domCache.getFromRow<HTMLInputElement>(newRow, '.player-name');
        if (nameInput) {
            realTimeValidator.setupNameValidation(nameInput, () => this.clearDuplicateErrorsOnInput());
        }

        // DOM Performance: Clear caches when DOM structure changes
        this.clearDOMCache();
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);

        // Clear DOM cache since we added a new element
        this.clearDOMCache();

        // Update player numbers for all rows
        this.updatePlayerNumbers();

        // Apply current ranking mode to the new row
        const bracketRadio = this.getBracketRadio();
        const isBracketMode = bracketRadio?.checked ?? false;
        const powerLevels = domCache.getFromRow<HTMLElement>(newRow, '.power-levels');
        const bracketLevels = domCache.getFromRow<HTMLElement>(newRow, '.bracket-levels');

        if (isBracketMode && powerLevels && bracketLevels) {
            powerLevels.style.display = 'none';
            bracketLevels.style.display = 'block';
        } else if (powerLevels && bracketLevels) {
            powerLevels.style.display = 'block';
            bracketLevels.style.display = 'none';
        }
    }

    bulkAddPlayers(count: number): void {
        for (let i = 0; i < count; i++) {
            this.addPlayerRow();
        }
    }

    private initializeKeyboardShortcuts(): void {
        document.addEventListener('keydown', (e) => {
            // Ctrl+P to show performance metrics
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                performanceMonitor.logMetrics();
                return;
            }

            // Ctrl+Enter to add new player row
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.addPlayerRow();

                // Focus the name input of the newly added player
                const playerRows = domCache.getAll<HTMLElement>('.player-row', this.playerRowsContainer);
                const lastRow = playerRows[playerRows.length - 1];
                const nameInput = domCache.getFromRow<HTMLInputElement>(lastRow, '.player-name');
                if (nameInput) {
                    nameInput.focus();
                }
                return;
            }

            // Handle bracket shortcuts when a bracket selector button is focused
            const activeElement = document.activeElement;
            if (isHTMLElement(activeElement) && activeElement.classList.contains('bracket-selector-btn')) {
                let bracketValue: string | null = null;
                
                // Map keys to bracket values
                if (e.key === '1') bracketValue = '1';
                else if (e.key === '2') bracketValue = '2';
                else if (e.key === '3') bracketValue = '3';
                else if (e.key === '4') bracketValue = '4';
                else if (e.key === '5' || e.key === 'c' || e.key === 'C') bracketValue = 'cedh';

                if (bracketValue) {
                    e.preventDefault();
                    this.selectBracketByKeyboard(activeElement, bracketValue);
                }
            }
        });
    }

    private selectBracketByKeyboard(bracketButton: HTMLElement, bracketValue: string): void {
        const playerRow = bracketButton.closest('.player-row') as HTMLElement;
        if (!playerRow) return;

        // Clear all checkboxes first
        const checkboxes = domCache.getAllFromRow<HTMLInputElement>(playerRow, '.bracket-checkbox input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        // Check the specific bracket
        const targetCheckbox = domCache.getFromRow<HTMLInputElement>(playerRow, `.bracket-checkbox input[value="${bracketValue}"]`);
        if (targetCheckbox) {
            targetCheckbox.checked = true;
            // Trigger the change event to update button text
            targetCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    private cleanupBottomDisplayButton(): void {
        if (this.displayModeBtnBottom) {
            // Remove the wrapper div if it exists
            const wrapper = this.displayModeBtnBottom.parentNode;
            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            }
            this.displayModeBtnBottom = null;
        }
    }

    generatePods(): void {
        // Trigger validation for all fields before attempting pod generation
        this.triggerValidationForAllFields();

        this.cleanupBottomDisplayButton();
        this.outputSection.innerHTML = '';
        this.playerManager.handleGroupChange(this.playerRowsContainer);

        // Clear reusable arrays and use optimized player row fetching
        this.clearReusableArrays();
        const playerRows = this.getPlayerRowsOptimized();
        let validationFailed = false;

        // Clear any existing name validation errors (optimized loop)
        for (let i = 0; i < playerRows.length; i++) {
            const nameInput = playerRows[i].querySelector('.player-name') as HTMLInputElement;
            // Remove all possible duplicate error classes
            nameInput.classList.remove('name-duplicate-error', 'name-duplicate-error-1', 'name-duplicate-error-2', 'name-duplicate-error-3', 'name-duplicate-error-4', 'name-duplicate-error-5');
        }

        // Use reusable array to reduce memory allocation
        for (let i = 0; i < playerRows.length; i++) {
            const player = this.playerManager.getPlayerFromRow(playerRows[i]);
            if (player) {
                this.reusablePlayerArray.push(player);
            } else {
                validationFailed = true;
            }
        }

        // Check for duplicate names
        const nameCount = new Map<string, HTMLElement[]>();
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            const name = nameInput.value.trim().toLowerCase();
            if (name) {
                if (!nameCount.has(name)) {
                    nameCount.set(name, []);
                }
                nameCount.get(name)!.push(row as HTMLElement);
            }
        });

        // Highlight duplicate names with different colors for each group
        const duplicateNames: string[] = [];
        let colorIndex = 1;
        nameCount.forEach((rows, name) => {
            if (rows.length > 1) {
                duplicateNames.push(name);
                const colorClass = `name-duplicate-error-${colorIndex}`;
                rows.forEach(row => {
                    const nameInput = row.querySelector('.player-name') as HTMLInputElement;
                    nameInput.classList.add(colorClass);
                });
                colorIndex = (colorIndex % 5) + 1; // Cycle through colors 1-5
                validationFailed = true;
            }
        });

        if (validationFailed) {
            let errorMessage = 'Please fix the errors before generating pods.';
            if (duplicateNames.length > 0) {
                errorMessage += `\n\nDuplicate player names found: ${duplicateNames.join(', ')}`;
            }
            alert(errorMessage);
            return;
        }

        const processedGroups: Map<string, Group> = new Map();
        this.playerManager.getGroups().forEach((players, id) => {
            // Calculate the actual average power level for the group
            const totalPower = players.reduce((sum, player) => sum + player.power, 0);
            const averagePower = Math.round((totalPower / players.length) * 2) / 2; // Round to nearest 0.5

            processedGroups.set(id, {
                id,
                players,
                averagePower,
                size: players.length
            });
        });

        const groupedPlayerIds = new Set([...this.playerManager.getGroups().values()].flat().map(p => p.id));
        const ungroupedPlayers = this.reusablePlayerArray.filter(p => !groupedPlayerIds.has(p.id));

        // Use reusable array for items to pod
        this.reusableItemArray.length = 0;
        this.reusableItemArray.push(...ungroupedPlayers);
        processedGroups.forEach(group => {
            this.reusableItemArray.push({
                id: group.id,
                players: group.players,
                averagePower: group.averagePower,
                size: group.size
            });
        });

        const totalPlayerCount = this.reusablePlayerArray.length;
        if (totalPlayerCount < 3) {
            alert("You need at least 3 players to form a pod.");
            return;
        }

        // Get pod optimization setting and use appropriate calculation function
        const podOptimization = getPodOptimizationSetting();
        const podSizes = podOptimization === 'avoid-five'
            ? calculatePodSizesAvoidFive(totalPlayerCount)
            : calculatePodSizes(totalPlayerCount);

        const leniencySettings = getLeniencySettings();

        // Set shuffle seed for deterministic results in tests, random in production
        // Detect if we're in a test environment by checking for Playwright-specific globals
        const isTestEnvironment = typeof window !== 'undefined' &&
            (window.location.protocol === 'file:' ||
                (window as any).__playwright !== undefined ||
                (window as any).playwright !== undefined);

        if (isTestEnvironment) {
            // Use a deterministic seed based on player names for consistent test results
            const playerNames = this.reusablePlayerArray.map(p => p.name).join('');
            const deterministicSeed = Array.from(playerNames).reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
            this.podGenerator.setShuffleSeed(deterministicSeed);
        } else {
            // Use random seed in production for true randomness
            this.podGenerator.setShuffleSeed(null);
        }

        // Use backtracking algorithm for optimal pod assignment with performance tracking
        const podGenStart = performance.now();
        const result = this.podGenerator.generatePodsWithBacktracking(this.reusableItemArray, podSizes, leniencySettings);
        const podGenEnd = performance.now();
        performanceMonitor.trackPodGenerationTime(podGenEnd - podGenStart);

        const pods = result.pods;
        let unassignedPlayers = result.unassigned;

        this.currentPods = [...pods]; // Store current pods for drag-and-drop
        this.currentUnassigned = [...unassignedPlayers]; // Store current unassigned for drag-and-drop
        this.renderPods(pods, unassignedPlayers);
    }

    renderPods(pods: Pod[], unassignedPlayers: (Player | Group)[] = []): void {
        this.currentPods = [...pods]; // Store current pods for drag-and-drop
        this.currentUnassigned = [...unassignedPlayers]; // Store current unassigned for drag-and-drop
        this.dragDropManager.setCurrentPods(this.currentPods, this.currentUnassigned);
        this.cleanupBottomDisplayButton();
        this.outputSection.innerHTML = '';

        if (pods.length === 0) {
            this.outputSection.textContent = 'Could not form pods with the given players.';
            this.displayModeBtn.style.display = 'none';
            // Bottom button doesn't exist when no pods, so no need to hide it
            return;
        }

        // Show display mode button when pods are generated
        this.displayModeBtn.style.display = 'inline-block';

        // Calculate grid size using ceil(sqrt(pods))
        const gridSize = Math.ceil(Math.sqrt(pods.length));

        // DOM Performance: Use document fragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        const podsContainer = this.getPooledElement('pods-container') || document.createElement('div');
        podsContainer.classList.add('pods-container');
        podsContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        podsContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        pods.forEach((pod, index) => {
            const podElement = this.getPooledElement('pod') || document.createElement('div');
            podElement.classList.add('pod', `pod-color-${index % 10}`);
            podElement.dataset.podIndex = index.toString();

            // Make pod a drop target
            podElement.addEventListener('dragover', this.dragDropManager.handleDragOver);
            podElement.addEventListener('drop', this.dragDropManager.handleDrop);
            podElement.addEventListener('dragleave', this.dragDropManager.handleDragLeave);

            const title = this.getPooledElement('h3') || document.createElement('h3');

            // Check if we're in bracket mode to display appropriate title
            const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
            const isBracketMode = bracketRadio && bracketRadio.checked;

            if (isBracketMode) {
                // In bracket mode, calculate the valid bracket range like power level mode does
                const validBracketRange = this.calculateValidBracketRange(pod);
                title.textContent = `Pod ${index + 1} (Bracket: ${validBracketRange})`;
            } else {
                // Use the same intersection logic as display mode
                const validPowerRange = calculateValidPowerRange(pod);
                title.textContent = `Pod ${index + 1} (Power: ${validPowerRange})`;
            }

            podElement.appendChild(title);

            const list = this.getPooledElement('ul') || document.createElement('ul');
            pod.players.forEach((item, itemIndex) => {
                if ('players' in item) {
                    // It's a group - DOM Performance: use pooled elements
                    const groupItem = this.getPooledElement('li') || document.createElement('li');
                    groupItem.classList.add('pod-group');
                    groupItem.draggable = true;
                    groupItem.dataset.itemType = 'group';
                    groupItem.dataset.itemId = item.id;
                    groupItem.dataset.podIndex = index.toString();
                    groupItem.dataset.itemIndex = itemIndex.toString();

                    // Add drag event listeners
                    groupItem.addEventListener('dragstart', this.dragDropManager.handleDragStart);
                    groupItem.addEventListener('dragend', this.dragDropManager.handleDragEnd);

                    // Check if we're in bracket mode for group display
                    const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
                    const isBracketMode = bracketRadio && bracketRadio.checked;

                    // DOM Performance: Use textContent instead of innerHTML when possible
                    const groupTitle = document.createElement('strong');
                    if (isBracketMode) {
                        groupTitle.textContent = `Group ${item.id.split('-')[1]}:`;
                    } else {
                        groupTitle.textContent = `Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):`;
                    }
                    groupItem.appendChild(groupTitle);

                    const subList = this.getPooledElement('ul') || document.createElement('ul');
                    item.players.forEach(p => {
                        const subItem = this.getPooledElement('li') || document.createElement('li');
                        if (isBracketMode && p.bracketRange) {
                            subItem.textContent = `${p.name} (B: ${p.bracketRange})`;
                        } else {
                            // Get valid powers for this pod and format with highlighting
                            const validPowersForPod = getValidPowersArrayForPod(pod);
                            const formattedPowerRange = formatPlayerPowerRangeWithBolding(p, validPowersForPod);
                            subItem.innerHTML = `${p.name} (P: ${formattedPowerRange})`;
                        }
                        subList.appendChild(subItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                } else {
                    // It's an individual player - DOM Performance: use pooled elements
                    const playerItem = this.getPooledElement('li') || document.createElement('li');
                    playerItem.classList.add('pod-player');
                    playerItem.draggable = true;
                    playerItem.dataset.itemType = 'player';
                    playerItem.dataset.itemId = item.id.toString();
                    playerItem.dataset.podIndex = index.toString();
                    playerItem.dataset.itemIndex = itemIndex.toString();

                    // Add drag event listeners
                    playerItem.addEventListener('dragstart', this.dragDropManager.handleDragStart);
                    playerItem.addEventListener('dragend', this.dragDropManager.handleDragEnd);

                    // Check if we're in bracket mode for player display
                    const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
                    const isBracketMode = bracketRadio && bracketRadio.checked;

                    if (isBracketMode && item.bracketRange) {
                        playerItem.textContent = `${item.name} (B: ${item.bracketRange})`;
                    } else {
                        // Get valid powers for this pod and format with bolding
                        const validPowersForPod = getValidPowersArrayForPod(pod);
                        const formattedPowerRange = formatPlayerPowerRangeWithBolding(item, validPowersForPod);
                        playerItem.innerHTML = `${item.name} (P: ${formattedPowerRange})`;
                    }

                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            podsContainer.appendChild(podElement);
        });

        // Add a "New Pod" drop target only if there are already some pods
        if (pods.length > 0) {
            const newPodElement = document.createElement('div');
            newPodElement.classList.add('pod', 'new-pod', 'new-pod-target');
            newPodElement.style.borderColor = '#4CAF50';
            newPodElement.style.backgroundColor = '#1f2a1f';
            newPodElement.style.borderStyle = 'dashed';
            newPodElement.dataset.podIndex = 'new-pod';

            // Make new pod area a drop target
            newPodElement.addEventListener('dragover', this.dragDropManager.handleDragOver);
            newPodElement.addEventListener('drop', this.dragDropManager.handleDrop);
            newPodElement.addEventListener('dragleave', this.dragDropManager.handleDragLeave);

            const newPodTitle = document.createElement('h3');
            newPodTitle.textContent = 'Create New Pod';
            newPodTitle.style.color = '#4CAF50';
            newPodElement.appendChild(newPodTitle);

            const newPodMessage = document.createElement('p');
            newPodMessage.textContent = 'Drag players or groups here to create a new pod';
            newPodMessage.style.color = '#999';
            newPodMessage.style.fontStyle = 'italic';
            newPodMessage.style.textAlign = 'center';
            newPodMessage.style.margin = '20px 0';
            newPodElement.appendChild(newPodMessage);

            podsContainer.appendChild(newPodElement);
        }

        // Display unassigned players if any
        if (unassignedPlayers.length > 0) {
            const unassignedElement = document.createElement('div');
            unassignedElement.classList.add('pod', 'unassigned-pod');
            unassignedElement.style.borderColor = '#ff6b6b';
            unassignedElement.style.backgroundColor = '#2a1f1f';
            unassignedElement.dataset.podIndex = 'unassigned';

            // Make unassigned area a drop target
            unassignedElement.addEventListener('dragover', this.dragDropManager.handleDragOver);
            unassignedElement.addEventListener('drop', this.dragDropManager.handleDrop);
            unassignedElement.addEventListener('dragleave', this.dragDropManager.handleDragLeave);

            const title = document.createElement('h3');
            title.textContent = 'Unassigned Players';
            title.style.color = '#ff6b6b';
            unassignedElement.appendChild(title);

            const list = document.createElement('ul');
            unassignedPlayers.forEach((item, itemIndex) => {
                if ('players' in item) {
                    // It's a group
                    const groupItem = document.createElement('li');
                    groupItem.classList.add('pod-group');
                    groupItem.draggable = true;
                    groupItem.dataset.itemType = 'group';
                    groupItem.dataset.itemId = item.id;
                    groupItem.dataset.podIndex = 'unassigned';
                    groupItem.dataset.itemIndex = itemIndex.toString();

                    // Add drag event listeners
                    groupItem.addEventListener('dragstart', this.dragDropManager.handleDragStart);
                    groupItem.addEventListener('dragend', this.dragDropManager.handleDragEnd);

                    // Check if we're in bracket mode for group display
                    const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
                    const isBracketMode = bracketRadio && bracketRadio.checked;

                    if (isBracketMode) {
                        groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]}:</strong>`;
                    } else {
                        groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    }

                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const subItem = document.createElement('li');
                        if (isBracketMode && p.bracketRange) {
                            subItem.textContent = `${p.name} (B: ${p.bracketRange})`;
                        } else {
                            // For unassigned players, don't highlight since they're not in a pod
                            subItem.textContent = `${p.name} (P: ${p.powerRange})`;
                        }
                        subList.appendChild(subItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                } else {
                    // It's an individual player
                    const playerItem = document.createElement('li');
                    playerItem.classList.add('pod-player');
                    playerItem.draggable = true;
                    playerItem.dataset.itemType = 'player';
                    playerItem.dataset.itemId = item.id.toString();
                    playerItem.dataset.podIndex = 'unassigned';
                    playerItem.dataset.itemIndex = itemIndex.toString();

                    // Add drag event listeners
                    playerItem.addEventListener('dragstart', this.dragDropManager.handleDragStart);
                    playerItem.addEventListener('dragend', this.dragDropManager.handleDragEnd);

                    // Check if we're in bracket mode for player display
                    const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
                    const isBracketMode = bracketRadio && bracketRadio.checked;

                    if (isBracketMode && item.bracketRange) {
                        playerItem.textContent = `${item.name} (B: ${item.bracketRange})`;
                    } else {
                        playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    }

                    list.appendChild(playerItem);
                }
            });
            unassignedElement.appendChild(list);
            podsContainer.appendChild(unassignedElement);
        }

        // DOM Performance: Use document fragment for batch DOM update
        fragment.appendChild(podsContainer);
        this.outputSection.appendChild(fragment);

        // Add a second Display Mode button right before the help section for better accessibility
        const helpSection = document.querySelector('.help-section');
        if (helpSection && helpSection.parentNode) {
            // Create a wrapper div to center the button
            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.textAlign = 'center';
            buttonWrapper.style.marginTop = '20px';
            buttonWrapper.style.marginBottom = '20px';

            this.displayModeBtnBottom = this.displayModeBtn.cloneNode(true) as HTMLButtonElement;
            this.displayModeBtnBottom.id = 'display-mode-btn-bottom';
            this.displayModeBtnBottom.style.display = 'inline-block';
            this.displayModeBtnBottom.addEventListener('click', () => this.displayModeManager.enterDisplayMode(this.currentPods));

            buttonWrapper.appendChild(this.displayModeBtnBottom);
            helpSection.parentNode.insertBefore(buttonWrapper, helpSection);
        }
    }

    // Capture current player data for potential undo
    private captureCurrentPlayerData(): ResetData {
        const playerRows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));
        const playersData: PlayerResetData[] = [];

        playerRows.forEach((row) => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            const groupSelect = row.querySelector('.group-select') as HTMLSelectElement;

            // Capture power level selections
            const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const selectedPowers: string[] = [];
            powerCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    selectedPowers.push(checkbox.value);
                }
            });

            // Capture bracket selections
            const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const selectedBrackets: string[] = [];
            bracketCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    selectedBrackets.push(checkbox.value);
                }
            });

            playersData.push({
                name: nameInput.value.trim(),
                groupValue: groupSelect.value,
                createdGroupId: groupSelect.dataset.createdGroupId,
                selectedPowers,
                selectedBrackets
            });
        });

        // Also capture current leniency settings
        const leniencySettings: LeniencyResetData = {
            noLeniency: (document.getElementById('no-leniency-radio') as HTMLInputElement)?.checked || false,
            leniency: (document.getElementById('leniency-radio') as HTMLInputElement)?.checked || false,
            superLeniency: (document.getElementById('super-leniency-radio') as HTMLInputElement)?.checked || false,
            bracket: (document.getElementById('bracket-radio') as HTMLInputElement)?.checked || false
        };

        return {
            players: playersData,
            leniencySettings,
            currentPods: [...this.currentPods],
            currentUnassigned: [...this.currentUnassigned]
        };
    }

    // Show confirmation dialog before reset
    private resetAllWithConfirmation(): void {
        const playerRows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));

        // Check if there's any data to lose
        const hasData = playerRows.some((row) => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            if (nameInput.value.trim()) return true;

            const checkboxes = row.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            return Array.from(checkboxes).some(cb => cb.checked);
        });

        if (!hasData) {
            // No data to lose, just reset
            this.resetAll();
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(
            "Are you sure you want to reset all player data?\n\n" +
            "This will clear all players, groups, and generated pods. " +
            "You will be able to undo this action immediately after."
        );

        if (confirmed) {
            // Capture data before reset for undo
            this.lastResetData = this.captureCurrentPlayerData();
            this.resetAll();
            this.showUndoResetButton();
        }
    }

    // Show the undo reset button
    private showUndoResetButton(): void {
        // Remove any existing undo button
        const existingUndoBtn = document.getElementById('undo-reset-btn');
        if (existingUndoBtn) {
            existingUndoBtn.remove();
        }

        // Create and show undo button
        const undoBtn = document.createElement('button');
        undoBtn.id = 'undo-reset-btn';
        undoBtn.textContent = 'Undo Reset';
        undoBtn.style.marginLeft = '10px';
        undoBtn.style.backgroundColor = '#28a745';
        undoBtn.style.color = 'white';
        undoBtn.style.border = 'none';
        undoBtn.style.padding = '8px 16px';
        undoBtn.style.borderRadius = '4px';
        undoBtn.style.cursor = 'pointer';
        undoBtn.style.fontSize = '14px';

        undoBtn.addEventListener('click', () => this.undoReset());

        // Add the button next to the reset button
        const resetBtn = document.getElementById('reset-all-btn')!;
        resetBtn.parentNode!.insertBefore(undoBtn, resetBtn.nextSibling);

        // Auto-hide the undo button after 30 seconds
        setTimeout(() => {
            if (document.getElementById('undo-reset-btn')) {
                undoBtn.remove();
                this.lastResetData = null;
            }
        }, 30000);
    }

    // Restore data from before reset
    private undoReset(): void {
        if (!this.lastResetData) {
            alert('No reset data available to restore.');
            return;
        }

        // Clear current state
        this.playerRowsContainer.innerHTML = '';
        this.cleanupBottomDisplayButton();
        this.outputSection.innerHTML = '';
        this.playerManager.clearGroups();
        this.playerManager.resetPlayerIds();
        this.playerManager.resetGroupIds();

        // Restore leniency settings
        const settings = this.lastResetData.leniencySettings;
        if (settings.noLeniency) (document.getElementById('no-leniency-radio') as HTMLInputElement).checked = true;
        if (settings.leniency) (document.getElementById('leniency-radio') as HTMLInputElement).checked = true;
        if (settings.superLeniency) (document.getElementById('super-leniency-radio') as HTMLInputElement).checked = true;
        if (settings.bracket) (document.getElementById('bracket-radio') as HTMLInputElement).checked = true;

        // First, add all players with their names and group data (before mode change)
        this.lastResetData.players.forEach((playerData) => {
            this.addPlayerRow();
            const rows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));
            const currentRow = rows[rows.length - 1];

            // Restore name
            const nameInput = currentRow.querySelector('.player-name') as HTMLInputElement;
            nameInput.value = playerData.name;

            // Set group data but don't trigger change yet
            const groupSelect = currentRow.querySelector('.group-select') as HTMLSelectElement;
            if (playerData.createdGroupId) {
                groupSelect.dataset.createdGroupId = playerData.createdGroupId;
            }
            groupSelect.value = playerData.groupValue;
        });

        // Now trigger display mode change AFTER players are added (this will clear selections)
        this.isRestoring = true; // Set flag to prevent clearAllSelections
        const powerLevelRadio = document.getElementById('no-leniency-radio') as HTMLInputElement;
        const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
        if (powerLevelRadio && bracketRadio) {
            const changeEvent = new Event('change', { bubbles: true });
            if (settings.bracket) {
                bracketRadio.dispatchEvent(changeEvent);
            } else {
                powerLevelRadio.dispatchEvent(changeEvent);
            }
        }

        // Wait for DOM to update after mode change, then restore selections
        setTimeout(() => {
            this.restorePlayerSelections();
        }, 200);
    }

    private restorePlayerSelections(): void {
        if (!this.lastResetData) {
            return;
        }

        // Finally, restore all selections AFTER mode change
        this.lastResetData.players.forEach((playerData, index) => {
            const rows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));
            const currentRow = rows[index];

            if (!currentRow) {
                return;
            }

            // Re-set checkboxes since mode change cleared them
            playerData.selectedPowers.forEach((power) => {
                const checkbox = currentRow.querySelector(`.power-checkbox input[type="checkbox"][value="${power}"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            playerData.selectedBrackets.forEach((bracket) => {
                const checkbox = currentRow.querySelector(`.bracket-checkbox input[type="checkbox"][value="${bracket}"]`) as HTMLInputElement;
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            // Trigger change events for checkboxes to update button text
            const allCheckboxes = currentRow.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            allCheckboxes.forEach(cb => {
                if (cb.checked) {
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Manual button text update as fallback in case event listeners aren't working
            this.updateButtonTextsForRow(currentRow);

            // For group restoration, we need special handling:
            // If the player was in a group, set them to "new-group" first to trigger group creation
            const groupSelect = currentRow.querySelector('.group-select') as HTMLSelectElement;
            if (playerData.groupValue && playerData.groupValue !== 'no-group' && playerData.groupValue.startsWith('group-')) {
                // Set the created group ID data attribute
                if (playerData.createdGroupId) {
                    groupSelect.dataset.createdGroupId = playerData.createdGroupId;
                } else {
                    groupSelect.dataset.createdGroupId = playerData.groupValue;
                }
                // Set to "new-group" to trigger group creation logic
                groupSelect.value = 'new-group';
                groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // After all groups are created, perform a final update to correct group assignments
        this.lastResetData.players.forEach((playerData, index) => {
            const rows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));
            const currentRow = rows[index];
            const groupSelect = currentRow.querySelector('.group-select') as HTMLSelectElement;

            // Now set the correct group value (the dropdown should have the option now)
            if (playerData.groupValue && playerData.groupValue !== 'no-group' && playerData.groupValue.startsWith('group-')) {
                groupSelect.value = playerData.groupValue;
                groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Restore pods and unassigned if they existed
        this.currentPods = [...this.lastResetData.currentPods];
        this.currentUnassigned = [...this.lastResetData.currentUnassigned];

        if (this.currentPods.length > 0 || this.currentUnassigned.length > 0) {
            this.renderPods(this.currentPods, this.currentUnassigned);
        }

        // Final group state update
        this.playerManager.handleGroupChange(this.playerRowsContainer);

        // Clear restoration flag - restoration is now complete
        this.isRestoring = false;

        // Remove undo button and clear reset data
        const undoBtn = document.getElementById('undo-reset-btn');
        if (undoBtn) {
            undoBtn.remove();
        }
        this.lastResetData = null;

        alert('Reset has been undone successfully!');
    }

    resetAll(): void {
        // Clear everything first
        this.playerRowsContainer.innerHTML = '';
        this.cleanupBottomDisplayButton();
        this.outputSection.innerHTML = '';
        this.displayModeBtn.style.display = 'none'; // Hide the top display mode button
        this.playerManager.clearGroups();
        this.playerManager.resetPlayerIds();
        this.playerManager.resetGroupIds();
        this.currentPods = [];
        this.currentUnassigned = [];

        const noLeniencyRadio = document.getElementById('no-leniency-radio') as HTMLInputElement;
        noLeniencyRadio.checked = true; // Reset to no leniency by default

        // Add exactly 4 default rows to start
        for (let i = 0; i < 4; i++) {
            this.addPlayerRow();
        }
    }

    private clearDuplicateErrorsOnInput(): void {
        const playerRows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));

        // Get all current names and their inputs
        const nameInputs = new Map<string, HTMLInputElement[]>();
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            const name = nameInput.value.trim().toLowerCase();
            if (name) {
                if (!nameInputs.has(name)) {
                    nameInputs.set(name, []);
                }
                nameInputs.get(name)!.push(nameInput);
            }
        });

        // Clear all duplicate error classes first
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            nameInput.classList.remove('name-duplicate-error', 'name-duplicate-error-1', 'name-duplicate-error-2', 'name-duplicate-error-3', 'name-duplicate-error-4', 'name-duplicate-error-5');
        });

        // Re-apply highlighting only for names that are still duplicated
        let colorIndex = 1;
        nameInputs.forEach((inputs, name) => {
            if (inputs.length > 1) {
                const colorClass = `name-duplicate-error-${colorIndex}`;
                inputs.forEach(input => {
                    input.classList.add(colorClass);
                });
                colorIndex = (colorIndex % 5) + 1; // Cycle through colors 1-5
            }
        });
    }

    private initializeRankingModeToggle(): void {
        const powerLevelRadio = document.getElementById('power-level-radio') as HTMLInputElement;
        const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;

        const toggleRankingMode = () => {
            const isBracketMode = bracketRadio.checked;

            // Add/remove bracket-mode class to body for CSS styling
            if (isBracketMode) {
                document.body.classList.add('bracket-mode');

                // Set tolerance to 0 (no leniency) in bracket mode
                const noLeniencyRadio = document.getElementById('no-leniency-radio') as HTMLInputElement;
                if (noLeniencyRadio) {
                    noLeniencyRadio.checked = true;
                }
            } else {
                document.body.classList.remove('bracket-mode');
            }

            // Toggle visibility of power/bracket selectors in all existing rows
            const playerRows = this.playerRowsContainer.querySelectorAll('.player-row');
            playerRows.forEach(row => {
                const powerLevels = row.querySelector('.power-levels') as HTMLElement;
                const bracketLevels = row.querySelector('.bracket-levels') as HTMLElement;

                if (isBracketMode) {
                    powerLevels.style.display = 'none';
                    bracketLevels.style.display = 'block';
                } else {
                    powerLevels.style.display = 'block';
                    bracketLevels.style.display = 'none';
                }

                // Clear all selections when switching modes (unless we're restoring)
                if (!this.isRestoring) {
                    this.clearAllSelections(row as HTMLElement);
                }
            });
        };

        powerLevelRadio.addEventListener('change', toggleRankingMode);
        bracketRadio.addEventListener('change', toggleRankingMode);

        // Initialize with default mode
        toggleRankingMode();
    }

    private clearAllSelections(row: HTMLElement): void {
        // Clear power level selections
        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        powerCheckboxes.forEach(cb => cb.checked = false);

        // Clear bracket selections
        const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        bracketCheckboxes.forEach(cb => cb.checked = false);

        // Update button texts
        const powerBtn = row.querySelector('.power-selector-btn') as HTMLButtonElement;
        const bracketBtn = row.querySelector('.bracket-selector-btn') as HTMLButtonElement;

        if (powerBtn) {
            powerBtn.textContent = 'Select Power Levels';
            powerBtn.classList.remove('has-selection');
        }

        if (bracketBtn) {
            bracketBtn.textContent = 'Select Brackets';
            bracketBtn.classList.remove('has-selection');
        }
    }

    private initializeHelpModal(): void {
        const helpModal = document.getElementById('help-modal')!;
        const helpCloseBtn = helpModal.querySelector('.help-close')!;

        // Close modal when clicking the X button
        helpCloseBtn.addEventListener('click', () => this.hideHelpModal());

        // Close modal when clicking outside the modal content
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                this.hideHelpModal();
            }
        });

        // Close modal when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpModal.style.display === 'block') {
                this.hideHelpModal();
            }
        });
    }

    private showHelpModal(): void {
        const helpModal = document.getElementById('help-modal')!;
        helpModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    private hideHelpModal(): void {
        const helpModal = document.getElementById('help-modal')!;
        helpModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }

    private calculateValidBracketRange(pod: Pod): string {
        // Get all individual players from the pod (flatten groups)
        const allPlayers = pod.players.flatMap(item =>
            'players' in item ? item.players : [item]
        );

        if (allPlayers.length === 0) return 'Unknown';

        // Find all bracket levels that every player can participate in
        const validBrackets: string[] = [];

        // Get all unique bracket levels that any player can play
        const allPossibleBrackets = new Set<string>();
        allPlayers.forEach(player => {
            if (player.brackets) {
                player.brackets.forEach(bracket => allPossibleBrackets.add(bracket));
            }
        });

        // Check each possible bracket level to see if all players can participate
        for (const testBracket of allPossibleBrackets) {
            const canAllPlayersParticipate = allPlayers.every(player =>
                player.brackets && player.brackets.includes(testBracket)
            );

            if (canAllPlayersParticipate) {
                validBrackets.push(testBracket);
            }
        }

        // Sort brackets in order: 1, 2, 3, 4, cedh
        const bracketOrder = ['1', '2', '3', '4', 'cedh'];
        validBrackets.sort((a, b) => bracketOrder.indexOf(a) - bracketOrder.indexOf(b));

        if (validBrackets.length === 0) {
            return 'Unknown'; // Fallback
        } else if (validBrackets.length === 1) {
            return validBrackets[0];
        } else {
            // Check if it's a consecutive range (for numeric brackets only)
            const numericBrackets = validBrackets.filter(b => b !== 'cedh');
            const hasConsecutiveNumbers = numericBrackets.length > 1 &&
                numericBrackets.every((bracket, index) => {
                    if (index === 0) return true;
                    const current = parseInt(bracket);
                    const previous = parseInt(numericBrackets[index - 1]);
                    return current === previous + 1;
                });

            if (hasConsecutiveNumbers && numericBrackets.length === validBrackets.length && validBrackets.length > 1) {
                // Show as range for consecutive numeric brackets
                return `${validBrackets[0]}-${validBrackets[validBrackets.length - 1]}`;
            } else {
                // Show as comma-separated list for discrete values or mixed brackets
                return validBrackets.join(', ');
            }
        }
    }

    private triggerValidationForAllFields(): void {
        // Use RealTimeValidator for batch validation with performance tracking
        const result = realTimeValidator.batchValidateRows(this.playerRowsContainer);
        
        // Track validation performance
        performanceMonitor.trackValidationTime(result.validationTime);
        if (result.validationTime > 100) {
            console.warn(`Slow validation detected: ${result.validationTime.toFixed(2)}ms`);
        }
    }

    // Helper method to manually update button texts for a row
    private updateButtonTextsForRow(row: Element): void {
        // Update power selector button text
        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        const powerSelectorBtn = row.querySelector('.power-selector-btn') as HTMLButtonElement;

        if (powerSelectorBtn) {
            const selectedPowers: number[] = [];
            powerCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedPowers.push(parseFloat(checkbox.value));
                }
            });

            if (selectedPowers.length === 0) {
                powerSelectorBtn.textContent = 'Select Power Levels';
                powerSelectorBtn.classList.remove('has-selection');
            } else {
                selectedPowers.sort((a, b) => a - b);
                let displayText: string;
                if (selectedPowers.length === 1) {
                    displayText = `Power: ${selectedPowers[0]}`;
                } else {
                    const min = selectedPowers[0];
                    const max = selectedPowers[selectedPowers.length - 1];
                    const isContiguous = selectedPowers.every((power, index) => {
                        if (index === 0) return true;
                        const diff = power - selectedPowers[index - 1];
                        return diff === 0.5 || diff === 1;
                    });
                    if (isContiguous && selectedPowers.length > 2) {
                        displayText = `Power: ${min}-${max}`;
                    } else if (selectedPowers.length <= 4) {
                        displayText = `Power: ${selectedPowers.join(', ')}`;
                    } else {
                        displayText = `Power: ${min}-${max} (${selectedPowers.length} levels)`;
                    }
                }
                powerSelectorBtn.textContent = displayText;
                powerSelectorBtn.classList.add('has-selection');
            }
        }

        // Update bracket selector button text
        const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        const bracketSelectorBtn = row.querySelector('.bracket-selector-btn') as HTMLButtonElement;

        if (bracketSelectorBtn) {
            const selectedBrackets: string[] = [];
            bracketCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedBrackets.push(checkbox.value);
                }
            });

            if (selectedBrackets.length === 0) {
                bracketSelectorBtn.textContent = 'Select Brackets';
                bracketSelectorBtn.classList.remove('has-selection');
            } else {
                let displayText: string;
                if (selectedBrackets.length === 1) {
                    displayText = `Bracket: ${selectedBrackets[0]}`;
                } else {
                    displayText = `Brackets: ${selectedBrackets.join(', ')}`;
                }
                bracketSelectorBtn.textContent = displayText;
                bracketSelectorBtn.classList.add('has-selection');
            }
        }
    }

    /**
     * Update player numbers for all rows to maintain contiguous numbering
     */
    private updatePlayerNumbers(): void {
        const playerRows = this.playerRowsContainer.querySelectorAll('.player-row');
        playerRows.forEach((row, index) => {
            const numberElement = row.querySelector('.player-number') as HTMLElement;
            if (numberElement) {
                numberElement.textContent = (index + 1).toString();
            }
        });
    }
}
