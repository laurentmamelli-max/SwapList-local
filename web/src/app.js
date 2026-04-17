(function () {
  "use strict";

  const SWAP_TAIL_GCODE =
    ";swap \n" +
    "G0 X-10 F5000; \n " +
    "G0 Z175; \n " +
    "G0 Y-5 F2000;  \n  " +
    "G0 Y186.5 F2000;  \n  " +
    "G0 Y182 F10000;  \n  " +
    "G0 Z186 ; \n " +
    "G0 Y120 F500; \n " +
    "G0 Y-4 Z175 F5000; \n " +
    "G0 Y145; \n  " +
    "G0 Y115 F1000; \n " +
    "G0 Y25 F500; \n " +
    "G0 Y85 F1000; \n " +
    "G0 Y180 F2000; \n " +
    "G4 P500; wait  \n " +
    "G0 Y186.5 F200; \n " +
    "G4 P500; wait  \n " +
    "G0 Y3 F3000; \n " +
    "G0 Y-5 F200; \n" +
    "G4 P500; wait  \n " +
    "G0 Y10 F1000; \n " +
    "G0 Z100 Y186 F2000; \n " +
    "G0 Y150; \n " +
    "G4 P1000; wait  \n ";

  const STARTER_SWAP_GCODE =
    ";swap ini code\n" +
    "G91 ; \n" +
    "G0 Z50 F1000; \n" +
    "G0 Z-20; \n" +
    "G90; \n " +
    "G28 XY; \n " +
    "G0 Y-4 F5000; grab \n " +
    "G0 Y145;  pull and fix the plate\n" +
    "G0 Y115 F1000; rehook \n " +
    "G0 Y180 F5000; pull\n " +
    "G4 P500; wait  \n " +
    "G0 Y186.5 F200; fix the plate\n " +
    "G4 P500; wait  \n " +
    "G0 Y3 F15000; back \n " +
    "G0 Y-5 F200; snap \n" +
    "G4 P500; wait  \n " +
    "G0 Y10 F1000; load \n " +
    "G0 Y20 F15000; ready \n ";

  const MODEL_SETTINGS_TEMPLATE =
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<config>\n" +
    "  <plate>\n" +
    "    <metadata key=\"plater_id\" value=\"1\"/>\n" +
    "    <metadata key=\"plater_name\" value=\"SWAP\"/>\n" +
    "    <metadata key=\"locked\" value=\"false\"/>\n" +
    "    <metadata key=\"gcode_file\" value=\"Metadata/plate_1.gcode\"/>\n" +
    "    <metadata key=\"thumbnail_file\" value=\"Metadata/plate_1.png\"/>\n" +
    "    <metadata key=\"top_file\" value=\"Metadata/top_1.png\"/>\n" +
    "    <metadata key=\"pick_file\" value=\"Metadata/pick_1.png\"/>\n" +
    "    <metadata key=\"pattern_bbox_file\" value=\"Metadata/plate_1.json\"/>\n" +
    "  </plate>\n" +
    "</config> ";

  const SUPPORTED_EXTENSIONS = [".3mf", ".gcode.3mf"];

  const state = {
    fileCounter: 0,
    queueCounter: 0,
    files: [],
    queue: []
  };

  const ui = {};

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    ui.fileInput = document.getElementById("file-input");
    ui.dropzone = document.getElementById("dropzone");
    ui.outputName = document.getElementById("output-name");
    ui.loopRepeats = document.getElementById("loop-repeats");
    ui.exportButton = document.getElementById("export-button");
    ui.resetButton = document.getElementById("reset-button");
    ui.metricDuration = document.getElementById("metric-duration");
    ui.metricPlates = document.getElementById("metric-plates");
    ui.filamentSummary = document.getElementById("filament-summary");
    ui.queueEmpty = document.getElementById("queue-empty");
    ui.queueList = document.getElementById("queue-list");
    ui.logOutput = document.getElementById("log-output");
    ui.progressBarFill = document.getElementById("progress-bar-fill");
    ui.progressText = document.getElementById("progress-text");

    ui.fileInput.addEventListener("change", onFileInputChange);
    ui.dropzone.addEventListener("dragover", onDragOver);
    ui.dropzone.addEventListener("dragleave", onDragLeave);
    ui.dropzone.addEventListener("drop", onDrop);
    ui.exportButton.addEventListener("click", exportSwapFile);
    ui.resetButton.addEventListener("click", resetApp);
    ui.loopRepeats.addEventListener("input", renderAll);

    setProgress(0, "Idle");
    renderAll();
  }

  function onFileInputChange(event) {
    if (!event.target.files || !event.target.files.length) {
      return;
    }
    importFiles(Array.from(event.target.files));
    event.target.value = "";
  }

  function onDragOver(event) {
    event.preventDefault();
    ui.dropzone.classList.add("is-dragover");
  }

  function onDragLeave(event) {
    event.preventDefault();
    ui.dropzone.classList.remove("is-dragover");
  }

  function onDrop(event) {
    event.preventDefault();
    ui.dropzone.classList.remove("is-dragover");
    if (!event.dataTransfer || !event.dataTransfer.files.length) {
      return;
    }
    importFiles(Array.from(event.dataTransfer.files));
  }

  async function importFiles(files) {
    logLine("Import de " + files.length + " fichier(s)...");

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const fileLabel = file.name || "fichier-sans-nom";

      if (!isSupportedFile(fileLabel)) {
        logLine("Ignore: " + fileLabel + " n'est pas un .3mf supporte.");
        continue;
      }

      setProgress(Math.round(((index + 1) / files.length) * 30), "Lecture des projets...");

      try {
        const importedFile = await parse3mfFile(file);
        state.files.push(importedFile);
        state.queue.push.apply(state.queue, importedFile.plates.map(buildQueueItem));

        if (!ui.outputName.value) {
          ui.outputName.placeholder = computeDefaultOutputName();
        }

        logLine(
          "OK: " +
            fileLabel +
            " charge avec " +
            importedFile.plates.length +
            " plate(s)."
        );
      } catch (error) {
        logLine("Erreur avec " + fileLabel + ": " + error.message);
      }
    }

    setProgress(0, "Idle");
    renderAll();
  }

  function isSupportedFile(fileName) {
    const lower = fileName.toLowerCase();
    return SUPPORTED_EXTENSIONS.some(function (extension) {
      return lower.endsWith(extension);
    });
  }

  async function parse3mfFile(sourceFile) {
    const zip = await JSZip.loadAsync(sourceFile);

    const modelSettingsEntry = zip.file("Metadata/model_settings.config");
    const sliceInfoEntry = zip.file("Metadata/slice_info.config");

    if (!modelSettingsEntry || !sliceInfoEntry) {
      throw new Error("Metadata/model_settings.config ou Metadata/slice_info.config manquant.");
    }

    const modelSettingsText = await modelSettingsEntry.async("text");
    const sliceInfoText = await sliceInfoEntry.async("text");
    const projectSettingsEntry = zip.file("Metadata/project_settings.config");
    const projectSettingsText = projectSettingsEntry
      ? await projectSettingsEntry.async("text")
      : null;

    const parser = new DOMParser();
    const modelDoc = parser.parseFromString(modelSettingsText, "text/xml");
    const sliceDoc = parser.parseFromString(sliceInfoText, "text/xml");

    const modelPlates = Array.from(modelDoc.getElementsByTagName("plate"));
    if (!modelPlates.length) {
      throw new Error("Aucune plate detectee dans model_settings.config.");
    }

    const importedFile = {
      id: "file-" + (++state.fileCounter),
      name: sourceFile.name,
      sourceFile: sourceFile,
      modelSettingsText: modelSettingsText,
      sliceInfoText: sliceInfoText,
      projectSettingsText: projectSettingsText,
      plates: [],
      maxFilamentSlot: 0
    };

    for (let plateIndex = 0; plateIndex < modelPlates.length; plateIndex += 1) {
      const modelPlate = modelPlates[plateIndex];
      const gcodePath = getMetadataValue(modelPlate, "gcode_file");
      if (!gcodePath) {
        continue;
      }

      const gcodeEntry = zip.file(gcodePath);
      if (!gcodeEntry) {
        continue;
      }

      const thumbnailPath = getMetadataValue(modelPlate, "thumbnail_file");
      const gcodeText = await gcodeEntry.async("text");
      const slicePlate = findSlicePlate(sliceDoc, plateIndex + 1);
      const filaments = parseFilaments(slicePlate);
      const duration = parseDuration(gcodeText);
      let thumbnailUrl = null;

      if (thumbnailPath) {
        const thumbnailEntry = zip.file(thumbnailPath);
        if (thumbnailEntry) {
          const thumbBlob = await thumbnailEntry.async("blob");
          thumbnailUrl = URL.createObjectURL(thumbBlob);
        }
      }

      importedFile.plates.push({
        id: "plate-" + importedFile.id + "-" + (plateIndex + 1),
        fileId: importedFile.id,
        fileName: importedFile.name,
        order: plateIndex,
        path: gcodePath,
        displayName: derivePlateName(gcodePath),
        thumbnailUrl: thumbnailUrl,
        durationText: duration.label,
        durationSeconds: duration.seconds,
        filaments: filaments,
        gcodeText: gcodeText
      });

      filaments.forEach(function (filament) {
        importedFile.maxFilamentSlot = Math.max(importedFile.maxFilamentSlot, filament.slot);
      });
    }

    if (!importedFile.plates.length) {
      throw new Error("Aucune plate exploitable n'a ete trouvee.");
    }

    return importedFile;
  }

  function getMetadataValue(parent, key) {
    const metadataNodes = Array.from(parent.getElementsByTagName("metadata"));
    const match = metadataNodes.find(function (node) {
      return node.getAttribute("key") === key;
    });
    return match ? match.getAttribute("value") : null;
  }

  function findSlicePlate(sliceDoc, index) {
    const plates = Array.from(sliceDoc.getElementsByTagName("plate"));
    const directMatch = plates.find(function (plate) {
      const indexMetadata = Array.from(plate.getElementsByTagName("metadata")).find(function (node) {
        return node.getAttribute("key") === "index";
      });
      return indexMetadata && Number(indexMetadata.getAttribute("value")) === index;
    });

    return directMatch || plates[0] || null;
  }

  function parseFilaments(slicePlate) {
    if (!slicePlate) {
      return [];
    }

    return Array.from(slicePlate.getElementsByTagName("filament")).map(function (filamentNode) {
      return {
        slot: Number(filamentNode.getAttribute("id")) || 0,
        type: filamentNode.getAttribute("type") || "unknown",
        color: filamentNode.getAttribute("color") || "#b8b8b8",
        usedM: Number(filamentNode.getAttribute("used_m")) || 0,
        usedG: Number(filamentNode.getAttribute("used_g")) || 0
      };
    });
  }

  function parseDuration(gcodeText) {
    const match = gcodeText.match(/total estimated time:\s*([^\n\r]+)/i);
    const label = match ? match[1].trim() : "0m 0s";
    return {
      label: label,
      seconds: durationStringToSeconds(label)
    };
  }

  function durationStringToSeconds(label) {
    let seconds = 0;
    const day = label.match(/(\d+)\s*d/i);
    const hour = label.match(/(\d+)\s*h/i);
    const minute = label.match(/(\d+)\s*m/i);
    const second = label.match(/(\d+)\s*s/i);

    if (day) {
      seconds += Number(day[1]) * 86400;
    }
    if (hour) {
      seconds += Number(hour[1]) * 3600;
    }
    if (minute) {
      seconds += Number(minute[1]) * 60;
    }
    if (second) {
      seconds += Number(second[1]);
    }

    return seconds;
  }

  function derivePlateName(path) {
    const raw = path.replace(/^Metadata\//i, "").replace(/\.gcode$/i, "");
    return raw.replace(/_/g, " ");
  }

  function buildQueueItem(plate) {
    return {
      id: "queue-" + (++state.queueCounter),
      fileId: plate.fileId,
      plateId: plate.id,
      title: plate.displayName,
      fileName: plate.fileName,
      durationText: plate.durationText,
      durationSeconds: plate.durationSeconds,
      filaments: plate.filaments,
      gcodeText: plate.gcodeText,
      thumbnailUrl: plate.thumbnailUrl,
      repeats: 1
    };
  }

  function computeDefaultOutputName() {
    if (!state.files.length) {
      return "mix";
    }
    if (state.files.length === 1) {
      return state.files[0].name.replace(/\.gcode\.3mf$/i, "").replace(/\.3mf$/i, "");
    }
    return "mix";
  }

  function renderAll() {
    renderQueue();
    renderStats();
    renderControls();
  }

  function renderQueue() {
    ui.queueList.innerHTML = "";

    if (!state.queue.length) {
      ui.queueEmpty.hidden = false;
      return;
    }

    ui.queueEmpty.hidden = true;

    state.queue.forEach(function (item, index) {
      const listItem = document.createElement("li");
      listItem.className = "queue-item" + (Number(item.repeats) <= 0 ? " is-disabled" : "");

      const thumb = document.createElement("div");
      thumb.className = "queue-thumb";
      if (item.thumbnailUrl) {
        const image = document.createElement("img");
        image.src = item.thumbnailUrl;
        image.alt = item.title;
        thumb.appendChild(image);
      } else {
        const placeholder = document.createElement("span");
        placeholder.textContent = "No preview";
        thumb.appendChild(placeholder);
      }

      const main = document.createElement("div");
      main.className = "queue-main";

      const titleRow = document.createElement("div");
      titleRow.className = "queue-title-row";
      titleRow.innerHTML =
        "<div>" +
        "<h3 class=\"queue-title\">" + escapeHtml(item.title) + "</h3>" +
        "<p class=\"queue-file\">" + escapeHtml(item.fileName) + "</p>" +
        "</div>" +
        "<span class=\"badge\">#" + String(index + 1).padStart(2, "0") + "</span>";

      const badges = document.createElement("div");
      badges.className = "queue-badges";
      badges.innerHTML =
        "<span class=\"badge\">Temps: " + escapeHtml(item.durationText) + "</span>" +
        "<span class=\"badge\">Filaments: " + item.filaments.length + "</span>";

      const filamentRow = document.createElement("div");
      filamentRow.className = "queue-filaments";
      if (item.filaments.length) {
        item.filaments.forEach(function (filament) {
          const tag = document.createElement("span");
          tag.className = "filament-tag";
          tag.innerHTML =
            "<span class=\"swatch\" style=\"background:" + escapeHtml(filament.color) + "\"></span>" +
            "Slot " + filament.slot + " " + escapeHtml(filament.type) +
            " " + round2(filament.usedG) + "g";
          filamentRow.appendChild(tag);
        });
      } else {
        const empty = document.createElement("span");
        empty.className = "empty-text";
        empty.textContent = "Aucune info filament";
        filamentRow.appendChild(empty);
      }

      const controls = document.createElement("div");
      controls.className = "queue-controls";

      const repeatLabel = document.createElement("label");
      repeatLabel.innerHTML = "Repeats";

      const repeatInput = document.createElement("input");
      repeatInput.type = "number";
      repeatInput.min = "0";
      repeatInput.step = "1";
      repeatInput.value = String(item.repeats);
      repeatInput.addEventListener("input", function () {
        item.repeats = sanitizeRepeatValue(repeatInput.value);
        repeatInput.value = String(item.repeats);
        renderAll();
      });

      repeatLabel.appendChild(repeatInput);
      controls.appendChild(repeatLabel);

      const actions = document.createElement("div");
      actions.className = "queue-actions";

      const upButton = buildActionButton("Monter", function () {
        moveQueueItem(index, -1);
      }, index === 0);
      const downButton = buildActionButton("Descendre", function () {
        moveQueueItem(index, 1);
      }, index === state.queue.length - 1);
      const removeButton = buildActionButton("Desactiver", function () {
        item.repeats = 0;
        renderAll();
      }, Number(item.repeats) === 0);
      const enableButton = buildActionButton("Activer", function () {
        item.repeats = Math.max(1, Number(item.repeats) || 1);
        renderAll();
      }, Number(item.repeats) > 0);

      actions.appendChild(upButton);
      actions.appendChild(downButton);
      actions.appendChild(removeButton);
      actions.appendChild(enableButton);

      main.appendChild(titleRow);
      main.appendChild(badges);
      main.appendChild(filamentRow);
      main.appendChild(controls);

      listItem.appendChild(thumb);
      listItem.appendChild(main);
      listItem.appendChild(actions);

      ui.queueList.appendChild(listItem);
    });
  }

  function buildActionButton(label, handler, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", handler);
    return button;
  }

  function sanitizeRepeatValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 1;
    }
    return Math.max(0, Math.floor(parsed));
  }

  function moveQueueItem(index, delta) {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= state.queue.length) {
      return;
    }
    const temp = state.queue[index];
    state.queue[index] = state.queue[targetIndex];
    state.queue[targetIndex] = temp;
    renderAll();
  }

  function renderStats() {
    const loopRepeats = getLoopRepeats();
    let totalDuration = 0;
    let totalPlates = 0;
    const filamentBySlot = new Map();

    state.queue.forEach(function (item) {
      const repeats = Number(item.repeats) || 0;
      if (repeats <= 0) {
        return;
      }

      totalDuration += item.durationSeconds * repeats;
      totalPlates += repeats;

      item.filaments.forEach(function (filament) {
        const key = String(filament.slot);
        if (!filamentBySlot.has(key)) {
          filamentBySlot.set(key, {
            slot: filament.slot,
            type: filament.type,
            color: filament.color,
            usedM: 0,
            usedG: 0
          });
        }

        const aggregate = filamentBySlot.get(key);
        aggregate.usedM += filament.usedM * repeats;
        aggregate.usedG += filament.usedG * repeats;
      });
    });

    totalDuration *= loopRepeats;
    totalPlates *= loopRepeats;

    filamentBySlot.forEach(function (aggregate) {
      aggregate.usedM *= loopRepeats;
      aggregate.usedG *= loopRepeats;
    });

    ui.metricDuration.textContent = secondsToDhms(totalDuration);
    ui.metricPlates.textContent = String(totalPlates);

    ui.filamentSummary.innerHTML = "";
    if (!filamentBySlot.size) {
      const empty = document.createElement("span");
      empty.className = "empty-text";
      empty.textContent = state.queue.length ? "Aucune plate active" : "Aucun fichier charge";
      ui.filamentSummary.appendChild(empty);
      return;
    }

    Array.from(filamentBySlot.values())
      .sort(function (a, b) {
        return a.slot - b.slot;
      })
      .forEach(function (aggregate) {
        const chip = document.createElement("div");
        chip.className = "filament-chip";
        chip.innerHTML =
          "<strong>Slot " + aggregate.slot + "</strong>" +
          "<span>" + escapeHtml(aggregate.type) + "</span>" +
          "<span>" + round2(aggregate.usedM) + "m / " + round2(aggregate.usedG) + "g</span>";
        chip.style.borderTop = "4px solid " + aggregate.color;
        ui.filamentSummary.appendChild(chip);
      });
  }

  function renderControls() {
    const hasActiveItems = state.queue.some(function (item) {
      return Number(item.repeats) > 0;
    });
    ui.exportButton.disabled = !hasActiveItems;
  }

  async function exportSwapFile() {
    try {
      const selectedItems = getSelectedItems();
      if (!selectedItems.length) {
        throw new Error("Aucune plate active a exporter.");
      }

      setProgress(5, "Preparation de l'export...");
      logLine("Export SWAP en cours...");

      const templateFile = chooseTemplateFile(selectedItems);
      const templateZip = await JSZip.loadAsync(templateFile.sourceFile);
      const aggregatedFilaments = aggregateFilamentsForSelectedItems(selectedItems);
      const queueGcodes = buildLoopedGcodeQueue(selectedItems);
      const optimizedQueue = removeRedundantAmsSwaps(queueGcodes);
      const gcodeBlob = new Blob(optimizedQueue, { type: "text/x-gcode" });

      setProgress(35, "Mise a jour du projet 3MF...");
      cleanTemplateZip(templateZip);
      applyProjectSettings(templateZip, selectedItems);
      updateSliceInfo(templateZip, templateFile, aggregatedFilaments);
      templateZip.file("Metadata/model_settings.config", MODEL_SETTINGS_TEMPLATE);
      templateZip.file("Metadata/plate_1.gcode", gcodeBlob);

      setProgress(55, "Calcul du MD5...");
      const md5 = await computeBlobMd5(gcodeBlob, function (percent) {
        setProgress(55 + Math.round(percent * 0.18), "Calcul du MD5...");
      });
      templateZip.file("Metadata/plate_1.gcode.md5", md5);

      setProgress(75, "Compression finale...");
      const archiveBlob = await templateZip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 3 }
        },
        function (metadata) {
          setProgress(75 + Math.round(metadata.percent * 0.25), "Compression finale...");
        }
      );

      const outputName = (ui.outputName.value || ui.outputName.placeholder || "mix").trim() || "mix";
      downloadBlob(outputName + ".swap.3mf", archiveBlob);
      logLine("Export termine: " + outputName + ".swap.3mf");
      setProgress(100, "Export termine");
      window.setTimeout(function () {
        setProgress(0, "Idle");
      }, 1200);
    } catch (error) {
      logLine("Export impossible: " + error.message);
      setProgress(0, "Erreur");
    }
  }

  function getSelectedItems() {
    const loopRepeats = getLoopRepeats();
    const selected = [];

    state.queue.forEach(function (item) {
      const repeats = Number(item.repeats) || 0;
      for (let copyIndex = 0; copyIndex < repeats; copyIndex += 1) {
        selected.push(item);
      }
    });

    if (loopRepeats <= 1) {
      return selected;
    }

    const looped = [];
    for (let loopIndex = 0; loopIndex < loopRepeats; loopIndex += 1) {
      looped.push.apply(looped, selected);
    }
    return looped;
  }

  function chooseTemplateFile(selectedItems) {
    const selectedFileIds = new Set(selectedItems.map(function (item) {
      return item.fileId;
    }));

    let bestFile = null;
    state.files.forEach(function (file) {
      if (!selectedFileIds.has(file.id)) {
        return;
      }

      if (!bestFile || file.maxFilamentSlot > bestFile.maxFilamentSlot) {
        bestFile = file;
      }
    });

    if (!bestFile) {
      throw new Error("Impossible de choisir un template 3MF.");
    }

    return bestFile;
  }

  function aggregateFilamentsForSelectedItems(selectedItems) {
    const aggregate = new Map();

    selectedItems.forEach(function (item) {
      item.filaments.forEach(function (filament) {
        const key = String(filament.slot);
        if (!aggregate.has(key)) {
          aggregate.set(key, {
            slot: filament.slot,
            type: filament.type,
            color: filament.color,
            usedM: 0,
            usedG: 0
          });
        }

        const target = aggregate.get(key);
        target.usedM += filament.usedM;
        target.usedG += filament.usedG;
      });
    });

    return Array.from(aggregate.values()).sort(function (a, b) {
      return a.slot - b.slot;
    });
  }

  function buildLoopedGcodeQueue(selectedItems) {
    if (!selectedItems.length) {
      return [];
    }

    const queue = selectedItems.map(function (item) {
      return item.gcodeText + SWAP_TAIL_GCODE;
    });
    queue[0] = STARTER_SWAP_GCODE + queue[0];
    return queue;
  }

  function removeRedundantAmsSwaps(gcodes) {
    const amsFlag = "\nM620 S";
    const positions = [];

    gcodes.forEach(function (gcode, plateIndex) {
      let cursor = gcode.indexOf(amsFlag);
      while (cursor !== -1) {
        let value = gcode.substring(cursor + 7, cursor + 10);
        if (value[2] === "\n" || value[2] === " ") {
          value = value.substring(0, 2);
        }

        positions.push({
          plateIndex: plateIndex,
          index: cursor + 1,
          value: value
        });

        cursor = gcode.indexOf(amsFlag, cursor + 1);
      }
    });

    for (let i = 0; i < positions.length - 1; i += 1) {
      if (
        positions[i].value === "255" &&
        positions[i - 1] &&
        positions[i + 1] &&
        positions[i - 1].value === positions[i + 1].value
      ) {
        gcodes[positions[i].plateIndex] = disableAmsBlock(
          gcodes[positions[i].plateIndex],
          positions[i].index
        );
        gcodes[positions[i + 1].plateIndex] = disableAmsBlock(
          gcodes[positions[i + 1].plateIndex],
          positions[i + 1].index
        );
      }
    }

    return gcodes;
  }

  function disableAmsBlock(gcode, index) {
    if (index > gcode.length - 1) {
      return gcode;
    }

    const blockEnd = gcode.substring(index).search("M621 S");
    if (blockEnd < 0) {
      return gcode;
    }

    let replacement = ";SWAP - AMS block removed";
    while (replacement.length < blockEnd - 1) {
      replacement += "/";
    }
    replacement += ";";

    if (replacement.length > 2000) {
      return gcode;
    }

    return gcode.substring(0, index) + replacement + gcode.substring(index + blockEnd);
  }

  function cleanTemplateZip(zip) {
    Object.keys(zip.files).forEach(function (path) {
      if (/^Metadata\/plate_\d+\.gcode(?:\.md5)?$/i.test(path)) {
        zip.remove(path);
      }
      if (/^Metadata\/custom_gcode_per_layer\.xml$/i.test(path)) {
        zip.remove(path);
      }
    });
  }

  function applyProjectSettings(zip, selectedItems) {
    const templateFile = chooseTemplateFile(selectedItems);
    if (templateFile.projectSettingsText) {
      zip.file("Metadata/project_settings.config", templateFile.projectSettingsText);
    }
  }

  function updateSliceInfo(zip, templateFile, aggregatedFilaments) {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const sliceInfoEntry = zip.file("Metadata/slice_info.config");
    if (!sliceInfoEntry) {
      throw new Error("Le template ne contient pas de slice_info.config.");
    }

    const existingText = templateFile.sliceInfoText;
    const sliceDoc = parser.parseFromString(existingText, "text/xml");
    const plates = Array.from(sliceDoc.getElementsByTagName("plate"));

    if (!plates.length) {
      throw new Error("slice_info.config ne contient aucune plate.");
    }

    plates.slice(1).forEach(function (plate) {
      plate.remove();
    });

    const firstPlate = plates[0];
    const metadataNodes = Array.from(firstPlate.getElementsByTagName("metadata"));
    let indexNode = metadataNodes.find(function (node) {
      return node.getAttribute("key") === "index";
    });

    if (!indexNode) {
      indexNode = sliceDoc.createElement("metadata");
      indexNode.setAttribute("key", "index");
      firstPlate.insertBefore(indexNode, firstPlate.firstChild);
    }
    indexNode.setAttribute("value", "1");

    Array.from(firstPlate.getElementsByTagName("filament")).forEach(function (node) {
      node.remove();
    });

    aggregatedFilaments.forEach(function (filament) {
      const node = sliceDoc.createElement("filament");
      node.setAttribute("id", String(filament.slot));
      node.setAttribute("type", filament.type);
      node.setAttribute("color", filament.color);
      node.setAttribute("used_m", round2(filament.usedM));
      node.setAttribute("used_g", round2(filament.usedG));
      firstPlate.appendChild(node);
    });

    const serialized = serializer.serializeToString(sliceDoc).replace(/></g, ">\n<");
    zip.file("Metadata/slice_info.config", serialized);
  }

  function computeBlobMd5(blob, onProgress) {
    return new Promise(function (resolve, reject) {
      const chunkSize = 2 * 1024 * 1024;
      const chunks = Math.ceil(blob.size / chunkSize);
      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();
      let currentChunk = 0;

      fileReader.onload = function (event) {
        spark.append(event.target.result);
        currentChunk += 1;

        if (typeof onProgress === "function") {
          onProgress(chunks ? currentChunk / chunks : 1);
        }

        if (currentChunk < chunks) {
          loadNextChunk();
        } else {
          resolve(spark.end());
        }
      };

      fileReader.onerror = function () {
        reject(new Error("Impossible de calculer le MD5 du G-code exporte."));
      };

      function loadNextChunk() {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, blob.size);
        fileReader.readAsArrayBuffer(blob.slice(start, end));
      }

      if (!blob.size) {
        resolve(spark.end());
        return;
      }

      loadNextChunk();
    });
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function resetApp() {
    state.files.forEach(function (file) {
      file.plates.forEach(function (plate) {
        if (plate.thumbnailUrl) {
          URL.revokeObjectURL(plate.thumbnailUrl);
        }
      });
    });

    state.files = [];
    state.queue = [];
    state.fileCounter = 0;
    state.queueCounter = 0;
    ui.fileInput.value = "";
    ui.outputName.value = "";
    ui.outputName.placeholder = "mix";
    ui.loopRepeats.value = "1";
    ui.logOutput.textContent = "Application reinitialisee.";
    setProgress(0, "Idle");
    renderAll();
  }

  function getLoopRepeats() {
    const parsed = Number(ui.loopRepeats.value);
    if (!Number.isFinite(parsed)) {
      return 1;
    }
    return Math.max(1, Math.floor(parsed));
  }

  function setProgress(percent, label) {
    const clamped = Math.max(0, Math.min(100, percent));
    ui.progressBarFill.style.width = clamped + "%";
    ui.progressText.textContent = label;
  }

  function logLine(message) {
    const timestamp = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    ui.logOutput.textContent += "\n[" + timestamp + "] " + message;
    ui.logOutput.scrollTop = ui.logOutput.scrollHeight;
  }

  function secondsToDhms(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return (
      (days ? days + "d " : "") +
      (hours ? hours + "h " : "") +
      minutes + "m " +
      remainingSeconds + "s"
    );
  }

  function round2(value) {
    return String(Math.round((Number(value) || 0) * 100) / 100);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
