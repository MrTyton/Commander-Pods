import { Player, Group, Pod } from './types.js';
import { calculatePodSizes, getLeniencySettings } from './utils.js';
import { PlayerManager } from './player-manager.js';
import { PodGenerator } from './pod-generator.js';
import { DragDropManager } from './drag-drop.js';
import { DisplayModeManager } from './display-mode.js';

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

    constructor() {
        this.playerRowsContainer = document.getElementById('player-rows')!;
        this.outputSection = document.getElementById('output-section')!;
        this.displayModeBtn = document.getElementById('display-mode-btn')!;
        this.playerRowTemplate = document.getElementById('player-row-template') as HTMLTemplateElement;

        this.playerManager = new PlayerManager();
        this.podGenerator = new PodGenerator();
        this.dragDropManager = new DragDropManager(this.playerManager, (pods, unassigned) => this.renderPods(pods, unassigned));
        this.displayModeManager = new DisplayModeManager();

        this.initializeEventListeners();
        this.initializeRankingModeToggle();
    }

    private initializeEventListeners(): void {
        const addPlayerBtn = document.getElementById('add-player-btn')!;
        const generatePodsBtn = document.getElementById('generate-pods-btn')!;
        const resetAllBtn = document.getElementById('reset-all-btn')!;
        const helpBtn = document.getElementById('help-btn')!;

        addPlayerBtn.addEventListener('click', () => this.addPlayerRow());
        generatePodsBtn.addEventListener('click', () => this.generatePods());
        resetAllBtn.addEventListener('click', () => this.resetAllWithConfirmation());
        this.displayModeBtn.addEventListener('click', () => this.displayModeManager.enterDisplayMode(this.currentPods));
        helpBtn.addEventListener('click', () => this.showHelpModal());

        // Initialize help modal event listeners
        this.initializeHelpModal();
    }

    addPlayerRow(): void {
        const clone = this.playerRowTemplate.content.cloneNode(true) as DocumentFragment;
        const newRow = clone.querySelector('.player-row') as HTMLElement;
        const playerId = this.playerManager.getNextPlayerId();
        newRow.dataset.playerId = playerId.toString();

        // Initialize power selector functionality
        const powerSelectorBtn = newRow.querySelector('.power-selector-btn') as HTMLButtonElement;
        const powerDropdown = newRow.querySelector('.power-selector-dropdown') as HTMLElement;
        const rangeButtons = newRow.querySelectorAll('.range-btn') as NodeListOf<HTMLButtonElement>;

        const updateButtonText = () => {
            const checkboxes = newRow.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const selectedPowers: number[] = [];

            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedPowers.push(parseFloat(checkbox.value));
                }
            });

            if (selectedPowers.length === 0) {
                powerSelectorBtn.textContent = 'Select Power Levels';
                powerSelectorBtn.classList.remove('has-selection');
                // Only show error if validation has been triggered (pods generation attempted)
                if (powerSelectorBtn.dataset.validationTriggered === 'true') {
                    powerSelectorBtn.classList.add('error');
                }
            } else {
                powerSelectorBtn.classList.remove('error');
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
                        return diff === 0.5 || diff === 1.0; // Allow both 0.5 and 1.0 increments
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
        };

        // Toggle dropdown visibility
        powerSelectorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = powerDropdown.style.display !== 'none';

            // Close all other dropdowns first
            document.querySelectorAll('.power-selector-dropdown').forEach(dropdown => {
                (dropdown as HTMLElement).style.display = 'none';
                dropdown.classList.remove('show');
            });
            document.querySelectorAll('.power-selector-btn').forEach(btn => {
                btn.classList.remove('open');
            });

            if (!isOpen) {
                powerDropdown.style.display = 'block';
                powerSelectorBtn.classList.add('open');
                // Trigger animation
                setTimeout(() => powerDropdown.classList.add('show'), 10);
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!powerSelectorBtn.contains(e.target as Node) && !powerDropdown.contains(e.target as Node)) {
                powerDropdown.classList.remove('show');
                powerSelectorBtn.classList.remove('open');
                setTimeout(() => {
                    if (!powerDropdown.classList.contains('show')) {
                        powerDropdown.style.display = 'none';
                    }
                }, 200);
            }
        });

        // Add change listeners to checkboxes
        const checkboxes = newRow.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateButtonText);
        });

        // Range button functionality
        rangeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const range = button.dataset.range!;

                // Clear all checkboxes first
                checkboxes.forEach(cb => cb.checked = false);

                // Select only the start and end values (no 0.5 increments)
                const [start, end] = range.split('-').map(Number);
                checkboxes.forEach(cb => {
                    const value = parseFloat(cb.value);
                    if (value === start || value === end) {
                        cb.checked = true;
                    }
                });

                updateButtonText();
            });
        });

        // Add event listener for clear button
        const clearButton = newRow.querySelector('.clear-btn')!;
        clearButton.addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateButtonText();
        });

        // Add keyboard shortcuts for power selector
        const closeDropdown = () => {
            powerDropdown.classList.remove('show');
            powerSelectorBtn.classList.remove('open');
            setTimeout(() => {
                if (!powerDropdown.classList.contains('show')) {
                    powerDropdown.style.display = 'none';
                }
            }, 200);
        };

        // Track typed sequence for decimal numbers
        let typedSequence = '';
        let sequenceTimeout: NodeJS.Timeout | null = null;

        // Global keydown listener for this dropdown
        document.addEventListener('keydown', (e) => {
            const isDropdownOpen = powerDropdown.style.display === 'block' && powerDropdown.classList.contains('show');
            const isButtonFocused = document.activeElement === powerSelectorBtn;

            // Handle keys when dropdown is open OR when the button is focused
            if (isDropdownOpen || isButtonFocused) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (isDropdownOpen) {
                        closeDropdown();
                        powerSelectorBtn.focus(); // Return focus to the button
                    }
                    typedSequence = '';
                    if (sequenceTimeout) clearTimeout(sequenceTimeout);
                } else if ((e.key >= '1' && e.key <= '9') || e.key === '.' || e.key === '0' || e.key === '-') {
                    e.preventDefault();

                    // Add to typed sequence
                    typedSequence += e.key;

                    // Clear any existing timeout
                    if (sequenceTimeout) clearTimeout(sequenceTimeout);

                    // Set timeout to process the sequence
                    sequenceTimeout = setTimeout(() => {
                        // Check if it's a range (contains dash)
                        if (typedSequence.includes('-')) {
                            const parts = typedSequence.split('-');
                            if (parts.length === 2) {
                                const startValue = parseFloat(parts[0]);
                                const endValue = parseFloat(parts[1]);

                                // Check if either part contains a decimal point
                                const includeHalfSteps = parts[0].includes('.') || parts[1].includes('.');

                                // Validate range values
                                if (!isNaN(startValue) && !isNaN(endValue) &&
                                    startValue >= 1 && startValue <= 10 &&
                                    endValue >= 1 && endValue <= 10 &&
                                    startValue <= endValue) {

                                    // Clear all checkboxes first
                                    checkboxes.forEach(cb => cb.checked = false);

                                    // Select power levels in the range
                                    checkboxes.forEach(cb => {
                                        const value = parseFloat(cb.value);
                                        if (value >= startValue && value <= endValue) {
                                            // Include this value if:
                                            // 1. It's a whole number, OR
                                            // 2. User specified decimals AND it's a .5 increment
                                            const isWholeNumber = value % 1 === 0;
                                            const isHalfStep = value % 1 === 0.5;

                                            if (isWholeNumber || (includeHalfSteps && isHalfStep)) {
                                                cb.checked = true;
                                            }
                                        }
                                    });

                                    updateButtonText();
                                    // Only close dropdown if it was already open
                                    if (isDropdownOpen) {
                                        closeDropdown();
                                    }
                                }
                            }
                        } else {
                            // Handle single value (original logic)
                            const targetValue = parseFloat(typedSequence);

                            // Validate that it's a reasonable power level (1-10, including .5 increments)
                            if (!isNaN(targetValue) && targetValue >= 1 && targetValue <= 10) {
                                // Clear all checkboxes first
                                checkboxes.forEach(cb => cb.checked = false);

                                // Find and check the matching checkbox
                                const targetCheckbox = Array.from(checkboxes).find(cb =>
                                    Math.abs(parseFloat(cb.value) - targetValue) < 0.01
                                );

                                if (targetCheckbox) {
                                    targetCheckbox.checked = true;
                                    updateButtonText();
                                    // Only close dropdown if it was already open
                                    if (isDropdownOpen) {
                                        closeDropdown();
                                    }
                                }
                            }
                        }

                        // Reset sequence
                        typedSequence = '';
                    }, 500); // Wait 500ms for more input
                }
            }
        });

        // Initialize button text
        updateButtonText();

        // Bracket selector functionality
        const bracketSelectorBtn = newRow.querySelector('.bracket-selector-btn') as HTMLButtonElement;
        const bracketDropdown = newRow.querySelector('.bracket-selector-dropdown') as HTMLElement;
        const bracketRangeButtons = newRow.querySelectorAll('.bracket-range-btn') as NodeListOf<HTMLButtonElement>;

        const updateBracketButtonText = () => {
            const bracketCheckboxes = newRow.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            const selectedBrackets: string[] = [];

            bracketCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedBrackets.push(checkbox.value);
                }
            });

            if (selectedBrackets.length === 0) {
                bracketSelectorBtn.textContent = 'Select Brackets';
                bracketSelectorBtn.classList.remove('has-selection');
                // Only show error if validation has been triggered (pods generation attempted)
                if (bracketSelectorBtn.dataset.validationTriggered === 'true') {
                    bracketSelectorBtn.classList.add('error');
                }
            } else {
                bracketSelectorBtn.classList.remove('error');
                let displayText: string;
                if (selectedBrackets.length === 1) {
                    displayText = `Bracket: ${selectedBrackets[0]}`;
                } else {
                    displayText = `Brackets: ${selectedBrackets.join(', ')}`;
                }
                bracketSelectorBtn.textContent = displayText;
                bracketSelectorBtn.classList.add('has-selection');
            }
        };

        // Toggle bracket dropdown visibility
        bracketSelectorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = bracketDropdown.style.display !== 'none';

            // Close all other dropdowns first
            document.querySelectorAll('.bracket-selector-dropdown, .power-selector-dropdown').forEach(dropdown => {
                (dropdown as HTMLElement).style.display = 'none';
                dropdown.classList.remove('show');
            });
            document.querySelectorAll('.bracket-selector-btn, .power-selector-btn').forEach(btn => {
                btn.classList.remove('open');
            });

            if (!isOpen) {
                bracketDropdown.style.display = 'block';
                bracketSelectorBtn.classList.add('open');
                setTimeout(() => bracketDropdown.classList.add('show'), 10);
            }
        });

        // Close bracket dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!bracketSelectorBtn.contains(e.target as Node) && !bracketDropdown.contains(e.target as Node)) {
                bracketDropdown.classList.remove('show');
                bracketSelectorBtn.classList.remove('open');
                setTimeout(() => {
                    if (!bracketDropdown.classList.contains('show')) {
                        bracketDropdown.style.display = 'none';
                    }
                }, 200);
            }
        });

        // Add change listeners to bracket checkboxes
        const bracketCheckboxes = newRow.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        bracketCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateBracketButtonText);
        });

        // Bracket range button functionality
        bracketRangeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const range = button.dataset.range!;

                // Clear all checkboxes first
                bracketCheckboxes.forEach(cb => cb.checked = false);

                if (range === 'cedh') {
                    // Special case for cEDH button
                    bracketCheckboxes.forEach(cb => {
                        if (cb.value === 'cedh') {
                            cb.checked = true;
                        }
                    });
                } else {
                    // Select the range brackets
                    const [start, end] = range.split('-');
                    const startNum = parseInt(start);
                    const endNum = parseInt(end);

                    bracketCheckboxes.forEach(cb => {
                        const value = cb.value;
                        if (value !== 'cedh') {
                            const num = parseInt(value);
                            if (num >= startNum && num <= endNum) {
                                cb.checked = true;
                            }
                        }
                    });
                }

                updateBracketButtonText();
            });
        });

        // Add event listener for bracket clear button
        const bracketClearButton = newRow.querySelector('.bracket-clear-btn')!;
        bracketClearButton.addEventListener('click', () => {
            bracketCheckboxes.forEach(cb => cb.checked = false);
            updateBracketButtonText();
        });

        // Bracket keyboard shortcuts
        const closeBracketDropdown = () => {
            bracketDropdown.classList.remove('show');
            bracketSelectorBtn.classList.remove('open');
            setTimeout(() => {
                if (!bracketDropdown.classList.contains('show')) {
                    bracketDropdown.style.display = 'none';
                }
            }, 200);
        };

        // Bracket keyboard handling
        document.addEventListener('keydown', (e) => {
            const isBracketDropdownOpen = bracketDropdown.style.display === 'block' && bracketDropdown.classList.contains('show');
            const isBracketButtonFocused = document.activeElement === bracketSelectorBtn;

            if (isBracketDropdownOpen || isBracketButtonFocused) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (isBracketDropdownOpen) {
                        closeBracketDropdown();
                        bracketSelectorBtn.focus();
                    }
                } else if (e.key >= '1' && e.key <= '4') {
                    e.preventDefault();
                    const targetValue = e.key;

                    // Clear all checkboxes first
                    bracketCheckboxes.forEach(cb => cb.checked = false);

                    // Find and check the matching checkbox
                    const targetCheckbox = Array.from(bracketCheckboxes).find(cb => cb.value === targetValue);
                    if (targetCheckbox) {
                        targetCheckbox.checked = true;
                        updateBracketButtonText();
                        if (isBracketDropdownOpen) {
                            closeBracketDropdown();
                        }
                    }
                } else if (e.key === '5' || e.key.toLowerCase() === 'c') {
                    e.preventDefault();

                    // Clear all checkboxes first
                    bracketCheckboxes.forEach(cb => cb.checked = false);

                    // Check cEDH
                    const cedhCheckbox = Array.from(bracketCheckboxes).find(cb => cb.value === 'cedh');
                    if (cedhCheckbox) {
                        cedhCheckbox.checked = true;
                        updateBracketButtonText();
                        if (isBracketDropdownOpen) {
                            closeBracketDropdown();
                        }
                    }
                }
            }
        });

        // Initialize bracket button text
        updateBracketButtonText();

        // Don't initialize bracket validation state for new rows

        // Add event listener for remove button
        const removeBtn = newRow.querySelector('.remove-player-btn')!;
        removeBtn.addEventListener('click', () => {
            this.playerRowsContainer.removeChild(newRow);
            this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);

            // Update player numbers after removal
            this.updatePlayerNumbers();
        });

        // Add real-time validation for player name
        const nameInput = newRow.querySelector('.player-name') as HTMLInputElement;
        nameInput.addEventListener('input', () => {
            // Mark field as touched
            nameInput.dataset.touched = 'true';

            // Real-time validation for empty names - only if touched
            const name = nameInput.value.trim();
            if (!name && nameInput.dataset.touched === 'true') {
                nameInput.classList.add('input-error');
            } else {
                nameInput.classList.remove('input-error');
            }

            // Clear duplicate errors on input
            this.clearDuplicateErrorsOnInput();
        });

        // Don't initialize validation state for new rows

        // Add event listener for group select
        const groupSelect = newRow.querySelector('.group-select') as HTMLSelectElement;
        groupSelect.addEventListener('change', () => {
            this.playerManager.handleGroupChange(this.playerRowsContainer);
        });

        this.playerRowsContainer.appendChild(newRow);
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);

        // Update player numbers for all rows
        this.updatePlayerNumbers();

        // Apply current ranking mode to the new row
        const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
        const isBracketMode = bracketRadio.checked;
        const powerLevels = newRow.querySelector('.power-levels') as HTMLElement;
        const bracketLevels = newRow.querySelector('.bracket-levels') as HTMLElement;

        if (isBracketMode) {
            powerLevels.style.display = 'none';
            bracketLevels.style.display = 'block';
        } else {
            powerLevels.style.display = 'block';
            bracketLevels.style.display = 'none';
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

        const allPlayers: Player[] = [];
        const playerRows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));
        let validationFailed = false;

        // Clear any existing name validation errors
        playerRows.forEach(row => {
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            // Remove all possible duplicate error classes
            nameInput.classList.remove('name-duplicate-error', 'name-duplicate-error-1', 'name-duplicate-error-2', 'name-duplicate-error-3', 'name-duplicate-error-4', 'name-duplicate-error-5');
        });

        for (const row of playerRows) {
            const player = this.playerManager.getPlayerFromRow(row as HTMLElement);
            if (player) {
                allPlayers.push(player);
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
        const ungroupedPlayers = allPlayers.filter(p => !groupedPlayerIds.has(p.id));

        let itemsToPod: (Player | Group)[] = [...ungroupedPlayers];
        processedGroups.forEach(group => {
            itemsToPod.push({
                id: group.id,
                players: group.players,
                averagePower: group.averagePower,
                size: group.size
            });
        });

        const totalPlayerCount = allPlayers.length;
        if (totalPlayerCount < 3) {
            alert("You need at least 3 players to form a pod.");
            return;
        }

        const podSizes = calculatePodSizes(totalPlayerCount);
        const leniencySettings = getLeniencySettings();

        // Set shuffle seed for deterministic results in tests, random in production
        // Detect if we're in a test environment by checking for Playwright-specific globals
        const isTestEnvironment = typeof window !== 'undefined' &&
            (window.location.protocol === 'file:' ||
                (window as any).__playwright !== undefined ||
                (window as any).playwright !== undefined);

        if (isTestEnvironment) {
            // Use a deterministic seed based on player names for consistent test results
            const playerNames = allPlayers.map(p => p.name).join('');
            const deterministicSeed = Array.from(playerNames).reduce((sum, char) => sum + char.charCodeAt(0), 0);
            this.podGenerator.setShuffleSeed(deterministicSeed);
        } else {
            // Use random seed in production for true randomness
            this.podGenerator.setShuffleSeed(null);
        }

        // Use backtracking algorithm for optimal pod assignment
        const result = this.podGenerator.generatePodsWithBacktracking(itemsToPod, podSizes, leniencySettings);
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

        const podsContainer = document.createElement('div');
        podsContainer.classList.add('pods-container');
        podsContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        podsContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        pods.forEach((pod, index) => {
            const podElement = document.createElement('div');
            podElement.classList.add('pod', `pod-color-${index % 10}`);
            podElement.dataset.podIndex = index.toString();

            // Make pod a drop target
            podElement.addEventListener('dragover', this.dragDropManager.handleDragOver);
            podElement.addEventListener('drop', this.dragDropManager.handleDrop);
            podElement.addEventListener('dragleave', this.dragDropManager.handleDragLeave);

            const title = document.createElement('h3');

            // Check if we're in bracket mode to display appropriate title
            const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
            const isBracketMode = bracketRadio && bracketRadio.checked;

            if (isBracketMode) {
                // In bracket mode, calculate the valid bracket range like power level mode does
                const validBracketRange = this.calculateValidBracketRange(pod);
                title.textContent = `Pod ${index + 1} (Bracket: ${validBracketRange})`;
            } else {
                title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
            }

            podElement.appendChild(title);

            const list = document.createElement('ul');
            pod.players.forEach((item, itemIndex) => {
                if ('players' in item) {
                    // It's a group
                    const groupItem = document.createElement('li');
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
                        playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
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

        this.outputSection.appendChild(podsContainer);

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
        const playerRows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));

        playerRows.forEach(row => {
            // Mark name fields as needing validation if they're empty
            const nameInput = row.querySelector('.player-name') as HTMLInputElement;
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.classList.add('input-error');
            }

            // Mark power/bracket selectors as needing validation
            const powerSelectorBtn = row.querySelector('.power-selector-btn') as HTMLButtonElement;
            const bracketSelectorBtn = row.querySelector('.bracket-selector-btn') as HTMLButtonElement;

            if (powerSelectorBtn) {
                powerSelectorBtn.dataset.validationTriggered = 'true';
            }
            if (bracketSelectorBtn) {
                bracketSelectorBtn.dataset.validationTriggered = 'true';
            }

            // Check current ranking mode and update validation accordingly
            const bracketRadio = document.getElementById('bracket-radio') as HTMLInputElement;
            const isBracketMode = bracketRadio.checked;

            if (isBracketMode) {
                // Check if brackets are selected
                const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
                const hasSelectedBrackets = Array.from(bracketCheckboxes).some(checkbox => checkbox.checked);
                if (!hasSelectedBrackets) {
                    bracketSelectorBtn.classList.add('error');
                }
            } else {
                // Check if power levels are selected
                const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
                const hasSelectedPowers = Array.from(powerCheckboxes).some(checkbox => checkbox.checked);
                if (!hasSelectedPowers) {
                    powerSelectorBtn.classList.add('error');
                }
            }
        });
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
