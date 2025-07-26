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
    }
    getNextPlayerId() {
      return this.nextPlayerId++;
    }
    resetPlayerIds() {
      this.nextPlayerId = 0;
    }
    getNextGroupId() {
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
      const powerCheckboxes = row.querySelectorAll('.power-checkbox input[type="checkbox"]');
      nameInput.classList.remove("input-error");
      const name = nameInput.value.trim();
      const powerData = parsePowerLevels(powerCheckboxes);
      if (!name) {
        nameInput.classList.add("input-error");
        return null;
      }
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
    handleGroupChange(playerRowsContainer) {
      this.groups.clear();
      const allRows = Array.from(playerRowsContainer.querySelectorAll(".player-row"));
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
        if (select.value === "new-group") {
          let newGroupId = "";
          if (!select.dataset.createdGroupId) {
            let groupNum = 1;
            while (existingGroupIds.has(`group-${groupNum}`)) {
              groupNum++;
            }
            newGroupId = `group-${groupNum}`;
            existingGroupIds.add(newGroupId);
            select.dataset.createdGroupId = newGroupId;
          } else {
            newGroupId = select.dataset.createdGroupId;
          }
          const player = this.getPlayerFromRow(row);
          if (player) {
            if (!this.groups.has(newGroupId)) this.groups.set(newGroupId, []);
            this.groups.get(newGroupId).push(player);
          }
        } else if (select.value.startsWith("group-")) {
          const player = this.getPlayerFromRow(row);
          if (player) {
            if (!this.groups.has(select.value)) this.groups.set(select.value, []);
            this.groups.get(select.value).push(player);
          }
        }
      });
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
        if (createdId && createdGroupIds.has(createdId)) {
          select.value = createdId;
        } else {
          select.value = currentValue;
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
  };

  // src/pod-generator.ts
  var PodGenerator = class {
    generatePodsWithBacktracking(items, targetSizes, leniencySettings) {
      const totalPlayers = items.reduce((sum, item) => sum + ("size" in item ? item.size : 1), 0);
      if (totalPlayers >= 3 && totalPlayers <= 5) {
        const allPlayersInPod = items.flatMap(
          (item) => "players" in item ? item.players : [item]
        );
        const bestPower = this.findBestCommonPowerLevel(allPlayersInPod);
        if (bestPower !== null) {
          return {
            pods: [{ players: items, power: bestPower }],
            unassigned: []
          };
        } else {
          return { pods: [], unassigned: items };
        }
      }
      const pods = this.findOptimalPodAssignment(items, targetSizes, leniencySettings);
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
      const unassigned = items.filter((item) => {
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
        const compatibleVirtualPlayers = availableVirtualPlayers.filter(
          (vp) => Math.abs(vp.powerLevel - basePowerLevel) <= tolerance
        );
        const sortedCompatiblePlayers = compatibleVirtualPlayers.sort((a, b) => {
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
    setCurrentPods(pods) {
      this.currentPods = [...pods];
    }
    moveItemBetweenPods(itemData, targetPodIndex) {
      const sourcePodIndex = itemData.podIndex;
      const itemIndex = parseInt(itemData.itemIndex);
      let itemToMove = null;
      if (sourcePodIndex === "unassigned") {
        return;
      } else {
        const sourcePod = this.currentPods[parseInt(sourcePodIndex)];
        itemToMove = sourcePod.players[itemIndex];
        sourcePod.players.splice(itemIndex, 1);
        sourcePod.power = this.playerManager.calculatePodPower(sourcePod.players);
      }
      if (!itemToMove) return;
      if (targetPodIndex === "unassigned") {
        return;
      } else {
        const targetPod = this.currentPods[parseInt(targetPodIndex)];
        targetPod.players.push(itemToMove);
        targetPod.power = this.playerManager.calculatePodPower(targetPod.players);
      }
      this.onPodsChanged(this.currentPods);
    }
  };

  // src/display-mode.ts
  var DisplayModeManager = class {
    constructor() {
      this.isDisplayMode = false;
      this.handleKeyDown = null;
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
      currentPods.forEach((pod, index) => {
        const podElement = document.createElement("div");
        podElement.style.display = "flex";
        podElement.style.flexDirection = "column";
        podElement.style.background = "#2a2a2a";
        podElement.style.border = "2px solid #4a4a4a";
        podElement.style.borderRadius = "8px";
        podElement.style.padding = "15px";
        podElement.style.boxSizing = "border-box";
        podElement.style.minHeight = "0";
        podElement.classList.add(`pod-color-${index % 10}`);
        const title = document.createElement("h3");
        title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
        title.style.fontSize = "1.6rem";
        title.style.margin = "0 0 15px 0";
        title.style.textAlign = "center";
        title.style.color = "#ffffff";
        title.style.fontWeight = "bold";
        title.style.flexShrink = "0";
        podElement.appendChild(title);
        const list = document.createElement("ul");
        list.style.flexGrow = "1";
        list.style.display = "flex";
        list.style.flexDirection = "column";
        list.style.justifyContent = "flex-start";
        list.style.fontSize = "1.1rem";
        list.style.lineHeight = "1.4";
        list.style.margin = "0";
        list.style.padding = "0";
        list.style.listStyle = "none";
        list.style.overflowY = "auto";
        pod.players.forEach((item) => {
          if ("players" in item) {
            const groupItem = document.createElement("li");
            groupItem.style.marginBottom = "6px";
            groupItem.style.color = "#ffffff";
            groupItem.style.padding = "4px 0";
            groupItem.innerHTML = `<strong style="color: var(--accent-color);">Group ${item.id.split("-")[1]} (Avg Power: ${item.averagePower}):</strong>`;
            const subList = document.createElement("ul");
            subList.style.margin = "0";
            subList.style.padding = "0 0 0 20px";
            subList.style.listStyle = "none";
            item.players.forEach((p) => {
              const subItem = document.createElement("li");
              subItem.textContent = `${p.name} (P: ${p.powerRange})`;
              subItem.style.marginBottom = "2px";
              subItem.style.color = "#cccccc";
              subList.appendChild(subItem);
            });
            groupItem.appendChild(subList);
            list.appendChild(groupItem);
          } else {
            const playerItem = document.createElement("li");
            playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
            playerItem.style.marginBottom = "6px";
            playerItem.style.color = "#ffffff";
            playerItem.style.padding = "4px 0";
            list.appendChild(playerItem);
          }
        });
        podElement.appendChild(list);
        podsGrid.appendChild(podElement);
      });
      displayOutput.appendChild(podsGrid);
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
    constructor() {
      this.currentPods = [];
      this.playerRowsContainer = document.getElementById("player-rows");
      this.outputSection = document.getElementById("output-section");
      this.displayModeBtn = document.getElementById("display-mode-btn");
      this.playerRowTemplate = document.getElementById("player-row-template");
      this.playerManager = new PlayerManager();
      this.podGenerator = new PodGenerator();
      this.dragDropManager = new DragDropManager(this.playerManager, (pods) => this.renderPods(pods));
      this.displayModeManager = new DisplayModeManager();
      this.initializeEventListeners();
    }
    initializeEventListeners() {
      const addPlayerBtn = document.getElementById("add-player-btn");
      const generatePodsBtn = document.getElementById("generate-pods-btn");
      const resetAllBtn = document.getElementById("reset-all-btn");
      addPlayerBtn.addEventListener("click", () => this.addPlayerRow());
      generatePodsBtn.addEventListener("click", () => this.generatePods());
      resetAllBtn.addEventListener("click", () => this.resetAll());
      this.displayModeBtn.addEventListener("click", () => this.displayModeManager.enterDisplayMode(this.currentPods));
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
        } else {
          selectedPowers.sort((a, b) => a - b);
          let displayText;
          if (selectedPowers.length === 1) {
            displayText = `Power: ${selectedPowers[0]}`;
          } else {
            const min = selectedPowers[0];
            const max = selectedPowers[selectedPowers.length - 1];
            const isContiguous = selectedPowers.every(
              (power, index) => index === 0 || power === selectedPowers[index - 1] + 0.5
            );
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
            if (value >= start && value <= end) {
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
      updateButtonText();
      const removeBtn = newRow.querySelector(".remove-player-btn");
      removeBtn.addEventListener("click", () => {
        this.playerRowsContainer.removeChild(newRow);
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
      });
      const groupSelect = newRow.querySelector(".group-select");
      groupSelect.addEventListener("change", () => {
        this.playerManager.handleGroupChange(this.playerRowsContainer);
        this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
      });
      this.playerRowsContainer.appendChild(newRow);
      this.playerManager.updateAllGroupDropdowns(this.playerRowsContainer);
    }
    generatePods() {
      this.outputSection.innerHTML = "";
      this.playerManager.handleGroupChange(this.playerRowsContainer);
      const allPlayers = [];
      const playerRows = Array.from(this.playerRowsContainer.querySelectorAll(".player-row"));
      let validationFailed = false;
      for (const row of playerRows) {
        const player = this.playerManager.getPlayerFromRow(row);
        if (player) {
          allPlayers.push(player);
        } else {
          validationFailed = true;
        }
      }
      if (validationFailed) {
        alert("Please fix the errors before generating pods.");
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
      const result = this.podGenerator.generatePodsWithBacktracking(itemsToPod, podSizes, leniencySettings);
      const pods = result.pods;
      let unassignedPlayers = result.unassigned;
      this.renderPods(pods, unassignedPlayers);
    }
    renderPods(pods, unassignedPlayers = []) {
      this.currentPods = [...pods];
      this.dragDropManager.setCurrentPods(this.currentPods);
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
        title.textContent = `Pod ${index + 1} (Power: ${pod.power})`;
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
            groupItem.innerHTML = `<strong>Group ${item.id.split("-")[1]} (Avg Power: ${item.averagePower}):</strong>`;
            const subList = document.createElement("ul");
            item.players.forEach((p) => {
              const subItem = document.createElement("li");
              subItem.textContent = `${p.name} (P: ${p.powerRange})`;
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
            playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
            list.appendChild(playerItem);
          }
        });
        podElement.appendChild(list);
        podsContainer.appendChild(podElement);
      });
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
            groupItem.innerHTML = `<strong>Group ${item.id.split("-")[1]} (Avg Power: ${item.averagePower}):</strong>`;
            const subList = document.createElement("ul");
            item.players.forEach((p) => {
              const subItem = document.createElement("li");
              subItem.textContent = `${p.name} (P: ${p.powerRange})`;
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
            playerItem.textContent = `${item.name} (P: ${item.powerRange})`;
            list.appendChild(playerItem);
          }
        });
        unassignedElement.appendChild(list);
        podsContainer.appendChild(unassignedElement);
      }
      this.outputSection.appendChild(podsContainer);
    }
    resetAll() {
      this.playerRowsContainer.innerHTML = "";
      this.outputSection.innerHTML = "";
      this.playerManager.clearGroups();
      this.playerManager.resetPlayerIds();
      this.playerManager.resetGroupIds();
      this.currentPods = [];
      const noLeniencyRadio = document.getElementById("no-leniency-radio");
      noLeniencyRadio.checked = true;
      for (let i = 0; i < 4; i++) {
        this.addPlayerRow();
      }
    }
  };

  // src/main.ts
  document.addEventListener("DOMContentLoaded", () => {
    const uiManager = new UIManager();
    uiManager.resetAll();
  });
})();
