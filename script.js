"use strict";
(() => {
  // src/utils.ts
  function calculatePodSizes(n) {
    if (n < 3) return [];
    if (n === 3) return [3];
    if (n === 4) return [4];
    if (n === 5) return [5];
    if (n === 6) return [3, 3];
    if (n === 7) return [4, 3];
    if (n === 8) return [4, 4];
    if (n === 9) return [3, 3, 3];
    if (n === 10) return [5, 5];
    let fours = Math.floor(n / 4);
    let remainder = n % 4;
    if (remainder === 0) return Array(fours).fill(4);
    if (remainder === 1) {
      if (fours >= 2) return [...Array(fours - 2).fill(4), 5, 4];
      return [3, 3, 3, 2];
    }
    if (remainder === 2) {
      if (fours >= 1) return [...Array(fours - 1).fill(4), 3, 3];
      return [3, 3, 3, 3];
    }
    if (remainder === 3) return [...Array(fours).fill(4), 3];
    return [];
  }
  function getLeniencySettings() {
    const bracketRadio = document.getElementById("bracket-radio");
    if (bracketRadio && bracketRadio.checked) {
      return {
        allowLeniency: false,
        allowSuperLeniency: false,
        maxTolerance: 0
      };
    }
    const noLeniencyRadio = document.getElementById("no-leniency-radio");
    const leniencyRadio = document.getElementById("leniency-radio");
    const superLeniencyRadio = document.getElementById("super-leniency-radio");
    if (superLeniencyRadio.checked) {
      return {
        allowLeniency: true,
        allowSuperLeniency: true,
        maxTolerance: 1
      };
    } else if (leniencyRadio.checked) {
      return {
        allowLeniency: true,
        allowSuperLeniency: false,
        maxTolerance: 0.5
      };
    } else {
      return {
        allowLeniency: false,
        allowSuperLeniency: false,
        maxTolerance: 0
      };
    }
  }
  function parsePowerLevels(powerCheckboxes) {
    const selectedPowers = [];
    powerCheckboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        const power = parseFloat(checkbox.value);
        if (!isNaN(power)) {
          selectedPowers.push(power);
        }
      }
    });
    if (selectedPowers.length === 0) {
      return {
        availablePowers: [],
        powerRange: "",
        averagePower: 0
      };
    }
    selectedPowers.sort((a, b) => a - b);
    let powerRange;
    if (selectedPowers.length === 1) {
      powerRange = selectedPowers[0].toString();
    } else {
      powerRange = selectedPowers.join(", ");
    }
    const averagePower = selectedPowers.reduce((sum, power) => sum + power, 0) / selectedPowers.length;
    return {
      availablePowers: selectedPowers,
      powerRange,
      averagePower: Math.round(averagePower * 2) / 2
    };
  }

  // src/player-manager.ts
  var PlayerManager = class {
    constructor() {
      this.groups = /* @__PURE__ */ new Map();
      this.nextPlayerId = 0;
      this.nextGroupId = 1;
      this.availableColors = [];
      this.groupColorAssignments = /* @__PURE__ */ new Map();
      this.initializeAvailableColors();
    }
    initializeAvailableColors() {
      this.availableColors = Array.from({ length: 50 }, (_, i) => i + 1);
      this.shuffleArray(this.availableColors);
    }
    shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
    assignRandomColor(groupId) {
      if (this.groupColorAssignments.has(groupId)) {
        return this.groupColorAssignments.get(groupId);
      }
      if (this.availableColors.length === 0) {
        this.initializeAvailableColors();
      }
      const colorNumber = this.availableColors.pop();
      this.groupColorAssignments.set(groupId, colorNumber);
      return colorNumber;
    }
    releaseColor(groupId) {
      const colorNumber = this.groupColorAssignments.get(groupId);
      if (colorNumber) {
        this.availableColors.push(colorNumber);
        this.groupColorAssignments.delete(groupId);
      }
    }
    getNextPlayerId() {
      return this.nextPlayerId++;
    }
    resetPlayerIds() {
      this.nextPlayerId = 0;
    }
    getNextGroupId() {
      const existingGroupNumbers = /* @__PURE__ */ new Set();
      const groupSelects = document.querySelectorAll(".group-select");
      groupSelects.forEach((select) => {
        if (select.value.startsWith("group-")) {
          const groupNumber = parseInt(select.value.split("-")[1]);
          if (!isNaN(groupNumber)) {
            existingGroupNumbers.add(groupNumber);
          }
        }
        if (select.value === "new-group" && select.dataset.createdGroupId && select.dataset.createdGroupId.startsWith("group-")) {
          const groupNumber = parseInt(select.dataset.createdGroupId.split("-")[1]);
          if (!isNaN(groupNumber)) {
            existingGroupNumbers.add(groupNumber);
          }
        }
      });
      for (let i = 1; i <= 50; i++) {
        if (!existingGroupNumbers.has(i)) {
          return i;
        }
      }
      return this.nextGroupId++;
    }
    resetGroupIds() {
      this.nextGroupId = 1;
    }
    getGroups() {
      return this.groups;
    }
    clearGroups() {
      this.groups.clear();
    }
    getPlayerFromRow(row) {
      const nameInput = row.querySelector(".player-name");
      nameInput.classList.remove("input-error");
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.classList.add("input-error");
        return null;
      }
      const bracketRadio = document.getElementById("bracket-radio");
      const isBracketMode = bracketRadio.checked;
      if (isBracketMode) {
        const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
        const selectedBrackets = [];
        bracketCheckboxes.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedBrackets.push(checkbox.value);
          }
        });
        if (selectedBrackets.length === 0) {
          const bracketSelectorBtn = row.querySelector(".bracket-selector-btn");
          bracketSelectorBtn.classList.add("error");
          return null;
        } else {
          const bracketSelectorBtn = row.querySelector(".bracket-selector-btn");
          bracketSelectorBtn.classList.remove("error");
        }
        const bracketToPowerMap = {
          "1": 1,
          "2": 2,
          "3": 3,
          "4": 4,
          "cedh": 10
        };
        const availablePowers = selectedBrackets.map((bracket) => bracketToPowerMap[bracket]);
        const averagePower = availablePowers.reduce((sum, power) => sum + power, 0) / availablePowers.length;
        return {
          id: parseInt(row.dataset.playerId),
          name,
          power: Math.round(averagePower * 2) / 2,
          // Round to nearest 0.5
          availablePowers,
          powerRange: selectedBrackets.join(", "),
          brackets: selectedBrackets,
          bracketRange: selectedBrackets.join(", "),
          rowElement: row
        };
      } else {
        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
        const powerData = parsePowerLevels(powerCheckboxes);
        if (powerData.availablePowers.length === 0) {
          const powerSelectorBtn = row.querySelector(".power-selector-btn");
          powerSelectorBtn.classList.add("error");
          return null;
        } else {
          const powerSelectorBtn = row.querySelector(".power-selector-btn");
          powerSelectorBtn.classList.remove("error");
        }
        return {
          id: parseInt(row.dataset.playerId),
          name,
          power: powerData.averagePower,
          availablePowers: powerData.availablePowers,
          powerRange: powerData.powerRange,
          rowElement: row
        };
      }
    }
    handleGroupChange(playerRowsContainer) {
      this.groups.clear();
      const allRows = Array.from(playerRowsContainer.querySelectorAll(".player-row"));
      allRows.forEach((row) => {
        for (let i = 1; i <= 50; i++) {
          const groupSelect = row.querySelector(".group-select");
          groupSelect.classList.remove(`group-${i}`);
        }
      });
      const existingGroupIds = /* @__PURE__ */ new Set();
      allRows.forEach((row) => {
        const select = row.querySelector(".group-select");
        if (select.dataset.createdGroupId) {
          existingGroupIds.add(select.dataset.createdGroupId);
        } else if (select.value.startsWith("group-")) {
          existingGroupIds.add(select.value);
        }
      });
      allRows.forEach((row) => {
        const select = row.querySelector(".group-select");
        let groupId = "";
        if (select.value === "new-group") {
          if (!select.dataset.createdGroupId) {
            const groupNum = this.getNextGroupId();
            groupId = `group-${groupNum}`;
            existingGroupIds.add(groupId);
            select.dataset.createdGroupId = groupId;
          } else {
            groupId = select.dataset.createdGroupId;
          }
          const player = this.getPlayerFromRow(row);
          if (player) {
            if (!this.groups.has(groupId)) this.groups.set(groupId, []);
            this.groups.get(groupId).push(player);
          }
        } else if (select.value.startsWith("group-")) {
          groupId = select.value;
          const player = this.getPlayerFromRow(row);
          if (player) {
            if (!this.groups.has(select.value)) this.groups.set(select.value, []);
            this.groups.get(select.value).push(player);
          }
        } else {
          if (select.dataset.createdGroupId) {
            delete select.dataset.createdGroupId;
          }
        }
        if (groupId) {
          const groupNumber = parseInt(groupId.split("-")[1]);
          if (groupNumber >= 1 && groupNumber <= 50) {
            select.classList.add(`group-${groupNumber}`);
          }
        }
      });
      this.cleanupUnusedGroups(existingGroupIds);
      this.updateAllGroupDropdowns(playerRowsContainer);
    }
    updateAllGroupDropdowns(playerRowsContainer) {
      const createdGroupIds = /* @__PURE__ */ new Set();
      const allRows = Array.from(playerRowsContainer.querySelectorAll(".player-row"));
      allRows.forEach((row) => {
        const select = row.querySelector(".group-select");
        if (select.value === "new-group" && select.dataset.createdGroupId) {
          createdGroupIds.add(select.dataset.createdGroupId);
        } else if (select.value.startsWith("group-")) {
          createdGroupIds.add(select.value);
        }
      });
      allRows.forEach((row) => {
        const select = row.querySelector(".group-select");
        const currentValue = select.value;
        const createdId = select.dataset.createdGroupId;
        const options = Array.from(select.options);
        options.forEach((opt) => {
          if (opt.value.startsWith("group-")) {
            select.remove(opt.index);
          }
        });
        createdGroupIds.forEach((id) => {
          const groupNumber = id.split("-")[1];
          const option = new Option(`Group ${groupNumber}`, id);
          select.add(option);
        });
        if (createdId && createdGroupIds.has(createdId) && (currentValue === "new-group" || currentValue === "no-group")) {
          select.value = createdId;
          const groupNumber = parseInt(createdId.split("-")[1]);
          if (groupNumber >= 1 && groupNumber <= 50) {
            select.classList.add(`group-${groupNumber}`);
          }
        } else if (currentValue.startsWith("group-") && createdGroupIds.has(currentValue)) {
          select.value = currentValue;
          const groupNumber = parseInt(currentValue.split("-")[1]);
          if (groupNumber >= 1 && groupNumber <= 50) {
            select.classList.add(`group-${groupNumber}`);
          }
        } else {
          select.value = "no-group";
          for (let i = 1; i <= 50; i++) {
            select.classList.remove(`group-${i}`);
          }
        }
      });
    }
    arePlayersCompatible(player1, player2, leniencySettings) {
      const directOverlap = player1.availablePowers.some(
        (power1) => player2.availablePowers.some((power2) => Math.abs(power1 - power2) < 0.01)
      );
      if (directOverlap) return true;
      if (leniencySettings.allowLeniency) {
        return player1.availablePowers.some(
          (power1) => player2.availablePowers.some(
            (power2) => Math.abs(power1 - power2) <= leniencySettings.maxTolerance
          )
        );
      }
      return false;
    }
    findAllCommonPowers(players, leniencySettings) {
      if (players.length === 0) return [];
      const allPowers = [...new Set(players.flatMap((p) => p.availablePowers))].sort((a, b) => a - b);
      return allPowers.filter((power) => {
        return players.every((player) => {
          return player.availablePowers.some((availPower) => {
            const diff = Math.abs(availPower - power);
            return diff < 0.01 || leniencySettings.allowLeniency && diff <= leniencySettings.maxTolerance;
          });
        });
      });
    }
    findBestCommonPowerLevel(players) {
      if (players.length === 0) return null;
      const powerCounts = /* @__PURE__ */ new Map();
      for (const player of players) {
        for (const power of player.availablePowers) {
          powerCounts.set(power, (powerCounts.get(power) || 0) + 1);
        }
      }
      if (powerCounts.size === 0) return null;
      let bestPower = players[0].availablePowers[0];
      let maxCount = 0;
      for (const [power, count] of powerCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestPower = power;
        }
      }
      return bestPower;
    }
    calculatePodPower(items) {
      if (items.length === 0) return 0;
      const totalPower = items.reduce((sum, item) => {
        if ("players" in item) {
          return sum + item.averagePower;
        } else {
          const powerValues = item.powerRange.split(",").map((p) => parseFloat(p.trim()));
          const avgPower = powerValues.reduce((s, p) => s + p, 0) / powerValues.length;
          return sum + avgPower;
        }
      }, 0);
      return Math.round(totalPower / items.length * 10) / 10;
    }
    cleanupUnusedGroups(activeGroupIds) {
      const assignedGroups = Array.from(this.groupColorAssignments.keys());
      assignedGroups.forEach((groupId) => {
        if (!activeGroupIds.has(groupId)) {
          this.releaseColor(groupId);
        }
      });
      const existingGroups = Array.from(this.groups.keys());
      existingGroups.forEach((groupId) => {
        if (!activeGroupIds.has(groupId)) {
          this.groups.delete(groupId);
        }
      });
      const groupSelects = document.querySelectorAll(".group-select");
      groupSelects.forEach((select) => {
        const createdId = select.dataset.createdGroupId;
        if (createdId && !activeGroupIds.has(createdId)) {
          delete select.dataset.createdGroupId;
        }
      });
    }
  };

  // src/pod-generator.ts
  var PodGenerator = class {
    constructor() {
      this.shuffleSeed = null;
    }
    /**
     * Set a seed for deterministic shuffling. Used primarily for testing.
     * If null (default), uses random shuffling for production use.
     */
    setShuffleSeed(seed) {
      this.shuffleSeed = seed;
    }
    /**
     * Seeded random number generator using Linear Congruential Generator
     * This ensures reproducible results when a seed is set
     */
    seededRandom(seed) {
      let current = seed;
      return () => {
        current = current * 1103515245 + 12345 & 2147483647;
        return current / 2147483647;
      };
    }
    /**
     * Fisher-Yates shuffle with optional seeding for deterministic results
     */
    shuffleArray(array) {
      const shuffled = [...array];
      let random;
      if (this.shuffleSeed !== null) {
        random = this.seededRandom(this.shuffleSeed);
      } else {
        random = Math.random;
      }
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    generatePodsWithBacktracking(items, targetSizes, leniencySettings) {
      const shuffledItems = this.shuffleArray(items);
      const totalPlayers = shuffledItems.reduce((sum, item) => sum + ("size" in item ? item.size : 1), 0);
      if (totalPlayers >= 3 && totalPlayers <= 5) {
        const allPlayersInPod = shuffledItems.flatMap(
          (item) => "players" in item ? item.players : [item]
        );
        const bestPower = this.findBestCommonPowerLevel(allPlayersInPod);
        if (bestPower !== null) {
          return {
            pods: [{ players: shuffledItems, power: bestPower }],
            unassigned: []
          };
        } else {
          return { pods: [], unassigned: shuffledItems };
        }
      }
      const pods = this.findOptimalPodAssignment(shuffledItems, targetSizes, leniencySettings);
      const assignedItemIds = /* @__PURE__ */ new Set();
      for (const pod of pods) {
        for (const item of pod.players) {
          if ("players" in item) {
            assignedItemIds.add(item.id);
          } else {
            assignedItemIds.add(item.id.toString());
          }
        }
      }
      const unassigned = shuffledItems.filter((item) => {
        if ("players" in item) {
          return !assignedItemIds.has(item.id);
        } else {
          return !assignedItemIds.has(item.id.toString());
        }
      });
      return { pods, unassigned };
    }
    findOptimalPodAssignment(items, targetSizes, leniencySettings) {
      const virtualPlayerPods = this.optimizeVirtualPlayerAssignmentUnified(items, targetSizes, leniencySettings);
      return virtualPlayerPods;
    }
    optimizeVirtualPlayerAssignmentUnified(items, targetSizes, leniencySettings) {
      if (items.length === 0) return [];
      const virtualPlayers = this.createVirtualPlayersUnified(items);
      const powerGroups = /* @__PURE__ */ new Map();
      for (const vp of virtualPlayers) {
        if (!powerGroups.has(vp.powerLevel)) {
          powerGroups.set(vp.powerLevel, []);
        }
        powerGroups.get(vp.powerLevel).push(vp);
      }
      const bestSolution = { pods: [], totalPods: 0 };
      if (leniencySettings.allowLeniency) {
        this.backtrackVirtualPlayersWithLeniencyUnified(
          virtualPlayers,
          targetSizes,
          leniencySettings.maxTolerance,
          [],
          /* @__PURE__ */ new Set(),
          targetSizes,
          bestSolution
        );
      } else {
        this.backtrackVirtualPlayersUnified(
          Array.from(powerGroups.entries()),
          [],
          /* @__PURE__ */ new Set(),
          targetSizes,
          bestSolution
        );
      }
      return bestSolution.pods;
    }
    createVirtualPlayersUnified(items) {
      const virtualPlayers = [];
      for (const item of items) {
        if ("players" in item) {
          const allGroupPowers = item.players.flatMap((p) => p.availablePowers);
          const minPower = Math.min(...allGroupPowers);
          const maxPower = Math.max(...allGroupPowers);
          const avgPower = item.averagePower;
          const groupPowers = [avgPower, minPower, maxPower];
          const uniqueGroupPowers = [...new Set(groupPowers)];
          for (const powerLevel of uniqueGroupPowers) {
            virtualPlayers.push({ item, powerLevel });
          }
        } else {
          for (const powerLevel of item.availablePowers) {
            virtualPlayers.push({ item, powerLevel });
          }
        }
      }
      return virtualPlayers;
    }
    backtrackVirtualPlayersUnified(powerGroups, currentPods, usedItemIds, remainingTargetSizes, bestSolution) {
      if (remainingTargetSizes.length === 0) {
        if (currentPods.length > bestSolution.totalPods) {
          bestSolution.pods = [...currentPods];
          bestSolution.totalPods = currentPods.length;
        }
        return;
      }
      if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
        return;
      }
      const targetSize = remainingTargetSizes[0];
      const newRemainingTargetSizes = remainingTargetSizes.slice(1);
      for (const [powerLevel, virtualItemsAtThisPower] of powerGroups) {
        const availableVirtualItems = virtualItemsAtThisPower.filter((vi) => {
          const itemId = "players" in vi.item ? vi.item.id : vi.item.id.toString();
          return !usedItemIds.has(itemId);
        });
        const totalActualPlayers = availableVirtualItems.reduce((sum, vi) => {
          return sum + ("players" in vi.item ? vi.item.size : 1);
        }, 0);
        if (totalActualPlayers >= Math.max(3, targetSize)) {
          const sortedBySize = availableVirtualItems.sort((a, b) => {
            const aSize = "players" in a.item ? a.item.size : 1;
            const bSize = "players" in b.item ? b.item.size : 1;
            return bSize - aSize;
          });
          const selectedItems = [];
          const selectedItemIds = /* @__PURE__ */ new Set();
          let currentSize = 0;
          for (const item of sortedBySize) {
            const itemId = "players" in item.item ? item.item.id : item.item.id.toString();
            const itemSize = "players" in item.item ? item.item.size : 1;
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
          if (currentSize >= 3) {
            const podItems = selectedItems.map((vi) => vi.item);
            const newPod = {
              players: podItems,
              power: powerLevel
            };
            const newUsedItemIds = new Set(usedItemIds);
            for (const item of podItems) {
              const itemId = "players" in item ? item.id : item.id.toString();
              newUsedItemIds.add(itemId);
            }
            this.backtrackVirtualPlayersUnified(
              powerGroups,
              [...currentPods, newPod],
              newUsedItemIds,
              newRemainingTargetSizes,
              bestSolution
            );
          }
        }
      }
      this.backtrackVirtualPlayersUnified(
        powerGroups,
        currentPods,
        usedItemIds,
        newRemainingTargetSizes,
        bestSolution
      );
    }
    backtrackVirtualPlayersWithLeniencyUnified(virtualPlayers, targetSizes, tolerance, currentPods, usedItemIds, remainingTargetSizes, bestSolution) {
      if (remainingTargetSizes.length === 0) {
        if (currentPods.length > bestSolution.totalPods) {
          bestSolution.pods = [...currentPods];
          bestSolution.totalPods = currentPods.length;
        }
        return;
      }
      if (currentPods.length + remainingTargetSizes.length <= bestSolution.totalPods) {
        return;
      }
      const targetSize = remainingTargetSizes[0];
      const newRemainingTargetSizes = remainingTargetSizes.slice(1);
      const availableVirtualPlayers = virtualPlayers.filter((vp) => {
        const itemId = "players" in vp.item ? vp.item.id : vp.item.id.toString();
        return !usedItemIds.has(itemId);
      });
      const uniquePowerLevels = [...new Set(availableVirtualPlayers.map((vp) => vp.powerLevel))].sort((a, b) => a - b);
      for (const basePowerLevel of uniquePowerLevels) {
        const compatibleVirtualPlayers = availableVirtualPlayers.filter((vp) => {
          if (!("players" in vp.item)) {
            return Math.abs(vp.powerLevel - basePowerLevel) <= tolerance;
          }
          return Math.abs(vp.powerLevel - basePowerLevel) <= tolerance;
        });
        const deduplicatedPlayers = /* @__PURE__ */ new Map();
        for (const vp of compatibleVirtualPlayers) {
          const itemId = "players" in vp.item ? vp.item.id : vp.item.id.toString();
          if (!deduplicatedPlayers.has(itemId)) {
            deduplicatedPlayers.set(itemId, vp);
          } else {
            const existing = deduplicatedPlayers.get(itemId);
            const existingDistance = Math.abs(existing.powerLevel - basePowerLevel);
            const newDistance = Math.abs(vp.powerLevel - basePowerLevel);
            if (newDistance < existingDistance) {
              deduplicatedPlayers.set(itemId, vp);
            }
          }
        }
        const uniqueCompatiblePlayers = Array.from(deduplicatedPlayers.values());
        const sortedCompatiblePlayers = uniqueCompatiblePlayers.sort((a, b) => {
          if ("players" in a.item && "players" in b.item) {
            const aIsAverage = Math.abs(a.powerLevel - a.item.averagePower) < 0.01;
            const bIsAverage = Math.abs(b.powerLevel - b.item.averagePower) < 0.01;
            if (aIsAverage && !bIsAverage) return -1;
            if (!aIsAverage && bIsAverage) return 1;
            return Math.abs(a.powerLevel - basePowerLevel) - Math.abs(b.powerLevel - basePowerLevel);
          }
          if ("players" in a.item && !("players" in b.item)) return 1;
          if (!("players" in a.item) && "players" in b.item) return -1;
          return Math.abs(a.powerLevel - basePowerLevel) - Math.abs(b.powerLevel - basePowerLevel);
        });
        const totalActualPlayers = sortedCompatiblePlayers.reduce((sum, vp) => {
          return sum + ("players" in vp.item ? vp.item.size : 1);
        }, 0);
        if (totalActualPlayers >= Math.max(3, targetSize)) {
          const sortedBySize = sortedCompatiblePlayers.sort((a, b) => {
            const aSize = "players" in a.item ? a.item.size : 1;
            const bSize = "players" in b.item ? b.item.size : 1;
            return bSize - aSize;
          });
          const selectedItems = [];
          const selectedItemIds = /* @__PURE__ */ new Set();
          let currentSize = 0;
          for (const item of sortedBySize) {
            const itemId = "players" in item.item ? item.item.id : item.item.id.toString();
            const itemSize = "players" in item.item ? item.item.size : 1;
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
          if (currentSize >= 3) {
            const podItems = selectedItems.map((vi) => vi.item);
            if (!this.isPodPowerSpreadValid(selectedItems, tolerance)) {
              continue;
            }
            const avgPowerLevel = selectedItems.reduce((sum, vi) => sum + vi.powerLevel, 0) / selectedItems.length;
            const newPod = {
              players: podItems,
              power: Math.round(avgPowerLevel * 2) / 2
              // Round to nearest 0.5
            };
            const newUsedItemIds = new Set(usedItemIds);
            for (const item of podItems) {
              const itemId = "players" in item ? item.id : item.id.toString();
              newUsedItemIds.add(itemId);
              virtualPlayers.forEach((vp) => {
                const vpItemId = "players" in vp.item ? vp.item.id : vp.item.id.toString();
                if (vpItemId === itemId) {
                  newUsedItemIds.add(vpItemId);
                }
              });
            }
            this.backtrackVirtualPlayersWithLeniencyUnified(
              virtualPlayers,
              targetSizes,
              tolerance,
              [...currentPods, newPod],
              newUsedItemIds,
              newRemainingTargetSizes,
              bestSolution
            );
          }
        }
      }
      this.backtrackVirtualPlayersWithLeniencyUnified(
        virtualPlayers,
        targetSizes,
        tolerance,
        currentPods,
        usedItemIds,
        newRemainingTargetSizes,
        bestSolution
      );
    }
    /**
     * Validates that the power level spread in a pod doesn't exceed the leniency tolerance.
     * With leniency, the maximum spread should equal the tolerance (not 2×).
     * This ensures that all players in the pod are within a reasonable range of each other.
     */
    isPodPowerSpreadValid(selectedItems, tolerance) {
      if (selectedItems.length === 0) return true;
      const powerLevels = selectedItems.map((vi) => vi.powerLevel);
      const minPower = Math.min(...powerLevels);
      const maxPower = Math.max(...powerLevels);
      const spread = maxPower - minPower;
      return spread <= tolerance;
    }
    findBestCommonPowerLevel(players) {
      if (players.length === 0) return null;
      const powerCounts = /* @__PURE__ */ new Map();
      for (const player of players) {
        for (const power of player.availablePowers) {
          powerCounts.set(power, (powerCounts.get(power) || 0) + 1);
        }
      }
      if (powerCounts.size === 0) return null;
      let bestPower = players[0].availablePowers[0];
      let maxCount = 0;
      for (const [power, count] of powerCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestPower = power;
        }
      }
      return bestPower;
    }
  };

  // src/drag-drop.ts
  var DragDropManager = class {
    constructor(playerManager, onPodsChanged) {
      this.draggedElement = null;
      this.draggedItemData = null;
      this.currentPods = [];
      this.currentUnassigned = [];
      this.handleDragStart = (e) => {
        const target = e.target;
        this.draggedElement = target;
        target.classList.add("dragging");
        this.draggedItemData = {
          type: target.dataset.itemType,
          id: target.dataset.itemId,
          podIndex: target.dataset.podIndex,
          itemIndex: target.dataset.itemIndex
        };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", target.outerHTML);
      };
      this.handleDragEnd = (e) => {
        const target = e.target;
        target.classList.remove("dragging");
        this.draggedElement = null;
        this.draggedItemData = null;
      };
      this.handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const target = e.currentTarget;
        target.classList.add("drag-over");
      };
      this.handleDragLeave = (e) => {
        const target = e.currentTarget;
        target.classList.remove("drag-over");
      };
      this.handleDrop = (e) => {
        e.preventDefault();
        const target = e.currentTarget;
        target.classList.remove("drag-over");
        if (!this.draggedItemData) return;
        const targetPodIndex = target.dataset.podIndex;
        const sourcePodIndex = this.draggedItemData.podIndex;
        if (targetPodIndex === sourcePodIndex) return;
        this.moveItemBetweenPods(this.draggedItemData, targetPodIndex);
      };
      this.playerManager = playerManager;
      this.onPodsChanged = onPodsChanged;
    }
    setCurrentPods(pods, unassigned = []) {
      this.currentPods = [...pods];
      this.currentUnassigned = [...unassigned];
    }
    moveItemBetweenPods(itemData, targetPodIndex) {
      const sourcePodIndex = itemData.podIndex;
      const itemIndex = parseInt(itemData.itemIndex);
      let itemToMove = null;
      if (sourcePodIndex === "unassigned") {
        itemToMove = this.currentUnassigned[itemIndex];
        this.currentUnassigned.splice(itemIndex, 1);
      } else {
        const sourcePod = this.currentPods[parseInt(sourcePodIndex)];
        itemToMove = sourcePod.players[itemIndex];
        sourcePod.players.splice(itemIndex, 1);
        sourcePod.power = this.playerManager.calculatePodPower(sourcePod.players);
      }
      if (!itemToMove) return;
      if (targetPodIndex === "unassigned") {
        this.currentUnassigned.push(itemToMove);
      } else if (targetPodIndex === "new-pod") {
        const newPod = {
          players: [itemToMove],
          power: this.playerManager.calculatePodPower([itemToMove])
        };
        this.currentPods.push(newPod);
      } else {
        const targetPod = this.currentPods[parseInt(targetPodIndex)];
        targetPod.players.push(itemToMove);
        targetPod.power = this.playerManager.calculatePodPower(targetPod.players);
      }
      this.cleanupEmptyPods();
      this.onPodsChanged(this.currentPods, this.currentUnassigned);
    }
    cleanupEmptyPods() {
      this.currentPods = this.currentPods.filter((pod) => pod.players.length > 0);
    }
  };

  // src/display-mode.ts
  var DisplayModeManager = class {
    constructor() {
      this.isDisplayMode = false;
      this.handleKeyDown = null;
      // Pool of 25 high-contrast colors for pod borders
      this.borderColors = [
        "#FF6B6B",
        // Red
        "#4ECDC4",
        // Teal
        "#45B7D1",
        // Blue
        "#FFA726",
        // Orange
        "#66BB6A",
        // Green
        "#AB47BC",
        // Purple
        "#EF5350",
        // Light Red
        "#26A69A",
        // Dark Teal
        "#42A5F5",
        // Light Blue
        "#FF7043",
        // Deep Orange
        "#9CCC65",
        // Light Green
        "#7E57C2",
        // Deep Purple
        "#EC407A",
        // Pink
        "#29B6F6",
        // Cyan
        "#FFCA28",
        // Amber
        "#8BC34A",
        // Lime
        "#673AB7",
        // Indigo
        "#F06292",
        // Light Pink
        "#00BCD4",
        // Dark Cyan
        "#FFEB3B",
        // Yellow
        "#795548",
        // Brown
        "#607D8B",
        // Blue Grey
        "#E91E63",
        // Deep Pink
        "#009688",
        // Dark Teal
        "#FF9800"
        // Pure Orange
      ];
    }
    getShuffledColors(count) {
      const shuffled = [...this.borderColors];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (count > shuffled.length) {
        const repeated = [];
        for (let i = 0; i < count; i++) {
          repeated.push(shuffled[i % shuffled.length]);
        }
        return repeated;
      }
      return shuffled.slice(0, count);
    }
    calculateValidPowerRange(pod) {
      const allPlayers = pod.players.flatMap(
        (item) => "players" in item ? item.players : [item]
      );
      if (allPlayers.length === 0) return pod.power.toString();
      const tolerance = this.getCurrentLeniencyTolerance();
      const validPowers = [];
      const allPossiblePowers = /* @__PURE__ */ new Set();
      allPlayers.forEach((player) => {
        player.availablePowers.forEach((power) => allPossiblePowers.add(power));
      });
      for (const testPower of allPossiblePowers) {
        const canAllPlayersParticipate = allPlayers.every(
          (player) => player.availablePowers.some(
            (playerPower) => Math.abs(testPower - playerPower) <= tolerance
          )
        );
        if (canAllPlayersParticipate) {
          validPowers.push(testPower);
        }
      }
      validPowers.sort((a, b) => a - b);
      if (validPowers.length === 0) {
        return pod.power.toString();
      } else if (validPowers.length === 1) {
        return validPowers[0].toString();
      } else {
        const isConsecutive = validPowers.every(
          (power, index) => index === 0 || power - validPowers[index - 1] <= 0.5
        );
        if (isConsecutive && validPowers.length > 2) {
          return `${validPowers[0]}-${validPowers[validPowers.length - 1]}`;
        } else {
          return validPowers.join(", ");
        }
      }
    }
    calculateOptimalWidthForText(text) {
      let weightedLength = 0;
      for (const char of text) {
        if (char === " ") {
          weightedLength += 0.3;
        } else if (/[iIl1]/.test(char)) {
          weightedLength += 0.4;
        } else if (/[mwMW]/.test(char)) {
          weightedLength += 0.8;
        } else if (/[A-Z]/.test(char)) {
          weightedLength += 0.7;
        } else {
          weightedLength += 0.6;
        }
      }
      const widthWithPadding = weightedLength * 1.2;
      const percentage = Math.min(85, Math.max(25, widthWithPadding / 25 * 85));
      return Math.round(percentage);
    }
    calculateFontSizeForPod(podWidth, podHeight, playerCount) {
      const podArea = podWidth * podHeight;
      const baseSize = Math.sqrt(podArea) / 40;
      const playerCountFactor = Math.max(0.7, 1 - (playerCount - 3) * 0.06);
      const finalSize = Math.max(14, Math.min(24, baseSize * playerCountFactor));
      return `${Math.round(finalSize)}px`;
    }
    getCurrentLeniencyTolerance() {
      const leniencyRadio = document.querySelector("#leniency-radio");
      const superLeniencyRadio = document.querySelector("#super-leniency-radio");
      if (superLeniencyRadio?.checked) {
        return 1;
      } else if (leniencyRadio?.checked) {
        return 0.5;
      } else {
        return 0;
      }
    }
    calculateValidBracketRange(pod) {
      const allPlayers = pod.players.flatMap(
        (item) => "players" in item ? item.players : [item]
      );
      if (allPlayers.length === 0) return "Unknown";
      const validBrackets = [];
      const allPossibleBrackets = /* @__PURE__ */ new Set();
      allPlayers.forEach((player) => {
        if (player.brackets) {
          player.brackets.forEach((bracket) => allPossibleBrackets.add(bracket));
        }
      });
      for (const testBracket of allPossibleBrackets) {
        const canAllPlayersParticipate = allPlayers.every(
          (player) => player.brackets && player.brackets.includes(testBracket)
        );
        if (canAllPlayersParticipate) {
          validBrackets.push(testBracket);
        }
      }
      const bracketOrder = ["1", "2", "3", "4", "cedh"];
      validBrackets.sort((a, b) => bracketOrder.indexOf(a) - bracketOrder.indexOf(b));
      if (validBrackets.length === 0) {
        return "Unknown";
      } else if (validBrackets.length === 1) {
        return validBrackets[0];
      } else {
        const numericBrackets = validBrackets.filter((b) => b !== "cedh");
        const hasConsecutiveNumbers = numericBrackets.length > 1 && numericBrackets.every((bracket, index) => {
          if (index === 0) return true;
          const current = parseInt(bracket);
          const previous = parseInt(numericBrackets[index - 1]);
          return current === previous + 1;
        });
        if (hasConsecutiveNumbers && numericBrackets.length === validBrackets.length && validBrackets.length > 1) {
          return `${validBrackets[0]}-${validBrackets[validBrackets.length - 1]}`;
        } else {
          return validBrackets.join(", ");
        }
      }
    }
    enterDisplayMode(currentPods) {
      if (currentPods.length === 0) return;
      this.isDisplayMode = true;
      document.body.classList.add("display-mode");
      const gridSize = Math.ceil(Math.sqrt(currentPods.length));
      const displayContainer = document.createElement("div");
      displayContainer.className = "display-mode-container";
      displayContainer.style.position = "fixed";
      displayContainer.style.top = "0";
      displayContainer.style.left = "0";
      displayContainer.style.width = "100vw";
      displayContainer.style.height = "100vh";
      displayContainer.style.background = "#1a1a1a";
      displayContainer.style.zIndex = "1000";
      displayContainer.style.padding = "20px";
      displayContainer.style.boxSizing = "border-box";
      displayContainer.style.overflow = "hidden";
      displayContainer.innerHTML = `
            <div class="display-mode-controls">
                <button id="exit-display-btn">Exit Display Mode</button>
            </div>
            <h1 style="text-align: center; margin: 0 0 20px 0; font-size: 2.5rem; color: white;">MTG Commander Pods</h1>
            <div id="display-output" style="flex-grow: 1; height: calc(100vh - 140px);"></div>
        `;
      const originalContainer = document.querySelector(".container");
      if (originalContainer) {
        originalContainer.style.display = "none";
      }
      document.body.appendChild(displayContainer);
      const displayOutput = displayContainer.querySelector("#display-output");
      const podsGrid = document.createElement("div");
      podsGrid.style.display = "grid";
      podsGrid.style.gap = "20px";
      podsGrid.style.height = "100%";
      podsGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
      podsGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
      const podColors = this.getShuffledColors(currentPods.length);
      currentPods.forEach((pod, index) => {
        const podElement = document.createElement("div");
        podElement.style.display = "flex";
        podElement.style.flexDirection = "column";
        podElement.style.background = "#2a2a2a";
        podElement.style.border = `3px solid ${podColors[index]}`;
        podElement.style.borderRadius = "8px";
        podElement.style.padding = "15px";
        podElement.style.boxSizing = "border-box";
        podElement.style.minHeight = "0";
        podElement.style.boxShadow = `0 0 10px ${podColors[index]}40`;
        podElement.classList.add(`pod-color-${index % 10}`);
        const title = document.createElement("h3");
        const bracketRadio = document.getElementById("bracket-radio");
        const isBracketMode = bracketRadio && bracketRadio.checked;
        if (isBracketMode) {
          const validBracketRange = this.calculateValidBracketRange(pod);
          title.textContent = `Pod ${index + 1} (Bracket: ${validBracketRange})`;
        } else {
          const validPowerRange = this.calculateValidPowerRange(pod);
          title.textContent = `Pod ${index + 1} (Power: ${validPowerRange})`;
        }
        title.style.fontSize = "1.6rem";
        title.style.margin = "0 0 15px 0";
        title.style.textAlign = "center";
        title.style.color = podColors[index];
        title.style.fontWeight = "bold";
        title.style.flexShrink = "0";
        title.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
        podElement.appendChild(title);
        let playerCount = 0;
        pod.players.forEach((item) => {
          if ("players" in item) {
            playerCount += item.players.length;
          } else {
            playerCount += 1;
          }
        });
        let longestText = "";
        pod.players.forEach((item) => {
          if ("players" in item) {
            item.players.forEach((p) => {
              const text = isBracketMode && p.bracketRange ? `${p.name} (B: ${p.bracketRange})` : `${p.name} (P: ${p.powerRange})`;
              if (text.length > longestText.length) {
                longestText = text;
              }
            });
          } else {
            const text = isBracketMode && item.bracketRange ? `${item.name} (B: ${item.bracketRange})` : `${item.name} (P: ${item.powerRange})`;
            if (text.length > longestText.length) {
              longestText = text;
            }
          }
        });
        const list = document.createElement("ul");
        list.style.flexGrow = "1";
        list.style.display = "flex";
        list.style.flexDirection = "column";
        list.style.justifyContent = "center";
        list.style.alignItems = "center";
        list.style.margin = "0";
        list.style.padding = "0";
        list.style.listStyle = "none";
        list.style.overflowY = "auto";
        list.style.width = "100%";
        list.style.gap = "8px";
        const optimalWidth = this.calculateOptimalWidthForText(longestText);
        const podElementRef = podElement;
        pod.players.forEach((item) => {
          if ("players" in item) {
            item.players.forEach((p) => {
              const playerItem = document.createElement("li");
              const bracketRadio2 = document.getElementById("bracket-radio");
              const isBracketMode2 = bracketRadio2 && bracketRadio2.checked;
              if (isBracketMode2 && p.bracketRange) {
                playerItem.textContent = `${p.name} (B: ${p.bracketRange})`;
              } else {
                playerItem.textContent = `${p.name} (P: ${p.powerRange})`;
              }
              playerItem.style.color = "#ffffff";
              playerItem.style.textAlign = "center";
              playerItem.style.width = `${optimalWidth}%`;
              playerItem.style.maxWidth = `${optimalWidth}%`;
              playerItem.style.lineHeight = "1.2";
              playerItem.style.fontWeight = "500";
              playerItem.style.wordBreak = "break-word";
              playerItem.style.hyphens = "auto";
              playerItem.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              playerItem.style.borderRadius = "8px";
              playerItem.style.boxSizing = "border-box";
              const baseHeight = Math.max(45, Math.min(100, 100 / Math.max(playerCount, 1) + 25));
              playerItem.style.minHeight = `${baseHeight}px`;
              playerItem.style.padding = `${Math.max(6, baseHeight * 0.12)}px 10px`;
              playerItem.style.display = "flex";
              playerItem.style.alignItems = "center";
              playerItem.style.justifyContent = "center";
              playerItem.dataset.podRef = index.toString();
              playerItem.classList.add("dynamic-font-item");
              playerItem.style.fontSize = "18px";
              list.appendChild(playerItem);
            });
          } else {
            const playerItem = document.createElement("li");
            const bracketRadio2 = document.getElementById("bracket-radio");
            const isBracketMode2 = bracketRadio2 && bracketRadio2.checked;
            if (isBracketMode2 && item.bracketRange) {
              playerItem.textContent = `${item.name} (B: ${item.bracketRange})`;
            } else {
              playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
            }
            playerItem.style.color = "#ffffff";
            playerItem.style.textAlign = "center";
            playerItem.style.width = `${optimalWidth}%`;
            playerItem.style.maxWidth = `${optimalWidth}%`;
            playerItem.style.lineHeight = "1.2";
            playerItem.style.fontWeight = "500";
            playerItem.style.wordBreak = "break-word";
            playerItem.style.hyphens = "auto";
            playerItem.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            playerItem.style.borderRadius = "8px";
            playerItem.style.boxSizing = "border-box";
            const baseHeight = Math.max(45, Math.min(100, 100 / Math.max(playerCount, 1) + 25));
            playerItem.style.minHeight = `${baseHeight}px`;
            playerItem.style.padding = `${Math.max(6, baseHeight * 0.12)}px 10px`;
            playerItem.style.display = "flex";
            playerItem.style.alignItems = "center";
            playerItem.style.justifyContent = "center";
            playerItem.dataset.podRef = index.toString();
            playerItem.classList.add("dynamic-font-item");
            playerItem.style.fontSize = "18px";
            list.appendChild(playerItem);
          }
        });
        podElement.appendChild(list);
        podsGrid.appendChild(podElement);
      });
      displayOutput.appendChild(podsGrid);
      requestAnimationFrame(() => {
        const allPods = podsGrid.querySelectorAll("div");
        allPods.forEach((podElement, podIndex) => {
          const rect = podElement.getBoundingClientRect();
          const podWidth = rect.width;
          const podHeight = rect.height;
          let podPlayerCount = 0;
          currentPods[podIndex].players.forEach((item) => {
            if ("players" in item) {
              podPlayerCount += item.players.length;
            } else {
              podPlayerCount += 1;
            }
          });
          const dynamicFontSize = this.calculateFontSizeForPod(podWidth, podHeight, podPlayerCount);
          const playerItems = podElement.querySelectorAll(".dynamic-font-item");
          playerItems.forEach((item) => {
            item.style.fontSize = dynamicFontSize;
          });
        });
      });
      const exitBtn = displayContainer.querySelector("#exit-display-btn");
      exitBtn.addEventListener("click", () => this.exitDisplayMode());
      this.handleKeyDown = (e) => {
        if (e.key === "Escape" && this.isDisplayMode) {
          this.exitDisplayMode();
        }
      };
      document.addEventListener("keydown", this.handleKeyDown);
    }
    exitDisplayMode() {
      this.isDisplayMode = false;
      document.body.classList.remove("display-mode");
      const originalContainer = document.querySelector(".container");
      if (originalContainer) {
        originalContainer.style.display = "";
      }
      const displayContainer = document.querySelector(".display-mode-container");
      if (displayContainer) {
        displayContainer.remove();
      }
      if (this.handleKeyDown) {
        document.removeEventListener("keydown", this.handleKeyDown);
        this.handleKeyDown = null;
      }
    }
    getIsDisplayMode() {
      return this.isDisplayMode;
    }
  };

  // src/ui-manager.ts
  var UIManager = class {
    // Bottom Display Mode button
    constructor() {
      this.currentPods = [];
      this.currentUnassigned = [];
      this.lastResetData = null;
      // Store data before reset for undo functionality
      this.isRestoring = false;
      // Flag to prevent clearAllSelections during restoration
      this.displayModeBtnBottom = null;
      this.playerRowsContainer = document.getElementById("player-rows");
      this.outputSection = document.getElementById("output-section");
      this.displayModeBtn = document.getElementById("display-mode-btn");
      this.playerRowTemplate = document.getElementById("player-row-template");
      this.playerManager = new PlayerManager();
      this.podGenerator = new PodGenerator();
      this.dragDropManager = new DragDropManager(this.playerManager, (pods, unassigned) => this.renderPods(pods, unassigned));
      this.displayModeManager = new DisplayModeManager();
      this.initializeEventListeners();
      this.initializeRankingModeToggle();
    }
    initializeEventListeners() {
      const addPlayerBtn = document.getElementById("add-player-btn");
      const generatePodsBtn = document.getElementById("generate-pods-btn");
      const resetAllBtn = document.getElementById("reset-all-btn");
      const helpBtn = document.getElementById("help-btn");
      addPlayerBtn.addEventListener("click", () => this.addPlayerRow());
      generatePodsBtn.addEventListener("click", () => this.generatePods());
      resetAllBtn.addEventListener("click", () => this.resetAllWithConfirmation());
      this.displayModeBtn.addEventListener("click", () => this.displayModeManager.enterDisplayMode(this.currentPods));
      helpBtn.addEventListener("click", () => this.showHelpModal());
      this.initializeHelpModal();
    }
    addPlayerRow() {
      const clone = this.playerRowTemplate.content.cloneNode(true);
      const newRow = clone.querySelector(".player-row");
      const playerId = this.playerManager.getNextPlayerId();
      newRow.dataset.playerId = playerId.toString();
      const powerSelectorBtn = newRow.querySelector(".power-selector-btn");
      const powerDropdown = newRow.querySelector(".power-selector-dropdown");
      const rangeButtons = newRow.querySelectorAll(".range-btn");
      const updateButtonText = () => {
        const checkboxes2 = newRow.querySelectorAll('.power-checkbox input[type="checkbox"]');
        const selectedPowers = [];
        checkboxes2.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedPowers.push(parseFloat(checkbox.value));
          }
        });
        if (selectedPowers.length === 0) {
          powerSelectorBtn.textContent = "Select Power Levels";
          powerSelectorBtn.classList.remove("has-selection");
          if (powerSelectorBtn.dataset.validationTriggered === "true") {
            powerSelectorBtn.classList.add("error");
          }
        } else {
          powerSelectorBtn.classList.remove("error");
          selectedPowers.sort((a, b) => a - b);
          let displayText;
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
              displayText = `Power: ${selectedPowers.join(", ")}`;
            } else {
              displayText = `Power: ${min}-${max} (${selectedPowers.length} levels)`;
            }
          }
          powerSelectorBtn.textContent = displayText;
          powerSelectorBtn.classList.add("has-selection");
        }
      };
      powerSelectorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = powerDropdown.style.display !== "none";
        document.querySelectorAll(".power-selector-dropdown").forEach((dropdown) => {
          dropdown.style.display = "none";
          dropdown.classList.remove("show");
        });
        document.querySelectorAll(".power-selector-btn").forEach((btn) => {
          btn.classList.remove("open");
        });
        if (!isOpen) {
          powerDropdown.style.display = "block";
          powerSelectorBtn.classList.add("open");
          setTimeout(() => powerDropdown.classList.add("show"), 10);
        }
      });
      document.addEventListener("click", (e) => {
        if (!powerSelectorBtn.contains(e.target) && !powerDropdown.contains(e.target)) {
          powerDropdown.classList.remove("show");
          powerSelectorBtn.classList.remove("open");
          setTimeout(() => {
            if (!powerDropdown.classList.contains("show")) {
              powerDropdown.style.display = "none";
            }
          }, 200);
        }
      });
      const checkboxes = newRow.querySelectorAll('.power-checkbox input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", updateButtonText);
      });
      rangeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const range = button.dataset.range;
          checkboxes.forEach((cb) => cb.checked = false);
          const [start, end] = range.split("-").map(Number);
          checkboxes.forEach((cb) => {
            const value = parseFloat(cb.value);
            if (value === start || value === end) {
              cb.checked = true;
            }
          });
          updateButtonText();
        });
      });
      const clearButton = newRow.querySelector(".clear-btn");
      clearButton.addEventListener("click", () => {
        checkboxes.forEach((cb) => cb.checked = false);
        updateButtonText();
      });
      const closeDropdown = () => {
        powerDropdown.classList.remove("show");
        powerSelectorBtn.classList.remove("open");
        setTimeout(() => {
          if (!powerDropdown.classList.contains("show")) {
            powerDropdown.style.display = "none";
          }
        }, 200);
      };
      let typedSequence = "";
      let sequenceTimeout = null;
      document.addEventListener("keydown", (e) => {
        const isDropdownOpen = powerDropdown.style.display === "block" && powerDropdown.classList.contains("show");
        const isButtonFocused = document.activeElement === powerSelectorBtn;
        if (isDropdownOpen || isButtonFocused) {
          if (e.key === "Escape") {
            e.preventDefault();
            if (isDropdownOpen) {
              closeDropdown();
              powerSelectorBtn.focus();
            }
            typedSequence = "";
            if (sequenceTimeout) clearTimeout(sequenceTimeout);
          } else if (e.key >= "1" && e.key <= "9" || e.key === "." || e.key === "0" || e.key === "-") {
            e.preventDefault();
            typedSequence += e.key;
            if (sequenceTimeout) clearTimeout(sequenceTimeout);
            sequenceTimeout = setTimeout(() => {
              if (typedSequence.includes("-")) {
                const parts = typedSequence.split("-");
                if (parts.length === 2) {
                  const startValue = parseFloat(parts[0]);
                  const endValue = parseFloat(parts[1]);
                  const includeHalfSteps = parts[0].includes(".") || parts[1].includes(".");
                  if (!isNaN(startValue) && !isNaN(endValue) && startValue >= 1 && startValue <= 10 && endValue >= 1 && endValue <= 10 && startValue <= endValue) {
                    checkboxes.forEach((cb) => cb.checked = false);
                    checkboxes.forEach((cb) => {
                      const value = parseFloat(cb.value);
                      if (value >= startValue && value <= endValue) {
                        const isWholeNumber = value % 1 === 0;
                        const isHalfStep = value % 1 === 0.5;
                        if (isWholeNumber || includeHalfSteps && isHalfStep) {
                          cb.checked = true;
                        }
                      }
                    });
                    updateButtonText();
                    if (isDropdownOpen) {
                      closeDropdown();
                    }
                  }
                }
              } else {
                const targetValue = parseFloat(typedSequence);
                if (!isNaN(targetValue) && targetValue >= 1 && targetValue <= 10) {
                  checkboxes.forEach((cb) => cb.checked = false);
                  const targetCheckbox = Array.from(checkboxes).find(
                    (cb) => Math.abs(parseFloat(cb.value) - targetValue) < 0.01
                  );
                  if (targetCheckbox) {
                    targetCheckbox.checked = true;
                    updateButtonText();
                    if (isDropdownOpen) {
                      closeDropdown();
                    }
                  }
                }
              }
              typedSequence = "";
            }, 500);
          }
        }
      });
      updateButtonText();
      const bracketSelectorBtn = newRow.querySelector(".bracket-selector-btn");
      const bracketDropdown = newRow.querySelector(".bracket-selector-dropdown");
      const bracketRangeButtons = newRow.querySelectorAll(".bracket-range-btn");
      const updateBracketButtonText = () => {
        const bracketCheckboxes2 = newRow.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
        const selectedBrackets = [];
        bracketCheckboxes2.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedBrackets.push(checkbox.value);
          }
        });
        if (selectedBrackets.length === 0) {
          bracketSelectorBtn.textContent = "Select Brackets";
          bracketSelectorBtn.classList.remove("has-selection");
          if (bracketSelectorBtn.dataset.validationTriggered === "true") {
            bracketSelectorBtn.classList.add("error");
          }
        } else {
          bracketSelectorBtn.classList.remove("error");
          let displayText;
          if (selectedBrackets.length === 1) {
            displayText = `Bracket: ${selectedBrackets[0]}`;
          } else {
            displayText = `Brackets: ${selectedBrackets.join(", ")}`;
          }
          bracketSelectorBtn.textContent = displayText;
          bracketSelectorBtn.classList.add("has-selection");
        }
      };
      bracketSelectorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = bracketDropdown.style.display !== "none";
        document.querySelectorAll(".bracket-selector-dropdown, .power-selector-dropdown").forEach((dropdown) => {
          dropdown.style.display = "none";
          dropdown.classList.remove("show");
        });
        document.querySelectorAll(".bracket-selector-btn, .power-selector-btn").forEach((btn) => {
          btn.classList.remove("open");
        });
        if (!isOpen) {
          bracketDropdown.style.display = "block";
          bracketSelectorBtn.classList.add("open");
          setTimeout(() => bracketDropdown.classList.add("show"), 10);
        }
      });
      document.addEventListener("click", (e) => {
        if (!bracketSelectorBtn.contains(e.target) && !bracketDropdown.contains(e.target)) {
          bracketDropdown.classList.remove("show");
          bracketSelectorBtn.classList.remove("open");
          setTimeout(() => {
            if (!bracketDropdown.classList.contains("show")) {
              bracketDropdown.style.display = "none";
            }
          }, 200);
        }
      });
      const bracketCheckboxes = newRow.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
      bracketCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", updateBracketButtonText);
      });
      bracketRangeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const range = button.dataset.range;
          bracketCheckboxes.forEach((cb) => cb.checked = false);
          if (range === "cedh") {
            bracketCheckboxes.forEach((cb) => {
              if (cb.value === "cedh") {
                cb.checked = true;
              }
            });
          } else {
            const [start, end] = range.split("-");
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            bracketCheckboxes.forEach((cb) => {
              const value = cb.value;
              if (value !== "cedh") {
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
      const bracketClearButton = newRow.querySelector(".bracket-clear-btn");
      bracketClearButton.addEventListener("click", () => {
        bracketCheckboxes.forEach((cb) => cb.checked = false);
        updateBracketButtonText();
      });
      const closeBracketDropdown = () => {
        bracketDropdown.classList.remove("show");
        bracketSelectorBtn.classList.remove("open");
        setTimeout(() => {
          if (!bracketDropdown.classList.contains("show")) {
            bracketDropdown.style.display = "none";
          }
        }, 200);
      };
      document.addEventListener("keydown", (e) => {
        const isBracketDropdownOpen = bracketDropdown.style.display === "block" && bracketDropdown.classList.contains("show");
        const isBracketButtonFocused = document.activeElement === bracketSelectorBtn;
        if (isBracketDropdownOpen || isBracketButtonFocused) {
          if (e.key === "Escape") {
            e.preventDefault();
            if (isBracketDropdownOpen) {
              closeBracketDropdown();
              bracketSelectorBtn.focus();
            }
          } else if (e.key >= "1" && e.key <= "4") {
            e.preventDefault();
            const targetValue = e.key;
            bracketCheckboxes.forEach((cb) => cb.checked = false);
            const targetCheckbox = Array.from(bracketCheckboxes).find((cb) => cb.value === targetValue);
            if (targetCheckbox) {
              targetCheckbox.checked = true;
              updateBracketButtonText();
              if (isBracketDropdownOpen) {
                closeBracketDropdown();
              }
            }
          } else if (e.key === "5" || e.key.toLowerCase() === "c") {
            e.preventDefault();
            bracketCheckboxes.forEach((cb) => cb.checked = false);
            const cedhCheckbox = Array.from(bracketCheckboxes).find((cb) => cb.value === "cedh");
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
      updateBracketButtonText();
      const removeBtn = newRow.querySelector(".remove-player-btn");
      removeBtn.addEventListener("click", () => {
        this.playerRowsContainer.removeChild(newRow);
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
        this.updatePlayerNumbers();
      });
      const nameInput = newRow.querySelector(".player-name");
      nameInput.addEventListener("input", () => {
        nameInput.dataset.touched = "true";
        const name = nameInput.value.trim();
        if (!name && nameInput.dataset.touched === "true") {
          nameInput.classList.add("input-error");
        } else {
          nameInput.classList.remove("input-error");
        }
        this.clearDuplicateErrorsOnInput();
      });
      const groupSelect = newRow.querySelector(".group-select");
      groupSelect.addEventListener("change", () => {
        this.playerManager.handleGroupChange(this.playerRowsContainer);
      });
      this.playerRowsContainer.appendChild(newRow);
      this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
      this.updatePlayerNumbers();
      const bracketRadio = document.getElementById("bracket-radio");
      const isBracketMode = bracketRadio.checked;
      const powerLevels = newRow.querySelector(".power-levels");
      const bracketLevels = newRow.querySelector(".bracket-levels");
      if (isBracketMode) {
        powerLevels.style.display = "none";
        bracketLevels.style.display = "block";
      } else {
        powerLevels.style.display = "block";
        bracketLevels.style.display = "none";
      }
    }
    cleanupBottomDisplayButton() {
      if (this.displayModeBtnBottom) {
        const wrapper = this.displayModeBtnBottom.parentNode;
        if (wrapper && wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
        this.displayModeBtnBottom = null;
      }
    }
    generatePods() {
      this.triggerValidationForAllFields();
      this.cleanupBottomDisplayButton();
      this.outputSection.innerHTML = "";
      this.playerManager.handleGroupChange(this.playerRowsContainer);
      const allPlayers = [];
      const playerRows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
      let validationFailed = false;
      playerRows.forEach((row) => {
        const nameInput = row.querySelector(".player-name");
        nameInput.classList.remove("name-duplicate-error", "name-duplicate-error-1", "name-duplicate-error-2", "name-duplicate-error-3", "name-duplicate-error-4", "name-duplicate-error-5");
      });
      for (const row of playerRows) {
        const player = this.playerManager.getPlayerFromRow(row);
        if (player) {
          allPlayers.push(player);
        } else {
          validationFailed = true;
        }
      }
      const nameCount = /* @__PURE__ */ new Map();
      playerRows.forEach((row) => {
        const nameInput = row.querySelector(".player-name");
        const name = nameInput.value.trim().toLowerCase();
        if (name) {
          if (!nameCount.has(name)) {
            nameCount.set(name, []);
          }
          nameCount.get(name).push(row);
        }
      });
      const duplicateNames = [];
      let colorIndex = 1;
      nameCount.forEach((rows, name) => {
        if (rows.length > 1) {
          duplicateNames.push(name);
          const colorClass = `name-duplicate-error-${colorIndex}`;
          rows.forEach((row) => {
            const nameInput = row.querySelector(".player-name");
            nameInput.classList.add(colorClass);
          });
          colorIndex = colorIndex % 5 + 1;
          validationFailed = true;
        }
      });
      if (validationFailed) {
        let errorMessage = "Please fix the errors before generating pods.";
        if (duplicateNames.length > 0) {
          errorMessage += `

Duplicate player names found: ${duplicateNames.join(", ")}`;
        }
        alert(errorMessage);
        return;
      }
      const processedGroups = /* @__PURE__ */ new Map();
      this.playerManager.getGroups().forEach((players, id) => {
        const totalPower = players.reduce((sum, player) => sum + player.power, 0);
        const averagePower = Math.round(totalPower / players.length * 2) / 2;
        processedGroups.set(id, {
          id,
          players,
          averagePower,
          size: players.length
        });
      });
      const groupedPlayerIds = new Set([...this.playerManager.getGroups().values()].flat().map((p) => p.id));
      const ungroupedPlayers = allPlayers.filter((p) => !groupedPlayerIds.has(p.id));
      let itemsToPod = [...ungroupedPlayers];
      processedGroups.forEach((group) => {
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
      const isTestEnvironment = typeof window !== "undefined" && (window.location.protocol === "file:" || window.__playwright !== void 0 || window.playwright !== void 0);
      if (isTestEnvironment) {
        const playerNames = allPlayers.map((p) => p.name).join("");
        const deterministicSeed = Array.from(playerNames).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        this.podGenerator.setShuffleSeed(deterministicSeed);
      } else {
        this.podGenerator.setShuffleSeed(null);
      }
      const result = this.podGenerator.generatePodsWithBacktracking(itemsToPod, podSizes, leniencySettings);
      const pods = result.pods;
      let unassignedPlayers = result.unassigned;
      this.currentPods = [...pods];
      this.currentUnassigned = [...unassignedPlayers];
      this.renderPods(pods, unassignedPlayers);
    }
    renderPods(pods, unassignedPlayers = []) {
      this.currentPods = [...pods];
      this.currentUnassigned = [...unassignedPlayers];
      this.dragDropManager.setCurrentPods(this.currentPods, this.currentUnassigned);
      this.cleanupBottomDisplayButton();
      this.outputSection.innerHTML = "";
      if (pods.length === 0) {
        this.outputSection.textContent = "Could not form pods with the given players.";
        this.displayModeBtn.style.display = "none";
        return;
      }
      this.displayModeBtn.style.display = "inline-block";
      const gridSize = Math.ceil(Math.sqrt(pods.length));
      const podsContainer = document.createElement("div");
      podsContainer.classList.add("pods-container");
      podsContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
      podsContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
      pods.forEach((pod, index) => {
        const podElement = document.createElement("div");
        podElement.classList.add("pod", `pod-color-${index % 10}`);
        podElement.dataset.podIndex = index.toString();
        podElement.addEventListener("dragover", this.dragDropManager.handleDragOver);
        podElement.addEventListener("drop", this.dragDropManager.handleDrop);
        podElement.addEventListener("dragleave", this.dragDropManager.handleDragLeave);
        const title = document.createElement("h3");
        const bracketRadio = document.getElementById("bracket-radio");
        const isBracketMode = bracketRadio && bracketRadio.checked;
        if (isBracketMode) {
          const validBracketRange = this.calculateValidBracketRange(pod);
          title.textContent = `Pod ${index + 1} (Bracket: ${validBracketRange})`;
        } else {
          title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
        }
        podElement.appendChild(title);
        const list = document.createElement("ul");
        pod.players.forEach((item, itemIndex) => {
          if ("players" in item) {
            const groupItem = document.createElement("li");
            groupItem.classList.add("pod-group");
            groupItem.draggable = true;
            groupItem.dataset.itemType = "group";
            groupItem.dataset.itemId = item.id;
            groupItem.dataset.podIndex = index.toString();
            groupItem.dataset.itemIndex = itemIndex.toString();
            groupItem.addEventListener("dragstart", this.dragDropManager.handleDragStart);
            groupItem.addEventListener("dragend", this.dragDropManager.handleDragEnd);
            const bracketRadio2 = document.getElementById("bracket-radio");
            const isBracketMode2 = bracketRadio2 && bracketRadio2.checked;
            if (isBracketMode2) {
              groupItem.innerHTML = `<strong>Group ${item.id.split("-")[1]}:</strong>`;
            } else {
              groupItem.innerHTML = `<strong>Group ${item.id.split("-")[1]} (Avg Power: ${item.averagePower}):</strong>`;
            }
            const subList = document.createElement("ul");
            item.players.forEach((p) => {
              const subItem = document.createElement("li");
              if (isBracketMode2 && p.bracketRange) {
                subItem.textContent = `${p.name} (B: ${p.bracketRange})`;
              } else {
                subItem.textContent = `${p.name} (P: ${p.powerRange})`;
              }
              subList.appendChild(subItem);
            });
            groupItem.appendChild(subList);
            list.appendChild(groupItem);
          } else {
            const playerItem = document.createElement("li");
            playerItem.classList.add("pod-player");
            playerItem.draggable = true;
            playerItem.dataset.itemType = "player";
            playerItem.dataset.itemId = item.id.toString();
            playerItem.dataset.podIndex = index.toString();
            playerItem.dataset.itemIndex = itemIndex.toString();
            playerItem.addEventListener("dragstart", this.dragDropManager.handleDragStart);
            playerItem.addEventListener("dragend", this.dragDropManager.handleDragEnd);
            const bracketRadio2 = document.getElementById("bracket-radio");
            const isBracketMode2 = bracketRadio2 && bracketRadio2.checked;
            if (isBracketMode2 && item.bracketRange) {
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
      if (pods.length > 0) {
        const newPodElement = document.createElement("div");
        newPodElement.classList.add("pod", "new-pod", "new-pod-target");
        newPodElement.style.borderColor = "#4CAF50";
        newPodElement.style.backgroundColor = "#1f2a1f";
        newPodElement.style.borderStyle = "dashed";
        newPodElement.dataset.podIndex = "new-pod";
        newPodElement.addEventListener("dragover", this.dragDropManager.handleDragOver);
        newPodElement.addEventListener("drop", this.dragDropManager.handleDrop);
        newPodElement.addEventListener("dragleave", this.dragDropManager.handleDragLeave);
        const newPodTitle = document.createElement("h3");
        newPodTitle.textContent = "Create New Pod";
        newPodTitle.style.color = "#4CAF50";
        newPodElement.appendChild(newPodTitle);
        const newPodMessage = document.createElement("p");
        newPodMessage.textContent = "Drag players or groups here to create a new pod";
        newPodMessage.style.color = "#999";
        newPodMessage.style.fontStyle = "italic";
        newPodMessage.style.textAlign = "center";
        newPodMessage.style.margin = "20px 0";
        newPodElement.appendChild(newPodMessage);
        podsContainer.appendChild(newPodElement);
      }
      if (unassignedPlayers.length > 0) {
        const unassignedElement = document.createElement("div");
        unassignedElement.classList.add("pod", "unassigned-pod");
        unassignedElement.style.borderColor = "#ff6b6b";
        unassignedElement.style.backgroundColor = "#2a1f1f";
        unassignedElement.dataset.podIndex = "unassigned";
        unassignedElement.addEventListener("dragover", this.dragDropManager.handleDragOver);
        unassignedElement.addEventListener("drop", this.dragDropManager.handleDrop);
        unassignedElement.addEventListener("dragleave", this.dragDropManager.handleDragLeave);
        const title = document.createElement("h3");
        title.textContent = "Unassigned Players";
        title.style.color = "#ff6b6b";
        unassignedElement.appendChild(title);
        const list = document.createElement("ul");
        unassignedPlayers.forEach((item, itemIndex) => {
          if ("players" in item) {
            const groupItem = document.createElement("li");
            groupItem.classList.add("pod-group");
            groupItem.draggable = true;
            groupItem.dataset.itemType = "group";
            groupItem.dataset.itemId = item.id;
            groupItem.dataset.podIndex = "unassigned";
            groupItem.dataset.itemIndex = itemIndex.toString();
            groupItem.addEventListener("dragstart", this.dragDropManager.handleDragStart);
            groupItem.addEventListener("dragend", this.dragDropManager.handleDragEnd);
            const bracketRadio = document.getElementById("bracket-radio");
            const isBracketMode = bracketRadio && bracketRadio.checked;
            if (isBracketMode) {
              groupItem.innerHTML = `<strong>Group ${item.id.split("-")[1]}:</strong>`;
            } else {
              groupItem.innerHTML = `<strong>Group ${item.id.split("-")[1]} (Avg Power: ${item.averagePower}):</strong>`;
            }
            const subList = document.createElement("ul");
            item.players.forEach((p) => {
              const subItem = document.createElement("li");
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
            const playerItem = document.createElement("li");
            playerItem.classList.add("pod-player");
            playerItem.draggable = true;
            playerItem.dataset.itemType = "player";
            playerItem.dataset.itemId = item.id.toString();
            playerItem.dataset.podIndex = "unassigned";
            playerItem.dataset.itemIndex = itemIndex.toString();
            playerItem.addEventListener("dragstart", this.dragDropManager.handleDragStart);
            playerItem.addEventListener("dragend", this.dragDropManager.handleDragEnd);
            const bracketRadio = document.getElementById("bracket-radio");
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
      const helpSection = document.querySelector(".help-section");
      if (helpSection && helpSection.parentNode) {
        const buttonWrapper = document.createElement("div");
        buttonWrapper.style.textAlign = "center";
        buttonWrapper.style.marginTop = "20px";
        buttonWrapper.style.marginBottom = "20px";
        this.displayModeBtnBottom = this.displayModeBtn.cloneNode(true);
        this.displayModeBtnBottom.id = "display-mode-btn-bottom";
        this.displayModeBtnBottom.style.display = "inline-block";
        this.displayModeBtnBottom.addEventListener("click", () => this.displayModeManager.enterDisplayMode(this.currentPods));
        buttonWrapper.appendChild(this.displayModeBtnBottom);
        helpSection.parentNode.insertBefore(buttonWrapper, helpSection);
      }
    }
    // Capture current player data for potential undo
    captureCurrentPlayerData() {
      const playerRows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
      const playersData = [];
      playerRows.forEach((row) => {
        const nameInput = row.querySelector(".player-name");
        const groupSelect = row.querySelector(".group-select");
        const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
        const selectedPowers = [];
        powerCheckboxes.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedPowers.push(checkbox.value);
          }
        });
        const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
        const selectedBrackets = [];
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
      const leniencySettings = {
        noLeniency: document.getElementById("no-leniency-radio")?.checked || false,
        leniency: document.getElementById("leniency-radio")?.checked || false,
        superLeniency: document.getElementById("super-leniency-radio")?.checked || false,
        bracket: document.getElementById("bracket-radio")?.checked || false
      };
      return {
        players: playersData,
        leniencySettings,
        currentPods: [...this.currentPods],
        currentUnassigned: [...this.currentUnassigned]
      };
    }
    // Show confirmation dialog before reset
    resetAllWithConfirmation() {
      const playerRows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
      const hasData = playerRows.some((row) => {
        const nameInput = row.querySelector(".player-name");
        if (nameInput.value.trim()) return true;
        const checkboxes = row.querySelectorAll('input[type="checkbox"]');
        return Array.from(checkboxes).some((cb) => cb.checked);
      });
      if (!hasData) {
        this.resetAll();
        return;
      }
      const confirmed = confirm(
        "Are you sure you want to reset all player data?\n\nThis will clear all players, groups, and generated pods. You will be able to undo this action immediately after."
      );
      if (confirmed) {
        this.lastResetData = this.captureCurrentPlayerData();
        this.resetAll();
        this.showUndoResetButton();
      }
    }
    // Show the undo reset button
    showUndoResetButton() {
      const existingUndoBtn = document.getElementById("undo-reset-btn");
      if (existingUndoBtn) {
        existingUndoBtn.remove();
      }
      const undoBtn = document.createElement("button");
      undoBtn.id = "undo-reset-btn";
      undoBtn.textContent = "Undo Reset";
      undoBtn.style.marginLeft = "10px";
      undoBtn.style.backgroundColor = "#28a745";
      undoBtn.style.color = "white";
      undoBtn.style.border = "none";
      undoBtn.style.padding = "8px 16px";
      undoBtn.style.borderRadius = "4px";
      undoBtn.style.cursor = "pointer";
      undoBtn.style.fontSize = "14px";
      undoBtn.addEventListener("click", () => this.undoReset());
      const resetBtn = document.getElementById("reset-all-btn");
      resetBtn.parentNode.insertBefore(undoBtn, resetBtn.nextSibling);
      setTimeout(() => {
        if (document.getElementById("undo-reset-btn")) {
          undoBtn.remove();
          this.lastResetData = null;
        }
      }, 3e4);
    }
    // Restore data from before reset
    undoReset() {
      if (!this.lastResetData) {
        alert("No reset data available to restore.");
        return;
      }
      this.playerRowsContainer.innerHTML = "";
      this.cleanupBottomDisplayButton();
      this.outputSection.innerHTML = "";
      this.playerManager.clearGroups();
      this.playerManager.resetPlayerIds();
      this.playerManager.resetGroupIds();
      const settings = this.lastResetData.leniencySettings;
      if (settings.noLeniency) document.getElementById("no-leniency-radio").checked = true;
      if (settings.leniency) document.getElementById("leniency-radio").checked = true;
      if (settings.superLeniency) document.getElementById("super-leniency-radio").checked = true;
      if (settings.bracket) document.getElementById("bracket-radio").checked = true;
      this.lastResetData.players.forEach((playerData) => {
        this.addPlayerRow();
        const rows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
        const currentRow = rows[rows.length - 1];
        const nameInput = currentRow.querySelector(".player-name");
        nameInput.value = playerData.name;
        const groupSelect = currentRow.querySelector(".group-select");
        if (playerData.createdGroupId) {
          groupSelect.dataset.createdGroupId = playerData.createdGroupId;
        }
        groupSelect.value = playerData.groupValue;
      });
      this.isRestoring = true;
      const powerLevelRadio = document.getElementById("no-leniency-radio");
      const bracketRadio = document.getElementById("bracket-radio");
      if (powerLevelRadio && bracketRadio) {
        const changeEvent = new Event("change", { bubbles: true });
        if (settings.bracket) {
          bracketRadio.dispatchEvent(changeEvent);
        } else {
          powerLevelRadio.dispatchEvent(changeEvent);
        }
      }
      setTimeout(() => {
        this.restorePlayerSelections();
      }, 200);
    }
    restorePlayerSelections() {
      if (!this.lastResetData) {
        return;
      }
      this.lastResetData.players.forEach((playerData, index) => {
        const rows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
        const currentRow = rows[index];
        if (!currentRow) {
          return;
        }
        playerData.selectedPowers.forEach((power) => {
          const checkbox = currentRow.querySelector(`.power-checkbox input[type="checkbox"][value="${power}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
        playerData.selectedBrackets.forEach((bracket) => {
          const checkbox = currentRow.querySelector(`.bracket-checkbox input[type="checkbox"][value="${bracket}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
        const allCheckboxes = currentRow.querySelectorAll('input[type="checkbox"]');
        allCheckboxes.forEach((cb) => {
          if (cb.checked) {
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
        this.updateButtonTextsForRow(currentRow);
        const groupSelect = currentRow.querySelector(".group-select");
        if (playerData.groupValue && playerData.groupValue !== "no-group" && playerData.groupValue.startsWith("group-")) {
          if (playerData.createdGroupId) {
            groupSelect.dataset.createdGroupId = playerData.createdGroupId;
          } else {
            groupSelect.dataset.createdGroupId = playerData.groupValue;
          }
          groupSelect.value = "new-group";
          groupSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      this.lastResetData.players.forEach((playerData, index) => {
        const rows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
        const currentRow = rows[index];
        const groupSelect = currentRow.querySelector(".group-select");
        if (playerData.groupValue && playerData.groupValue !== "no-group" && playerData.groupValue.startsWith("group-")) {
          groupSelect.value = playerData.groupValue;
          groupSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      this.currentPods = [...this.lastResetData.currentPods];
      this.currentUnassigned = [...this.lastResetData.currentUnassigned];
      if (this.currentPods.length > 0 || this.currentUnassigned.length > 0) {
        this.renderPods(this.currentPods, this.currentUnassigned);
      }
      this.playerManager.handleGroupChange(this.playerRowsContainer);
      this.isRestoring = false;
      const undoBtn = document.getElementById("undo-reset-btn");
      if (undoBtn) {
        undoBtn.remove();
      }
      this.lastResetData = null;
      alert("Reset has been undone successfully!");
    }
    resetAll() {
      this.playerRowsContainer.innerHTML = "";
      this.cleanupBottomDisplayButton();
      this.outputSection.innerHTML = "";
      this.displayModeBtn.style.display = "none";
      this.playerManager.clearGroups();
      this.playerManager.resetPlayerIds();
      this.playerManager.resetGroupIds();
      this.currentPods = [];
      this.currentUnassigned = [];
      const noLeniencyRadio = document.getElementById("no-leniency-radio");
      noLeniencyRadio.checked = true;
      for (let i = 0; i < 4; i++) {
        this.addPlayerRow();
      }
    }
    clearDuplicateErrorsOnInput() {
      const playerRows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
      const nameInputs = /* @__PURE__ */ new Map();
      playerRows.forEach((row) => {
        const nameInput = row.querySelector(".player-name");
        const name = nameInput.value.trim().toLowerCase();
        if (name) {
          if (!nameInputs.has(name)) {
            nameInputs.set(name, []);
          }
          nameInputs.get(name).push(nameInput);
        }
      });
      playerRows.forEach((row) => {
        const nameInput = row.querySelector(".player-name");
        nameInput.classList.remove("name-duplicate-error", "name-duplicate-error-1", "name-duplicate-error-2", "name-duplicate-error-3", "name-duplicate-error-4", "name-duplicate-error-5");
      });
      let colorIndex = 1;
      nameInputs.forEach((inputs, name) => {
        if (inputs.length > 1) {
          const colorClass = `name-duplicate-error-${colorIndex}`;
          inputs.forEach((input) => {
            input.classList.add(colorClass);
          });
          colorIndex = colorIndex % 5 + 1;
        }
      });
    }
    initializeRankingModeToggle() {
      const powerLevelRadio = document.getElementById("power-level-radio");
      const bracketRadio = document.getElementById("bracket-radio");
      const toggleRankingMode = () => {
        const isBracketMode = bracketRadio.checked;
        if (isBracketMode) {
          document.body.classList.add("bracket-mode");
          const noLeniencyRadio = document.getElementById("no-leniency-radio");
          if (noLeniencyRadio) {
            noLeniencyRadio.checked = true;
          }
        } else {
          document.body.classList.remove("bracket-mode");
        }
        const playerRows = this.playerRowsContainer.querySelectorAll(".player-row");
        playerRows.forEach((row) => {
          const powerLevels = row.querySelector(".power-levels");
          const bracketLevels = row.querySelector(".bracket-levels");
          if (isBracketMode) {
            powerLevels.style.display = "none";
            bracketLevels.style.display = "block";
          } else {
            powerLevels.style.display = "block";
            bracketLevels.style.display = "none";
          }
          if (!this.isRestoring) {
            this.clearAllSelections(row);
          }
        });
      };
      powerLevelRadio.addEventListener("change", toggleRankingMode);
      bracketRadio.addEventListener("change", toggleRankingMode);
      toggleRankingMode();
    }
    clearAllSelections(row) {
      const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
      powerCheckboxes.forEach((cb) => cb.checked = false);
      const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
      bracketCheckboxes.forEach((cb) => cb.checked = false);
      const powerBtn = row.querySelector(".power-selector-btn");
      const bracketBtn = row.querySelector(".bracket-selector-btn");
      if (powerBtn) {
        powerBtn.textContent = "Select Power Levels";
        powerBtn.classList.remove("has-selection");
      }
      if (bracketBtn) {
        bracketBtn.textContent = "Select Brackets";
        bracketBtn.classList.remove("has-selection");
      }
    }
    initializeHelpModal() {
      const helpModal = document.getElementById("help-modal");
      const helpCloseBtn = helpModal.querySelector(".help-close");
      helpCloseBtn.addEventListener("click", () => this.hideHelpModal());
      helpModal.addEventListener("click", (e) => {
        if (e.target === helpModal) {
          this.hideHelpModal();
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && helpModal.style.display === "block") {
          this.hideHelpModal();
        }
      });
    }
    showHelpModal() {
      const helpModal = document.getElementById("help-modal");
      helpModal.style.display = "block";
      document.body.style.overflow = "hidden";
    }
    hideHelpModal() {
      const helpModal = document.getElementById("help-modal");
      helpModal.style.display = "none";
      document.body.style.overflow = "";
    }
    calculateValidBracketRange(pod) {
      const allPlayers = pod.players.flatMap(
        (item) => "players" in item ? item.players : [item]
      );
      if (allPlayers.length === 0) return "Unknown";
      const validBrackets = [];
      const allPossibleBrackets = /* @__PURE__ */ new Set();
      allPlayers.forEach((player) => {
        if (player.brackets) {
          player.brackets.forEach((bracket) => allPossibleBrackets.add(bracket));
        }
      });
      for (const testBracket of allPossibleBrackets) {
        const canAllPlayersParticipate = allPlayers.every(
          (player) => player.brackets && player.brackets.includes(testBracket)
        );
        if (canAllPlayersParticipate) {
          validBrackets.push(testBracket);
        }
      }
      const bracketOrder = ["1", "2", "3", "4", "cedh"];
      validBrackets.sort((a, b) => bracketOrder.indexOf(a) - bracketOrder.indexOf(b));
      if (validBrackets.length === 0) {
        return "Unknown";
      } else if (validBrackets.length === 1) {
        return validBrackets[0];
      } else {
        const numericBrackets = validBrackets.filter((b) => b !== "cedh");
        const hasConsecutiveNumbers = numericBrackets.length > 1 && numericBrackets.every((bracket, index) => {
          if (index === 0) return true;
          const current = parseInt(bracket);
          const previous = parseInt(numericBrackets[index - 1]);
          return current === previous + 1;
        });
        if (hasConsecutiveNumbers && numericBrackets.length === validBrackets.length && validBrackets.length > 1) {
          return `${validBrackets[0]}-${validBrackets[validBrackets.length - 1]}`;
        } else {
          return validBrackets.join(", ");
        }
      }
    }
    triggerValidationForAllFields() {
      const playerRows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
      playerRows.forEach((row) => {
        const nameInput = row.querySelector(".player-name");
        const name = nameInput.value.trim();
        if (!name) {
          nameInput.classList.add("input-error");
        }
        const powerSelectorBtn = row.querySelector(".power-selector-btn");
        const bracketSelectorBtn = row.querySelector(".bracket-selector-btn");
        if (powerSelectorBtn) {
          powerSelectorBtn.dataset.validationTriggered = "true";
        }
        if (bracketSelectorBtn) {
          bracketSelectorBtn.dataset.validationTriggered = "true";
        }
        const bracketRadio = document.getElementById("bracket-radio");
        const isBracketMode = bracketRadio.checked;
        if (isBracketMode) {
          const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
          const hasSelectedBrackets = Array.from(bracketCheckboxes).some((checkbox) => checkbox.checked);
          if (!hasSelectedBrackets) {
            bracketSelectorBtn.classList.add("error");
          }
        } else {
          const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
          const hasSelectedPowers = Array.from(powerCheckboxes).some((checkbox) => checkbox.checked);
          if (!hasSelectedPowers) {
            powerSelectorBtn.classList.add("error");
          }
        }
      });
    }
    // Helper method to manually update button texts for a row
    updateButtonTextsForRow(row) {
      const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
      const powerSelectorBtn = row.querySelector(".power-selector-btn");
      if (powerSelectorBtn) {
        const selectedPowers = [];
        powerCheckboxes.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedPowers.push(parseFloat(checkbox.value));
          }
        });
        if (selectedPowers.length === 0) {
          powerSelectorBtn.textContent = "Select Power Levels";
          powerSelectorBtn.classList.remove("has-selection");
        } else {
          selectedPowers.sort((a, b) => a - b);
          let displayText;
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
              displayText = `Power: ${selectedPowers.join(", ")}`;
            } else {
              displayText = `Power: ${min}-${max} (${selectedPowers.length} levels)`;
            }
          }
          powerSelectorBtn.textContent = displayText;
          powerSelectorBtn.classList.add("has-selection");
        }
      }
      const bracketCheckboxes = row.querySelectorAll('.bracket-checkbox input[type="checkbox"]');
      const bracketSelectorBtn = row.querySelector(".bracket-selector-btn");
      if (bracketSelectorBtn) {
        const selectedBrackets = [];
        bracketCheckboxes.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedBrackets.push(checkbox.value);
          }
        });
        if (selectedBrackets.length === 0) {
          bracketSelectorBtn.textContent = "Select Brackets";
          bracketSelectorBtn.classList.remove("has-selection");
        } else {
          let displayText;
          if (selectedBrackets.length === 1) {
            displayText = `Bracket: ${selectedBrackets[0]}`;
          } else {
            displayText = `Brackets: ${selectedBrackets.join(", ")}`;
          }
          bracketSelectorBtn.textContent = displayText;
          bracketSelectorBtn.classList.add("has-selection");
        }
      }
    }
    /**
     * Update player numbers for all rows to maintain contiguous numbering
     */
    updatePlayerNumbers() {
      const playerRows = this.playerRowsContainer.querySelectorAll(".player-row");
      playerRows.forEach((row, index) => {
        const numberElement = row.querySelector(".player-number");
        if (numberElement) {
          numberElement.textContent = (index + 1).toString();
        }
      });
    }
  };

  // src/main.ts
  function generateGroupColorCSS() {
    const totalGroups = 50;
    const hueStep = 360 / totalGroups;
    const randomOffset = Math.floor(Math.random() * 360);
    const minSpacing = 25;
    const hues = [];
    for (let i = 0; i < totalGroups; i++) {
      const goldenRatio = 137.5;
      const hue = (randomOffset + i * goldenRatio) % 360;
      hues.push(Math.round(hue));
    }
    let css = "";
    for (let i = 1; i <= totalGroups; i++) {
      const hue = hues[i - 1];
      const saturation = 70 + Math.floor(Math.random() * 20);
      const borderLightness = 50;
      const backgroundLightness = 28 + Math.floor(Math.random() * 8);
      css += `
.player-row .group-select.group-${i} {
    border-color: hsl(${hue}, ${saturation}%, ${borderLightness}%) !important;
    background-color: hsl(${hue}, ${saturation}%, ${backgroundLightness}%) !important;
}`;
      css += `
.group-select option[value="group-${i}"] {
    background-color: hsl(${hue}, ${saturation}%, ${backgroundLightness}%);
}`;
    }
    const styleElement = document.createElement("style");
    styleElement.id = "dynamic-group-colors";
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }
  document.addEventListener("DOMContentLoaded", () => {
    generateGroupColorCSS();
    const uiManager = new UIManager();
    uiManager.resetAll();
  });
})();
