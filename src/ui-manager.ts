import { Player, Group, Pod } from './types.js';
import { calculatePodSizes, getLeniencySettings } from './utils.js';
import { PlayerManager } from './player-manager.js';
import { PodGenerator } from './pod-generator.js';
import { DragDropManager } from './drag-drop.js';
import { DisplayModeManager } from './display-mode.js';

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

    constructor() {
        this.playerRowsContainer = document.getElementById('player-rows')!;
        this.outputSection = document.getElementById('output-section')!;
        this.displayModeBtn = document.getElementById('display-mode-btn')!;
        this.playerRowTemplate = document.getElementById('player-row-template') as HTMLTemplateElement;

        this.playerManager = new PlayerManager();
        this.podGenerator = new PodGenerator();
        this.dragDropManager = new DragDropManager(this.playerManager, (pods) => this.renderPods(pods));
        this.displayModeManager = new DisplayModeManager();

        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        const addPlayerBtn = document.getElementById('add-player-btn')!;
        const generatePodsBtn = document.getElementById('generate-pods-btn')!;
        const resetAllBtn = document.getElementById('reset-all-btn')!;

        addPlayerBtn.addEventListener('click', () => this.addPlayerRow());
        generatePodsBtn.addEventListener('click', () => this.generatePods());
        resetAllBtn.addEventListener('click', () => this.resetAll());
        this.displayModeBtn.addEventListener('click', () => this.displayModeManager.enterDisplayMode(this.currentPods));
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
            } else {
                selectedPowers.sort((a, b) => a - b);
                let displayText: string;

                if (selectedPowers.length === 1) {
                    displayText = `Power: ${selectedPowers[0]}`;
                } else {
                    const min = selectedPowers[0];
                    const max = selectedPowers[selectedPowers.length - 1];
                    const isContiguous = selectedPowers.every((power, index) =>
                        index === 0 || power === selectedPowers[index - 1] + 0.5
                    );

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

                // Select the range
                const [start, end] = range.split('-').map(Number);
                checkboxes.forEach(cb => {
                    const value = parseFloat(cb.value);
                    if (value >= start && value <= end) {
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

        // Initialize button text
        updateButtonText();

        // Add event listener for remove button
        const removeBtn = newRow.querySelector('.remove-player-btn')!;
        removeBtn.addEventListener('click', () => {
            this.playerRowsContainer.removeChild(newRow);
            this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
        });

        // Add event listener for group select
        const groupSelect = newRow.querySelector('.group-select') as HTMLSelectElement;
        groupSelect.addEventListener('change', () => {
            this.playerManager.handleGroupChange(this.playerRowsContainer);
            this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
        });

        this.playerRowsContainer.appendChild(newRow);
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
    }

    generatePods(): void {
        this.outputSection.innerHTML = '';
        this.playerManager.handleGroupChange(this.playerRowsContainer);

        const allPlayers: Player[] = [];
        const playerRows = Array.from(this.playerRowsContainer.querySelectorAll('.player-row'));
        let validationFailed = false;

        for (const row of playerRows) {
            const player = this.playerManager.getPlayerFromRow(row as HTMLElement);
            if (player) {
                allPlayers.push(player);
            } else {
                validationFailed = true;
            }
        }

        if (validationFailed) {
            alert('Please fix the errors before generating pods.');
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

        // Use backtracking algorithm for optimal pod assignment
        const result = this.podGenerator.generatePodsWithBacktracking(itemsToPod, podSizes, leniencySettings);
        const pods = result.pods;
        let unassignedPlayers = result.unassigned;

        this.renderPods(pods, unassignedPlayers);
    }

    renderPods(pods: Pod[], unassignedPlayers: (Player | Group)[] = []): void {
        this.currentPods = [...pods]; // Store current pods for drag-and-drop
        this.dragDropManager.setCurrentPods(this.currentPods);
        this.outputSection.innerHTML = '';

        if (pods.length === 0) {
            this.outputSection.textContent = 'Could not form pods with the given players.';
            this.displayModeBtn.style.display = 'none';
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
            title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
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

                    groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const subItem = document.createElement('li');
                        subItem.textContent = `${p.name} (P: ${p.powerRange})`;
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

                    playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            podsContainer.appendChild(podElement);
        });

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

                    groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const subItem = document.createElement('li');
                        subItem.textContent = `${p.name} (P: ${p.powerRange})`;
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

                    playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    list.appendChild(playerItem);
                }
            });
            unassignedElement.appendChild(list);
            podsContainer.appendChild(unassignedElement);
        }

        this.outputSection.appendChild(podsContainer);
    }

    resetAll(): void {
        // Clear everything first
        this.playerRowsContainer.innerHTML = '';
        this.outputSection.innerHTML = '';
        this.playerManager.clearGroups();
        this.playerManager.resetPlayerIds();
        this.playerManager.resetGroupIds();
        this.currentPods = [];

        const noLeniencyRadio = document.getElementById('no-leniency-radio') as HTMLInputElement;
        noLeniencyRadio.checked = true; // Reset to no leniency by default

        // Add exactly 4 default rows to start
        for (let i = 0; i < 4; i++) {
            this.addPlayerRow();
        }
    }
}
