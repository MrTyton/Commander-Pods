"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const playerRowsContainer = document.getElementById('player-rows');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const generatePodsBtn = document.getElementById('generate-pods-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const noLeniencyRadio = document.getElementById('no-leniency-radio');
    const leniencyRadio = document.getElementById('leniency-radio');
    const superLeniencyRadio = document.getElementById('super-leniency-radio');
    const outputSection = document.getElementById('output-section');
    ;
    const playerRowTemplate = document.getElementById('player-row-template');
    let nextPlayerId = 0;
    let nextGroupId = 1;
    let groups = new Map();
    // Helper function to get current leniency settings
    const getLeniencySettings = () => {
        if (superLeniencyRadio.checked) {
            return {
                allowLeniency: true,
                allowSuperLeniency: true,
                maxTolerance: 1.0
            };
        }
        else if (leniencyRadio.checked) {
            return {
                allowLeniency: true,
                allowSuperLeniency: false,
                maxTolerance: 0.5
            };
        }
        else {
            return {
                allowLeniency: false,
                allowSuperLeniency: false,
                maxTolerance: 0.01
            };
        }
    };
    const addPlayerRow = () => {
        const newRow = playerRowTemplate.content.cloneNode(true);
        const playerRowDiv = newRow.querySelector('.player-row');
        playerRowDiv.dataset.playerId = nextPlayerId.toString();
        const removeBtn = newRow.querySelector('.remove-player-btn');
        removeBtn.addEventListener('click', () => {
            playerRowsContainer.removeChild(playerRowDiv);
            updateAllGroupDropdowns();
        });
        const groupSelect = newRow.querySelector('.group-select');
        groupSelect.addEventListener('change', handleGroupChange);
        // Add event listeners for power selector button and dropdown
        const powerSelectorBtn = newRow.querySelector('.power-selector-btn');
        const powerDropdown = newRow.querySelector('.power-selector-dropdown');
        const checkboxes = newRow.querySelectorAll('.power-checkbox input[type="checkbox"]');
        // Function to update button text based on selections
        const updateButtonText = () => {
            const selectedPowers = [];
            checkboxes.forEach(cb => {
                if (cb.checked)
                    selectedPowers.push(parseFloat(cb.value));
            });
            if (selectedPowers.length === 0) {
                powerSelectorBtn.textContent = 'Select Power Levels';
                powerSelectorBtn.classList.remove('has-selection');
            }
            else {
                selectedPowers.sort((a, b) => a - b);
                let displayText;
                if (selectedPowers.length === 1) {
                    displayText = `Power: ${selectedPowers[0]}`;
                }
                else {
                    const min = selectedPowers[0];
                    const max = selectedPowers[selectedPowers.length - 1];
                    const isContiguous = selectedPowers.every((power, index) => index === 0 || power === selectedPowers[index - 1] + 0.5);
                    if (isContiguous && selectedPowers.length > 2) {
                        displayText = `Power: ${min}-${max}`;
                    }
                    else if (selectedPowers.length <= 4) {
                        displayText = `Power: ${selectedPowers.join(', ')}`;
                    }
                    else {
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
                dropdown.style.display = 'none';
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
            if (!powerSelectorBtn.contains(e.target) && !powerDropdown.contains(e.target)) {
                powerDropdown.classList.remove('show');
                powerSelectorBtn.classList.remove('open');
                setTimeout(() => {
                    if (!powerDropdown.classList.contains('show')) {
                        powerDropdown.style.display = 'none';
                    }
                }, 200);
            }
        });
        // Update button text when checkboxes change
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateButtonText);
        });
        // Add event listeners for power range buttons
        const rangeButtons = newRow.querySelectorAll('.range-btn');
        rangeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const range = button.dataset.range;
                // Clear all first
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
        const clearButton = newRow.querySelector('.clear-btn');
        clearButton.addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateButtonText();
        });
        // Initialize button text
        updateButtonText();
        playerRowsContainer.appendChild(newRow);
        nextPlayerId++;
        updateAllGroupDropdowns();
    };
    const handleGroupChange = () => {
        groups.clear();
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));
        // Find existing group IDs to determine the next available ID
        const existingGroupIds = new Set();
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
            if (select.dataset.createdGroupId) {
                existingGroupIds.add(select.dataset.createdGroupId);
            }
            else if (select.value.startsWith('group-')) {
                existingGroupIds.add(select.value);
            }
        });
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
            if (select.value === 'new-group') {
                // Find the next available group ID
                let newGroupId = '';
                if (!select.dataset.createdGroupId) {
                    let groupNum = 1;
                    while (existingGroupIds.has(`group-${groupNum}`)) {
                        groupNum++;
                    }
                    newGroupId = `group-${groupNum}`;
                    existingGroupIds.add(newGroupId);
                    select.dataset.createdGroupId = newGroupId;
                }
                else {
                    newGroupId = select.dataset.createdGroupId;
                }
                const player = getPlayerFromRow(row);
                if (player) {
                    if (!groups.has(newGroupId))
                        groups.set(newGroupId, []);
                    groups.get(newGroupId).push(player);
                }
            }
            else if (select.value.startsWith('group-')) {
                const player = getPlayerFromRow(row);
                if (player) {
                    if (!groups.has(select.value))
                        groups.set(select.value, []);
                    groups.get(select.value).push(player);
                }
            }
        });
        updateAllGroupDropdowns();
    };
    const updateAllGroupDropdowns = () => {
        const createdGroupIds = new Set();
        const allRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));
        // First pass: find all created groups
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
            if (select.value === 'new-group' && select.dataset.createdGroupId) {
                createdGroupIds.add(select.dataset.createdGroupId);
            }
            else if (select.value.startsWith('group-')) {
                createdGroupIds.add(select.value);
            }
        });
        // Second pass: update dropdowns
        allRows.forEach(row => {
            const select = row.querySelector('.group-select');
            const currentValue = select.value;
            // Preserve "new-group" if it created a group
            const createdId = select.dataset.createdGroupId;
            const options = Array.from(select.options);
            options.forEach(opt => {
                if (opt.value.startsWith('group-')) {
                    select.remove(opt.index);
                }
            });
            createdGroupIds.forEach(id => {
                const groupNumber = id.split('-')[1];
                const option = new Option(`Group ${groupNumber}`, id);
                select.add(option);
            });
            if (createdId && createdGroupIds.has(createdId)) {
                select.value = createdId;
            }
            else {
                select.value = currentValue;
            }
        });
    };
    // Helper function to parse power level selections from checkboxes
    const parsePowerLevels = (powerCheckboxes) => {
        const selectedPowers = [];
        powerCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedPowers.push(parseFloat(checkbox.value));
            }
        });
        if (selectedPowers.length === 0) {
            return { availablePowers: [], powerRange: '', averagePower: 0 };
        }
        selectedPowers.sort((a, b) => a - b);
        // Create a display string for the power range
        let powerRange;
        if (selectedPowers.length === 1) {
            powerRange = selectedPowers[0].toString();
        }
        else {
            const min = selectedPowers[0];
            const max = selectedPowers[selectedPowers.length - 1];
            const isContiguous = selectedPowers.every((power, index) => index === 0 || power === selectedPowers[index - 1] + 0.5);
            if (isContiguous) {
                powerRange = `${min}-${max}`;
            }
            else {
                powerRange = selectedPowers.join(', ');
            }
        }
        const averagePower = selectedPowers.reduce((sum, power) => sum + power, 0) / selectedPowers.length;
        return {
            availablePowers: selectedPowers,
            powerRange,
            averagePower: Math.round(averagePower * 2) / 2
        };
    };
    const getPlayerFromRow = (row) => {
        const nameInput = row.querySelector('.player-name');
        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
        nameInput.classList.remove('input-error');
        const name = nameInput.value.trim();
        const powerData = parsePowerLevels(powerCheckboxes);
        if (!name) {
            nameInput.classList.add('input-error');
            return null;
        }
        if (powerData.availablePowers.length === 0) {
            // Add error styling to power selector button
            const powerSelectorBtn = row.querySelector('.power-selector-btn');
            powerSelectorBtn.classList.add('error');
            return null;
        }
        else {
            // Remove error styling
            const powerSelectorBtn = row.querySelector('.power-selector-btn');
            powerSelectorBtn.classList.remove('error');
        }
        return {
            id: parseInt(row.dataset.playerId),
            name,
            power: powerData.averagePower,
            availablePowers: powerData.availablePowers,
            powerRange: powerData.powerRange,
            rowElement: row
        };
    };
    const generatePods = () => {
        console.log('DEBUG: generatePods called');
        outputSection.innerHTML = '';
        handleGroupChange(); // Recalculate groups based on current selections
        const allPlayers = [];
        const playerRows = Array.from(playerRowsContainer.querySelectorAll('.player-row'));
        let validationFailed = false;
        console.log('DEBUG: Processing', playerRows.length, 'player rows');
        for (const row of playerRows) {
            const player = getPlayerFromRow(row);
            if (player) {
                console.log('DEBUG: Added player:', player.name, 'powers:', player.availablePowers);
                allPlayers.push(player);
            }
            else {
                console.log('DEBUG: Player validation failed for row');
                validationFailed = true;
            }
        }
        console.log('DEBUG: Total valid players:', allPlayers.length, 'validation failed:', validationFailed);
        if (validationFailed) {
            alert('Please fix the errors before generating pods.');
            return;
        }
        const processedGroups = new Map();
        groups.forEach((players, id) => {
            // Calculate the actual average power level for the group
            const totalPower = players.reduce((sum, player) => sum + player.power, 0);
            const averagePower = Math.round((totalPower / players.length) * 2) / 2; // Round to nearest 0.5
            console.log('DEBUG: Processing group', id, 'with players:', players.map(p => `${p.name}(${p.power})`), 'average power:', averagePower);
            processedGroups.set(id, {
                id,
                players,
                averagePower,
                size: players.length
            });
        });
        const groupedPlayerIds = new Set([...groups.values()].flat().map(p => p.id));
        const ungroupedPlayers = allPlayers.filter(p => !groupedPlayerIds.has(p.id));
        let itemsToPod = [...ungroupedPlayers];
        processedGroups.forEach(group => {
            console.log('DEBUG: Adding group to itemsToPod:', group.id, 'with', group.players.length, 'players');
            itemsToPod.push({
                id: group.id,
                players: group.players,
                averagePower: group.averagePower,
                size: group.size
            });
        });
        console.log('DEBUG: Final itemsToPod:', itemsToPod.map(item => ({
            name: 'name' in item ? item.name : `Group ${item.id.split('-')[1]}`,
            power: 'power' in item ? item.power : item.averagePower,
            size: 'size' in item ? item.size : 1,
            type: 'name' in item ? 'Player' : 'Group'
        })));
        const totalPlayerCount = allPlayers.length;
        if (totalPlayerCount < 3) {
            alert("You need at least 3 players to form a pod.");
            return;
        }
        const podSizes = calculatePodSizes(totalPlayerCount);
        // Determine leniency settings
        const leniencySettings = getLeniencySettings();
        console.log('DEBUG: About to call generatePodsWithBacktracking with', itemsToPod.length, 'items, target sizes:', podSizes);
        // Use backtracking algorithm for optimal pod assignment
        const result = generatePodsWithBacktracking(itemsToPod, podSizes, leniencySettings);
        const pods = result.pods;
        let unassignedPlayers = result.unassigned;
        console.log('DEBUG: Algorithm returned', pods.length, 'pods and', unassignedPlayers.length, 'unassigned items');
        // Use the results directly from the backtracking algorithm
        // without post-processing that could violate target pod sizes
        console.log('DEBUG: About to render - pods:', pods.length, 'unassigned:', unassignedPlayers.length);
        renderPods(pods, unassignedPlayers);
    };
    const calculatePodSizes = (n) => {
        if (n < 3)
            return [];
        if (n === 3)
            return [3];
        if (n === 4)
            return [4];
        if (n === 5)
            return [5];
        if (n === 6)
            return [3, 3];
        if (n === 7)
            return [4, 3];
        if (n === 8)
            return [4, 4];
        if (n === 9)
            return [3, 3, 3];
        if (n === 10)
            return [5, 5]; // Or [4,3,3] but 5s are often fine
        let fours = Math.floor(n / 4);
        let remainder = n % 4;
        if (remainder === 0)
            return Array(fours).fill(4);
        if (remainder === 1) {
            if (fours >= 2)
                return [...Array(fours - 2).fill(4), 5, 4]; // 4,4,1 -> 5,4
            return [3, 3, 3, 2]; // Should not happen with good logic
        }
        if (remainder === 2) {
            if (fours >= 1)
                return [...Array(fours - 1).fill(4), 3, 3]; // 4,2 -> 3,3
            return [3, 3, 3, 3]; // Should not happen
        }
        if (remainder === 3)
            return [...Array(fours).fill(4), 3];
        return []; // Fallback
    };
    const renderPods = (pods, unassignedPlayers = []) => {
        outputSection.innerHTML = '';
        if (pods.length === 0) {
            outputSection.textContent = 'Could not form pods with the given players.';
            return;
        }
        pods.forEach((pod, index) => {
            const podElement = document.createElement('div');
            podElement.classList.add('pod', `pod-color-${index % 10}`);
            const title = document.createElement('h3');
            title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
            podElement.appendChild(title);
            const list = document.createElement('ul');
            pod.players.forEach(item => {
                if ('players' in item) { // It's a Group
                    const groupItem = document.createElement('li');
                    groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const playerItem = document.createElement('li');
                        playerItem.textContent = `${p.name} (P: ${p.powerRange})`;
                        subList.appendChild(playerItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                }
                else { // It's a Player
                    const playerItem = document.createElement('li');
                    playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    list.appendChild(playerItem);
                }
            });
            podElement.appendChild(list);
            outputSection.appendChild(podElement);
        });
        // Display unassigned players if any
        if (unassignedPlayers.length > 0) {
            const unassignedElement = document.createElement('div');
            unassignedElement.classList.add('pod', 'unassigned-pod');
            unassignedElement.style.borderColor = '#ff6b6b';
            unassignedElement.style.backgroundColor = '#2a1f1f';
            const title = document.createElement('h3');
            title.textContent = 'Unassigned Players';
            title.style.color = '#ff6b6b';
            unassignedElement.appendChild(title);
            const list = document.createElement('ul');
            unassignedPlayers.forEach(item => {
                if ('players' in item) { // It's a Group
                    const groupItem = document.createElement('li');
                    groupItem.innerHTML = `<strong>Group ${item.id.split('-')[1]} (Avg Power: ${item.averagePower}):</strong>`;
                    const subList = document.createElement('ul');
                    item.players.forEach(p => {
                        const playerItem = document.createElement('li');
                        playerItem.textContent = `${p.name} (P: ${p.powerRange})`;
                        subList.appendChild(playerItem);
                    });
                    groupItem.appendChild(subList);
                    list.appendChild(groupItem);
                }
                else { // It's a Player
                    const playerItem = document.createElement('li');
                    playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
                    list.appendChild(playerItem);
                }
            });
            unassignedElement.appendChild(list);
            outputSection.appendChild(unassignedElement);
        }
    };
    const resetAll = () => {
        playerRowsContainer.innerHTML = '';
        outputSection.innerHTML = '';
        groups.clear();
        nextPlayerId = 0;
        nextGroupId = 1;
        noLeniencyRadio.checked = true; // Reset to no leniency by default
        // Add a few default rows to start
        addPlayerRow();
        addPlayerRow();
        addPlayerRow();
        addPlayerRow();
    };
    addPlayerBtn.addEventListener('click', addPlayerRow);
    generatePodsBtn.addEventListener('click', generatePods);
    resetAllBtn.addEventListener('click', resetAll);
    // Initial state
    resetAll();
    // Backtracking algorithm for optimal pod assignment with virtual player support
    const findOptimalPodAssignment = (items, targetSizes, leniencySettings) => {
        console.log('DEBUG: findOptimalPodAssignment called with', items.length, 'items');
        // Treat both groups and individuals as virtual players in the same optimization
        console.log('DEBUG: Using unified virtual player approach for all items');
        const virtualPlayerPods = optimizeVirtualPlayerAssignmentUnified(items, targetSizes, leniencySettings);
        console.log('DEBUG: findOptimalPodAssignment returning', virtualPlayerPods.length, 'pods');
        return virtualPlayerPods;
    };
    const backtrack = (remainingItems, currentPods, remainingSizes, allowLeniency, bestSolution) => {
        // Pruning: if current unassigned count already >= best, skip
        if (remainingItems.length >= bestSolution.unassignedCount) {
            return;
        }
        // Base case: no more pod sizes to try
        if (remainingSizes.length === 0) {
            if (remainingItems.length < bestSolution.unassignedCount) {
                bestSolution.pods = [...currentPods];
                bestSolution.unassignedCount = remainingItems.length;
            }
            return;
        }
        const targetSize = remainingSizes[0];
        const newRemainingSizes = remainingSizes.slice(1);
        // Get unique power levels from remaining items
        const powerLevels = [...new Set(remainingItems.map(item => 'power' in item ? item.power : item.averagePower))].sort((a, b) => b - a);
        console.log('DEBUG: Trying to fill pod of size', targetSize, 'with power levels:', powerLevels);
        // Try to form a pod with each possible power level
        for (const targetPower of powerLevels) {
            console.log('DEBUG: Trying targetPower:', targetPower);
            const validCombinations = findValidCombinations(remainingItems, targetSize, targetPower, allowLeniency);
            for (const combination of validCombinations) {
                const newRemainingItems = remainingItems.filter(item => !combination.includes(item));
                const newPod = { players: combination, power: targetPower };
                const newCurrentPods = [...currentPods, newPod];
                // Recursive backtrack
                backtrack(newRemainingItems, newCurrentPods, newRemainingSizes, allowLeniency, bestSolution);
            }
        }
        // Also try skipping this pod size (in case we can't fill it optimally)
        backtrack(remainingItems, currentPods, newRemainingSizes, allowLeniency, bestSolution);
    };
    const findValidCombinations = (items, targetSize, targetPower, allowLeniency) => {
        console.log('DEBUG: findValidCombinations called with targetSize:', targetSize, 'targetPower:', targetPower, 'allowLeniency:', allowLeniency);
        console.log('DEBUG: Available items:', items.map(item => ({
            name: 'name' in item ? item.name : `Group ${item.id.split('-')[1]}`,
            power: 'power' in item ? item.power : item.averagePower,
            size: 'size' in item ? item.size : 1
        })));
        // Filter items that match the power criteria
        const candidates = items.filter(item => {
            const itemPower = 'power' in item ? item.power : item.averagePower;
            const powerMatch = Math.abs(itemPower - targetPower) < 0.01;
            const leniencyMatch = allowLeniency && Math.abs(itemPower - targetPower) <= 0.5;
            return powerMatch || leniencyMatch;
        });
        console.log('DEBUG: Filtered candidates:', candidates.map(item => ({
            name: 'name' in item ? item.name : `Group ${item.id.split('-')[1]}`,
            power: 'power' in item ? item.power : item.averagePower,
            size: 'size' in item ? item.size : 1
        })));
        const validCombinations = [];
        generateCombinations(candidates, targetSize, [], validCombinations, allowLeniency);
        console.log('DEBUG: Generated', validCombinations.length, 'valid combinations');
        return validCombinations;
    };
    const generateCombinations = (candidates, targetSize, currentCombination, validCombinations, allowLeniency = false) => {
        const currentSize = currentCombination.reduce((sum, item) => sum + ('size' in item ? item.size : 1), 0);
        if (currentSize === targetSize) {
            // Validate that all players in the combination are compatible with each other
            if (isPodValid(currentCombination, allowLeniency)) {
                validCombinations.push([...currentCombination]);
            }
            return;
        }
        if (currentSize > targetSize) {
            return;
        }
        for (let i = 0; i < candidates.length; i++) {
            const item = candidates[i];
            const itemSize = 'size' in item ? item.size : 1;
            if (currentSize + itemSize <= targetSize) {
                const newCombination = [...currentCombination, item];
                const newCandidates = candidates.slice(i + 1); // Avoid duplicates
                generateCombinations(newCandidates, targetSize, newCombination, validCombinations, allowLeniency);
            }
        }
    };
    // Validate that all players in a pod are compatible with each other
    const isPodValid = (podPlayers, allowLeniency) => {
        if (podPlayers.length <= 1)
            return true;
        // Get representative power levels from the pod (average for groups, actual for individuals)
        const representativePowers = [];
        podPlayers.forEach(item => {
            if ('players' in item) {
                // It's a group, use its average power (already calculated)
                representativePowers.push(item.averagePower);
            }
            else {
                // It's a player, use their individual power
                representativePowers.push(item.power);
            }
        });
        // Check that all representative power levels are compatible with each other
        for (let i = 0; i < representativePowers.length; i++) {
            for (let j = i + 1; j < representativePowers.length; j++) {
                const diff = Math.abs(representativePowers[i] - representativePowers[j]);
                if (diff > 0.01 && (!allowLeniency || diff > 0.5)) {
                    return false;
                }
            }
        }
        return true;
    };
    // Enhanced pod generation with backtracking
    const generatePodsWithBacktracking = (items, targetSizes, leniencySettings) => {
        const totalPlayers = items.reduce((sum, item) => sum + ('size' in item ? item.size : 1), 0);
        // For small groups (3-5 players), just put them all in one pod
        if (totalPlayers >= 3 && totalPlayers <= 5) {
            // Find the best common power level for all players in the pod
            const allPlayersInPod = items.flatMap(item => 'players' in item ? item.players : [item]);
            const bestPower = findBestCommonPowerLevel(allPlayersInPod);
            // Only create a pod if the players are actually compatible
            if (bestPower !== null) {
                return {
                    pods: [{ players: items, power: bestPower }],
                    unassigned: []
                };
            }
            else {
                // If no compatible power level, mark as unassigned
                return { pods: [], unassigned: items };
            }
        }
        // For everything else, use the virtual player optimization
        const pods = findOptimalPodAssignment(items, targetSizes, leniencySettings);
        // Create a set of assigned item IDs (both players and groups)
        const assignedItemIds = new Set();
        for (const pod of pods) {
            for (const item of pod.players) {
                if ('players' in item) {
                    // It's a group - add the group ID
                    assignedItemIds.add(item.id);
                }
                else {
                    // It's a player - add the player ID as string
                    assignedItemIds.add(item.id.toString());
                }
            }
        }
        const unassigned = items.filter(item => {
            if ('players' in item) {
                // Group - unassigned if the group ID is not in assigned set
                return !assignedItemIds.has(item.id);
            }
            else {
                // Individual player - unassigned if player ID is not in assigned set
                return !assignedItemIds.has(item.id.toString());
            }
        });
        return { pods, unassigned };
    };
    // Helper function to create virtual players for each power level (unified for groups and individuals)
    const createVirtualPlayersUnified = (items) => {
        const virtualPlayers = [];
        for (const item of items) {
            if ('players' in item) {
                // It's a group - always create virtual players for min, max, and average
                // Groups prioritize staying together and accept power level imbalance
                console.log('DEBUG: Processing group', item.id, 'with players:', item.players.map(p => `${p.name}(${p.availablePowers.join(',')})`));
                // Get all power levels from group members
                const allGroupPowers = item.players.flatMap(p => p.availablePowers);
                const minPower = Math.min(...allGroupPowers);
                const maxPower = Math.max(...allGroupPowers);
                const avgPower = item.averagePower;
                // Create virtual players in preference order: average, min, max
                // This promotes balance while allowing flexibility
                const groupPowers = [avgPower, minPower, maxPower];
                const uniqueGroupPowers = [...new Set(groupPowers)]; // Remove duplicates
                for (const powerLevel of uniqueGroupPowers) {
                    virtualPlayers.push({ item, powerLevel });
                }
                console.log('DEBUG: Group', item.id, 'virtual powers (avg,min,max):', uniqueGroupPowers);
            }
            else {
                // It's an individual player
                for (const powerLevel of item.availablePowers) {
                    virtualPlayers.push({ item, powerLevel });
                }
            }
        }
        return virtualPlayers;
    };
    // Unified backtracking function for virtual player optimization (groups and individuals)
    const backtrackVirtualPlayersUnified = (powerGroups, currentPods, usedItemIds, remainingTargetSizes, bestSolution) => {
        // Base case: no more target sizes to fill
        if (remainingTargetSizes.length === 0) {
            if (currentPods.length > bestSolution.totalPods) {
                bestSolution.pods = [...currentPods];
                bestSolution.totalPods = currentPods.length;
            }
            return;
        }
        // Pruning: if we can't possibly beat the best solution
        if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
            return;
        }
        const targetSize = remainingTargetSizes[0];
        const newRemainingTargetSizes = remainingTargetSizes.slice(1);
        // Try each power level that has enough available items
        for (const [powerLevel, virtualItemsAtThisPower] of powerGroups) {
            const availableVirtualItems = virtualItemsAtThisPower.filter(vi => {
                const itemId = 'players' in vi.item ? vi.item.id : vi.item.id.toString();
                return !usedItemIds.has(itemId);
            });
            // Calculate total actual player count (accounting for group sizes)
            const totalActualPlayers = availableVirtualItems.reduce((sum, vi) => {
                return sum + ('players' in vi.item ? vi.item.size : 1);
            }, 0);
            console.log('DEBUG: Power level', powerLevel, 'has', availableVirtualItems.length, 'virtual items representing', totalActualPlayers, 'actual players');
            if (totalActualPlayers >= Math.max(3, targetSize)) {
                // Use simple selection instead of complex combinations
                // Try to form pods that match the target size as closely as possible
                const sortedBySize = availableVirtualItems.sort((a, b) => {
                    const aSize = 'players' in a.item ? a.item.size : 1;
                    const bSize = 'players' in b.item ? b.item.size : 1;
                    return bSize - aSize; // Larger items first to better fill target sizes
                });
                // Greedily select items to meet target size
                const selectedItems = [];
                const selectedItemIds = new Set();
                let currentSize = 0;
                for (const item of sortedBySize) {
                    const itemId = 'players' in item.item ? item.item.id : item.item.id.toString();
                    const itemSize = 'players' in item.item ? item.item.size : 1;
                    // Skip if we've already selected this item (prevents duplicate groups)
                    if (selectedItemIds.has(itemId)) {
                        continue;
                    }
                    if (currentSize + itemSize <= targetSize) {
                        selectedItems.push(item);
                        selectedItemIds.add(itemId);
                        currentSize += itemSize;
                        // If we hit the target exactly, use this combination
                        if (currentSize === targetSize) {
                            break;
                        }
                    }
                }
                // Only proceed if we have at least 3 actual players
                if (currentSize >= 3) {
                    const podItems = selectedItems.map(vi => vi.item);
                    const newPod = {
                        players: podItems,
                        power: powerLevel
                    };
                    const newUsedItemIds = new Set(usedItemIds);
                    for (const item of podItems) {
                        const itemId = 'players' in item ? item.id : item.id.toString();
                        newUsedItemIds.add(itemId);
                    }
                    // Recursive call
                    backtrackVirtualPlayersUnified(powerGroups, [...currentPods, newPod], newUsedItemIds, newRemainingTargetSizes, bestSolution);
                }
            }
        }
        // Also try skipping this target size (in case we can't fill it optimally)
        backtrackVirtualPlayersUnified(powerGroups, currentPods, usedItemIds, newRemainingTargetSizes, bestSolution);
    };
    // Leniency-aware backtracking for unified virtual players (groups and individuals)
    const backtrackVirtualPlayersWithLeniencyUnified = (virtualPlayers, targetSizes, tolerance, currentPods, usedItemIds, remainingTargetSizes, bestSolution) => {
        // Base case: no more target sizes to fill
        if (remainingTargetSizes.length === 0) {
            if (currentPods.length > bestSolution.totalPods) {
                bestSolution.pods = [...currentPods];
                bestSolution.totalPods = currentPods.length;
            }
            return;
        }
        // Pruning: if we can't possibly beat the best solution
        if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
            return;
        }
        const targetSize = remainingTargetSizes[0];
        const newRemainingTargetSizes = remainingTargetSizes.slice(1);
        // Get available virtual players
        const availableVirtualPlayers = virtualPlayers.filter(vp => {
            const itemId = 'players' in vp.item ? vp.item.id : vp.item.id.toString();
            return !usedItemIds.has(itemId);
        });
        // Get all unique power levels and try each as a base
        const uniquePowerLevels = [...new Set(availableVirtualPlayers.map(vp => vp.powerLevel))].sort((a, b) => a - b);
        for (const basePowerLevel of uniquePowerLevels) {
            // Find all virtual players compatible with this base power level
            const compatibleVirtualPlayers = availableVirtualPlayers.filter(vp => Math.abs(vp.powerLevel - basePowerLevel) <= tolerance);
            // Sort compatible virtual players to prefer group average power, then individual players
            const sortedCompatiblePlayers = compatibleVirtualPlayers.sort((a, b) => {
                // If both are groups, prefer based on power level proximity to average
                if ('players' in a.item && 'players' in b.item) {
                    const aIsAverage = Math.abs(a.powerLevel - a.item.averagePower) < 0.01;
                    const bIsAverage = Math.abs(b.powerLevel - b.item.averagePower) < 0.01;
                    if (aIsAverage && !bIsAverage)
                        return -1;
                    if (!aIsAverage && bIsAverage)
                        return 1;
                    // If both are average or both are not average, prefer the one closer to basePowerLevel
                    return Math.abs(a.powerLevel - basePowerLevel) - Math.abs(b.powerLevel - basePowerLevel);
                }
                // Prefer individual players over groups when power levels are similar
                if ('players' in a.item && !('players' in b.item))
                    return 1;
                if (!('players' in a.item) && 'players' in b.item)
                    return -1;
                // For individual players, prefer closer to base power level
                return Math.abs(a.powerLevel - basePowerLevel) - Math.abs(b.powerLevel - basePowerLevel);
            });
            // Calculate total actual player count (accounting for group sizes)
            const totalActualPlayers = sortedCompatiblePlayers.reduce((sum, vp) => {
                return sum + ('players' in vp.item ? vp.item.size : 1);
            }, 0);
            if (totalActualPlayers >= Math.max(3, targetSize)) {
                // Use greedy selection to meet target size with preference-sorted players
                const sortedBySize = sortedCompatiblePlayers.sort((a, b) => {
                    const aSize = 'players' in a.item ? a.item.size : 1;
                    const bSize = 'players' in b.item ? b.item.size : 1;
                    return bSize - aSize; // Larger items first
                });
                // Greedily select items to meet target size, preventing duplicate groups
                const selectedItems = [];
                const selectedItemIds = new Set();
                let currentSize = 0;
                for (const item of sortedBySize) {
                    const itemId = 'players' in item.item ? item.item.id : item.item.id.toString();
                    const itemSize = 'players' in item.item ? item.item.size : 1;
                    // Skip if we've already selected this item (prevents duplicate groups in same pod)
                    if (selectedItemIds.has(itemId)) {
                        continue;
                    }
                    if (currentSize + itemSize <= targetSize) {
                        selectedItems.push(item);
                        selectedItemIds.add(itemId);
                        currentSize += itemSize;
                        if (currentSize === targetSize) {
                            break;
                        }
                    }
                }
                // Only proceed if we have at least 3 actual players
                if (currentSize >= 3) {
                    const podItems = selectedItems.map(vi => vi.item);
                    // Calculate average power level for the pod
                    const avgPowerLevel = selectedItems.reduce((sum, vi) => sum + vi.powerLevel, 0) / selectedItems.length;
                    const newPod = {
                        players: podItems,
                        power: Math.round(avgPowerLevel * 2) / 2 // Round to nearest 0.5
                    };
                    const newUsedItemIds = new Set(usedItemIds);
                    for (const item of podItems) {
                        const itemId = 'players' in item ? item.id : item.id.toString();
                        newUsedItemIds.add(itemId);
                        // Also mark all other virtual players for this same item as used
                        // This prevents the same group/player from being assigned to multiple pods
                        virtualPlayers.forEach(vp => {
                            const vpItemId = 'players' in vp.item ? vp.item.id : vp.item.id.toString();
                            if (vpItemId === itemId) {
                                newUsedItemIds.add(vpItemId);
                            }
                        });
                    }
                    // Recursive call
                    backtrackVirtualPlayersWithLeniencyUnified(virtualPlayers, targetSizes, tolerance, [...currentPods, newPod], newUsedItemIds, newRemainingTargetSizes, bestSolution);
                }
            }
        }
        // Also try skipping this target size (in case we can't fill it optimally)
        backtrackVirtualPlayersWithLeniencyUnified(virtualPlayers, targetSizes, tolerance, currentPods, usedItemIds, newRemainingTargetSizes, bestSolution);
    };
    // Unified virtual player assignment for both groups and individuals
    const optimizeVirtualPlayerAssignmentUnified = (items, targetSizes, leniencySettings) => {
        if (items.length === 0)
            return [];
        const virtualPlayers = createVirtualPlayersUnified(items);
        console.log('DEBUG: Created', virtualPlayers.length, 'virtual players from', items.length, 'items');
        // Group virtual players by exact power level first
        const powerGroups = new Map();
        for (const vp of virtualPlayers) {
            if (!powerGroups.has(vp.powerLevel)) {
                powerGroups.set(vp.powerLevel, []);
            }
            powerGroups.get(vp.powerLevel).push(vp);
        }
        console.log('DEBUG: Power groups:', Array.from(powerGroups.entries()).map(([power, vps]) => `${power}: ${vps.length} items (${vps.map(vp => 'name' in vp.item ? vp.item.name : `Group ${vp.item.id.split('-')[1]}`).join(', ')})`).join('; '));
        // Use backtracking with leniency support
        const bestSolution = { pods: [], totalPods: 0 };
        if (leniencySettings.allowLeniency) {
            // Use leniency-aware backtracking with actual tolerance from settings
            backtrackVirtualPlayersWithLeniencyUnified(virtualPlayers, targetSizes, leniencySettings.maxTolerance, [], new Set(), targetSizes, bestSolution);
        }
        else {
            // Use exact power level matching
            backtrackVirtualPlayersUnified(Array.from(powerGroups.entries()), [], new Set(), targetSizes, bestSolution);
        }
        console.log('DEBUG: Virtual player backtracking found', bestSolution.totalPods, 'pods');
        return bestSolution.pods;
    };
    // Backtracking function for virtual player optimization
    const backtrackVirtualPlayers = (powerGroups, currentPods, usedPlayerIds, remainingTargetSizes, bestSolution) => {
        // Base case: no more target sizes to fill
        if (remainingTargetSizes.length === 0) {
            if (currentPods.length > bestSolution.totalPods) {
                bestSolution.pods = [...currentPods];
                bestSolution.totalPods = currentPods.length;
            }
            return;
        }
        // Pruning: if we can't possibly beat the best solution
        if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
            return;
        }
        const targetSize = remainingTargetSizes[0];
        const newRemainingTargetSizes = remainingTargetSizes.slice(1);
        // Try each power level that has enough available players
        for (const [powerLevel, virtualPlayersAtThisPower] of powerGroups) {
            const availableVirtualPlayers = virtualPlayersAtThisPower.filter(vp => !usedPlayerIds.has(vp.player.id));
            if (availableVirtualPlayers.length >= Math.max(3, targetSize)) {
                // Try different pod sizes (prefer exact target size)
                for (let podSize = Math.min(targetSize, availableVirtualPlayers.length); podSize >= 3; podSize--) {
                    const selectedVirtualPlayers = availableVirtualPlayers.slice(0, podSize);
                    const podPlayers = selectedVirtualPlayers.map(vp => vp.player);
                    const newPod = {
                        players: podPlayers,
                        power: powerLevel
                    };
                    const newUsedPlayerIds = new Set(usedPlayerIds);
                    for (const player of podPlayers) {
                        newUsedPlayerIds.add(player.id);
                    }
                    // Recursive call
                    backtrackVirtualPlayers(powerGroups, [...currentPods, newPod], newUsedPlayerIds, newRemainingTargetSizes, bestSolution);
                    // Only try the exact target size for efficiency
                    if (podSize === targetSize)
                        break;
                }
            }
        }
        // Also try skipping this target size (in case we can't fill it optimally)
        backtrackVirtualPlayers(powerGroups, currentPods, usedPlayerIds, newRemainingTargetSizes, bestSolution);
    };
    // Leniency-aware backtracking for virtual players
    const backtrackVirtualPlayersWithLeniency = (virtualPlayers, targetSizes, tolerance, currentPods, usedPlayerIds, remainingTargetSizes, bestSolution) => {
        // Base case: no more target sizes to fill
        if (remainingTargetSizes.length === 0) {
            if (currentPods.length > bestSolution.totalPods) {
                bestSolution.pods = [...currentPods];
                bestSolution.totalPods = currentPods.length;
            }
            return;
        }
        // Pruning: if we can't possibly beat the best solution
        if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
            return;
        }
        const targetSize = remainingTargetSizes[0];
        const newRemainingTargetSizes = remainingTargetSizes.slice(1);
        // Get available virtual players
        const availableVirtualPlayers = virtualPlayers.filter(vp => !usedPlayerIds.has(vp.player.id));
        // Get all unique power levels and try each as a base
        const uniquePowerLevels = [...new Set(availableVirtualPlayers.map(vp => vp.powerLevel))].sort((a, b) => a - b);
        for (const basePowerLevel of uniquePowerLevels) {
            // Find all virtual players compatible with this base power level
            const compatibleVirtualPlayers = availableVirtualPlayers.filter(vp => Math.abs(vp.powerLevel - basePowerLevel) <= tolerance);
            if (compatibleVirtualPlayers.length >= Math.max(3, targetSize)) {
                // Try different pod sizes (prefer exact target size)
                for (let podSize = Math.min(targetSize, compatibleVirtualPlayers.length); podSize >= 3; podSize--) {
                    const selectedVirtualPlayers = compatibleVirtualPlayers.slice(0, podSize);
                    const podPlayers = selectedVirtualPlayers.map(vp => vp.player);
                    // Calculate average power level for the pod
                    const avgPowerLevel = selectedVirtualPlayers.reduce((sum, vp) => sum + vp.powerLevel, 0) / selectedVirtualPlayers.length;
                    const newPod = {
                        players: podPlayers,
                        power: Math.round(avgPowerLevel * 10) / 10 // Round to 1 decimal place
                    };
                    const newUsedPlayerIds = new Set(usedPlayerIds);
                    for (const player of podPlayers) {
                        newUsedPlayerIds.add(player.id);
                    }
                    // Recursive call
                    backtrackVirtualPlayersWithLeniency(virtualPlayers, targetSizes, tolerance, [...currentPods, newPod], newUsedPlayerIds, newRemainingTargetSizes, bestSolution);
                    // Only try the exact target size for efficiency
                    if (podSize === targetSize)
                        break;
                }
            }
        }
        // Also try skipping this target size (in case we can't fill it optimally)
        backtrackVirtualPlayersWithLeniency(virtualPlayers, targetSizes, tolerance, currentPods, usedPlayerIds, newRemainingTargetSizes, bestSolution);
    };
    // Helper function to check if two players have compatible power levels
    const arePlayersCompatible = (player1, player2, leniencySettings) => {
        // Check for direct overlap in available powers
        const directOverlap = player1.availablePowers.some(power1 => player2.availablePowers.some(power2 => Math.abs(power1 - power2) < 0.01));
        if (directOverlap)
            return true;
        // Check for overlap within leniency tolerance
        if (leniencySettings.allowLeniency) {
            return player1.availablePowers.some(power1 => player2.availablePowers.some(power2 => Math.abs(power1 - power2) <= leniencySettings.maxTolerance));
        }
        return false;
    };
    // Helper function to find all common power levels for a group of players
    const findAllCommonPowers = (players, leniencySettings) => {
        if (players.length === 0)
            return [];
        const allPowers = [...new Set(players.flatMap(p => p.availablePowers))].sort((a, b) => a - b);
        return allPowers.filter(power => {
            return players.every(player => {
                return player.availablePowers.some(availPower => {
                    const diff = Math.abs(availPower - power);
                    return diff < 0.01 || (leniencySettings.allowLeniency && diff <= leniencySettings.maxTolerance);
                });
            });
        });
    };
    // Helper function to find the best common power level for a group of players
    const findBestCommonPowerLevel = (players) => {
        if (players.length === 0)
            return 5; // fallback
        // Find the most common power level across all players
        const powerCounts = new Map();
        for (const player of players) {
            for (const power of player.availablePowers) {
                powerCounts.set(power, (powerCounts.get(power) || 0) + 1);
            }
        }
        // Return the power level that appears most frequently
        let bestPower = players[0].availablePowers[0]; // fallback
        let maxCount = 0;
        for (const [power, count] of powerCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                bestPower = power;
            }
        }
        return bestPower;
    };
});
