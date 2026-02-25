import Doc from "../types/Doc";

export default class DocSelectionUI {
    static async promptSelection(docs: Doc[], title: string): Promise<Doc[] | null> {
        return new Promise((resolve) => {
            // Wrapper overlay
            const wrapper = document.createElement("div");
            wrapper.id = "wuolahextra-doc-selector";
            Object.assign(wrapper.style, {
                position: "fixed",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                zIndex: "2147483647",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: "system-ui, -apple-system, sans-serif"
            });

            const modal = document.createElement("div");
            Object.assign(modal.style, {
                background: "#1a1a1a",
                color: "#fff",
                borderRadius: "12px",
                padding: "24px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.15)",
                boxSizing: "border-box",
                overflow: "hidden"
            });

            const titleEl = document.createElement("h2");
            titleEl.textContent = `Descargar: ${title}`;
            Object.assign(titleEl.style, {
                margin: "0 0 10px 0",
                fontSize: "20px",
                fontWeight: "600"
            });

            const subtitleEl = document.createElement("p");
            subtitleEl.textContent = `Selecciona los archivos que deseas descargar (${docs.length} en total):`;
            Object.assign(subtitleEl.style, {
                margin: "0 0 15px 0",
                fontSize: "14px",
                opacity: "0.8"
            });

            const controls = document.createElement("div");
            Object.assign(controls.style, {
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                flexWrap: "wrap",
                alignItems: "center"
            });

            const btnStyle = {
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "13px",
                transition: "background 0.2s"
            };

            const selectAllBtn = document.createElement("button");
            selectAllBtn.textContent = "Seleccionar todos";
            Object.assign(selectAllBtn.style, btnStyle);
            selectAllBtn.onmouseenter = () => selectAllBtn.style.background = "rgba(255,255,255,0.2)";
            selectAllBtn.onmouseleave = () => selectAllBtn.style.background = "rgba(255,255,255,0.1)";

            const deselectAllBtn = document.createElement("button");
            deselectAllBtn.textContent = "Deseleccionar todos";
            Object.assign(deselectAllBtn.style, btnStyle);
            deselectAllBtn.onmouseenter = () => deselectAllBtn.style.background = "rgba(255,255,255,0.2)";
            deselectAllBtn.onmouseleave = () => deselectAllBtn.style.background = "rgba(255,255,255,0.1)";

            controls.appendChild(selectAllBtn);
            controls.appendChild(deselectAllBtn);

            // ── Filter section ──
            const filterSection = document.createElement("div");
            Object.assign(filterSection.style, {
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "15px",
                padding: "12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)"
            });

            const filterInputStyle = {
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "13px",
                outline: "none",
                colorScheme: "dark"
            };

            const filterLabelStyle = { fontSize: "13px", color: "#fff", opacity: "0.85", whiteSpace: "nowrap" as const };

            // -- Date row --
            const dateRow = document.createElement("div");
            Object.assign(dateRow.style, { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" });

            const dateFromLabel = document.createElement("label");
            dateFromLabel.textContent = "📅 Desde:";
            Object.assign(dateFromLabel.style, filterLabelStyle);

            const dateFromInput = document.createElement("input");
            dateFromInput.type = "date";
            Object.assign(dateFromInput.style, { ...filterInputStyle, cursor: "pointer" });

            const dateToLabel = document.createElement("label");
            dateToLabel.textContent = "Hasta:";
            Object.assign(dateToLabel.style, filterLabelStyle);

            const dateToInput = document.createElement("input");
            dateToInput.type = "date";
            Object.assign(dateToInput.style, { ...filterInputStyle, cursor: "pointer" });

            dateRow.appendChild(dateFromLabel);
            dateRow.appendChild(dateFromInput);
            dateRow.appendChild(dateToLabel);
            dateRow.appendChild(dateToInput);

            // -- Name include row --
            const includeRow = document.createElement("div");
            Object.assign(includeRow.style, { display: "flex", gap: "10px", alignItems: "center" });

            const includeLabel = document.createElement("label");
            includeLabel.textContent = "🔍 Incluir:";
            Object.assign(includeLabel.style, filterLabelStyle);

            const includeInput = document.createElement("input");
            includeInput.type = "text";
            includeInput.placeholder = "ej: tema 1, examen, práctica";
            Object.assign(includeInput.style, { ...filterInputStyle, flex: "1", minWidth: "0" });

            includeRow.appendChild(includeLabel);
            includeRow.appendChild(includeInput);

            // -- Name exclude row --
            const excludeRow = document.createElement("div");
            Object.assign(excludeRow.style, { display: "flex", gap: "10px", alignItems: "center" });

            const excludeLabel = document.createElement("label");
            excludeLabel.textContent = "🚫 Excluir:";
            Object.assign(excludeLabel.style, filterLabelStyle);

            const excludeInput = document.createElement("input");
            excludeInput.type = "text";
            excludeInput.placeholder = "ej: solución, borrador";
            Object.assign(excludeInput.style, { ...filterInputStyle, flex: "1", minWidth: "0" });

            excludeRow.appendChild(excludeLabel);
            excludeRow.appendChild(excludeInput);

            // -- Filter footer (clear + count) --
            const filterFooter = document.createElement("div");
            Object.assign(filterFooter.style, { display: "flex", gap: "10px", alignItems: "center" });

            const clearFiltersBtn = document.createElement("button");
            clearFiltersBtn.textContent = "✕ Limpiar filtros";
            Object.assign(clearFiltersBtn.style, {
                ...btnStyle,
                fontSize: "12px",
                padding: "5px 10px",
                opacity: "0.7"
            });
            clearFiltersBtn.onmouseenter = () => { clearFiltersBtn.style.background = "rgba(255,255,255,0.2)"; clearFiltersBtn.style.opacity = "1"; };
            clearFiltersBtn.onmouseleave = () => { clearFiltersBtn.style.background = "rgba(255,255,255,0.1)"; clearFiltersBtn.style.opacity = "0.7"; };

            const filterCountEl = document.createElement("span");
            Object.assign(filterCountEl.style, {
                fontSize: "12px",
                color: "#3b82f6",
                fontWeight: "500",
                marginLeft: "auto"
            });

            filterFooter.appendChild(clearFiltersBtn);
            filterFooter.appendChild(filterCountEl);

            filterSection.appendChild(dateRow);
            filterSection.appendChild(includeRow);
            filterSection.appendChild(excludeRow);
            filterSection.appendChild(filterFooter);

            const listContainer = document.createElement("div");
            Object.assign(listContainer.style, {
                flex: "1 1 auto",
                minHeight: "0",
                overflowY: "auto",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                background: "rgba(0,0,0,0.2)"
            });

            const checkboxes: { cb: HTMLInputElement, doc: Doc, labelEl: HTMLLabelElement }[] = [];
            const groupCheckers: (() => void)[] = [];

            // ── Classify docs by uploadId ──
            // An upload with 2+ docs is a "folder" (multi-file publication).
            // An upload with exactly 1 doc, or docs without uploadId, are standalone files.
            const uploadBuckets = new Map<number, Doc[]>();
            const standaloneDocs: Doc[] = [];

            docs.forEach(doc => {
                if (doc.uploadId) {
                    if (!uploadBuckets.has(doc.uploadId)) uploadBuckets.set(doc.uploadId, []);
                    uploadBuckets.get(doc.uploadId)!.push(doc);
                } else {
                    standaloneDocs.push(doc);
                }
            });

            // Separate real folders (2+ files) from single-file uploads
            const folderGroups: { name: string; docs: Doc[] }[] = [];

            uploadBuckets.forEach((bucketDocs, _uploadId) => {
                if (bucketDocs.length >= 2) {
                    // Real folder – use upload name if available, otherwise first doc's uploader
                    const uploadName = bucketDocs[0].upload?.name;
                    const uploaderName = bucketDocs[0].uploader?.nickname || bucketDocs[0].profile?.nickname;
                    const groupLabel = uploadName
                        ? `📁 ${uploadName}`
                        : uploaderName
                            ? `📁 Publicación de ${uploaderName}`
                            : `📁 Publicación`;
                    folderGroups.push({ name: groupLabel, docs: bucketDocs });
                } else {
                    // Single-file upload → treat as standalone
                    standaloneDocs.push(...bucketDocs);
                }
            });

            // ── Render a folder group (collapsible, with group checkbox) ──
            const renderFolderGroup = (groupName: string, groupDocs: Doc[]) => {
                const groupContainer = document.createElement("div");
                Object.assign(groupContainer.style, {
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: "0",
                    gap: "0",
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden"
                });

                const groupCheckboxes: { cb: HTMLInputElement, doc: Doc }[] = [];

                // Group header
                const groupHeader = document.createElement("div");
                Object.assign(groupHeader.style, {
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    userSelect: "none"
                });

                const groupCb = document.createElement("input");
                groupCb.type = "checkbox";
                groupCb.checked = true;
                Object.assign(groupCb.style, { cursor: "pointer", width: "16px", height: "16px", flexShrink: "0" });

                const headerText = document.createElement("span");
                headerText.textContent = groupName;
                Object.assign(headerText.style, { flex: "1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

                const badge = document.createElement("span");
                badge.textContent = `${groupDocs.length} archivos`;
                Object.assign(badge.style, {
                    fontSize: "11px",
                    background: "rgba(255,255,255,0.12)",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    opacity: "0.7",
                    flexShrink: "0"
                });

                const toggleArrow = document.createElement("span");
                toggleArrow.textContent = "▼";
                Object.assign(toggleArrow.style, {
                    fontSize: "10px",
                    opacity: "0.5",
                    transition: "transform 0.2s",
                    flexShrink: "0"
                });

                groupHeader.appendChild(groupCb);
                groupHeader.appendChild(headerText);
                groupHeader.appendChild(badge);
                groupHeader.appendChild(toggleArrow);
                groupContainer.appendChild(groupHeader);

                // Files container (collapsible)
                const filesContainer = document.createElement("div");
                Object.assign(filesContainer.style, {
                    display: "flex",
                    flexDirection: "column",
                    gap: "0",
                    overflow: "hidden",
                    transition: "max-height 0.25s ease",
                    maxHeight: "9999px"
                });

                let collapsed = false;

                // Click on header (but not on checkbox) toggles collapse
                groupHeader.onclick = (e) => {
                    if (e.target === groupCb) return; // Let checkbox handle its own click
                    collapsed = !collapsed;
                    filesContainer.style.maxHeight = collapsed ? "0" : "9999px";
                    toggleArrow.style.transform = collapsed ? "rotate(-90deg)" : "rotate(0deg)";
                };

                groupCb.onchange = () => {
                    const isChecked = groupCb.checked;
                    groupCheckboxes.forEach(c => {
                        c.cb.checked = isChecked;
                    });
                    updateCount();
                };

                // Prevent label-like behavior: clicking the header shouldn't toggle the checkbox
                groupCb.onclick = (e) => e.stopPropagation();

                groupDocs.forEach(doc => {
                    const item = document.createElement("label");
                    Object.assign(item.style, {
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                        padding: "7px 12px 7px 38px",
                        background: "transparent",
                        transition: "background 0.15s",
                        borderBottom: "1px solid rgba(255,255,255,0.03)"
                    });
                    item.onmouseenter = () => item.style.background = "rgba(255,255,255,0.04)";
                    item.onmouseleave = () => item.style.background = "transparent";

                    const cb = document.createElement("input");
                    cb.type = "checkbox";
                    cb.checked = true;
                    Object.assign(cb.style, { cursor: "pointer", width: "14px", height: "14px", flexShrink: "0" });

                    const textContainer = document.createElement("div");
                    Object.assign(textContainer.style, { flex: "1", overflow: "hidden", display: "flex", flexDirection: "column", gap: "1px" });

                    const labelText = document.createElement("span");
                    labelText.textContent = `📄 ${doc.name}`;
                    Object.assign(labelText.style, {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "13px",
                        fontWeight: "500"
                    });

                    const uploaderText = doc.uploader?.nickname || doc.profile?.nickname;
                    if (uploaderText) {
                        const subLabel = document.createElement("span");
                        subLabel.textContent = `por ${uploaderText}`;
                        Object.assign(subLabel.style, { fontSize: "11px", opacity: "0.5" });
                        textContainer.appendChild(labelText);
                        textContainer.appendChild(subLabel);
                    } else {
                        textContainer.appendChild(labelText);
                    }

                    item.appendChild(cb);
                    item.appendChild(textContainer);
                    filesContainer.appendChild(item);

                    const cbObj = { cb, doc, labelEl: item };
                    checkboxes.push(cbObj);
                    groupCheckboxes.push(cbObj);
                });

                groupCheckers.push(() => {
                    const allChecked = groupCheckboxes.every(c => c.cb.checked);
                    const someChecked = groupCheckboxes.some(c => c.cb.checked);
                    groupCb.checked = allChecked;
                    groupCb.indeterminate = someChecked && !allChecked;
                });

                groupContainer.appendChild(filesContainer);
                listContainer.appendChild(groupContainer);
            };

            // ── Render a standalone file item (no group wrapper) ──
            const renderStandaloneItem = (doc: Doc) => {
                const item = document.createElement("label");
                Object.assign(item.style, {
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    padding: "8px 12px",
                    background: "transparent",
                    transition: "background 0.15s",
                    borderRadius: "6px"
                });
                item.onmouseenter = () => item.style.background = "rgba(255,255,255,0.04)";
                item.onmouseleave = () => item.style.background = "transparent";

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = true;
                Object.assign(cb.style, { cursor: "pointer", width: "14px", height: "14px", flexShrink: "0" });

                const textContainer = document.createElement("div");
                Object.assign(textContainer.style, { flex: "1", overflow: "hidden", display: "flex", flexDirection: "column", gap: "1px" });

                const labelText = document.createElement("span");
                labelText.textContent = `📄 ${doc.name}`;
                Object.assign(labelText.style, {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "13px",
                    fontWeight: "500"
                });

                const uploaderText = doc.uploader?.nickname || doc.profile?.nickname;
                if (uploaderText) {
                    const subLabel = document.createElement("span");
                    subLabel.textContent = `por ${uploaderText}`;
                    Object.assign(subLabel.style, { fontSize: "11px", opacity: "0.5" });
                    textContainer.appendChild(labelText);
                    textContainer.appendChild(subLabel);
                } else {
                    textContainer.appendChild(labelText);
                }

                item.appendChild(cb);
                item.appendChild(textContainer);
                listContainer.appendChild(item);

                checkboxes.push({ cb, doc, labelEl: item });
            };

            // ── Render all groups, then standalone files ──
            folderGroups.forEach(group => {
                renderFolderGroup(group.name, group.docs);
            });

            standaloneDocs.forEach(doc => {
                renderStandaloneItem(doc);
            });

            // ── Combined filter logic (date + name) ──
            const normalize = (s: string): string => {
                return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            };

            const parseKeywords = (input: string): string[] => {
                return input.split(",").map(s => normalize(s.trim())).filter(s => s.length > 0);
            };

            const isDocVisible = (doc: Doc): boolean => {
                // Date filter
                if (doc.createdAt) {
                    const docDate = new Date(doc.createdAt);
                    if (!isNaN(docDate.getTime())) {
                        const from = dateFromInput.value ? new Date(dateFromInput.value + "T00:00:00") : null;
                        const to = dateToInput.value ? new Date(dateToInput.value + "T23:59:59") : null;
                        if (from && docDate < from) return false;
                        if (to && docDate > to) return false;
                    }
                }

                const docName = normalize(doc.name);

                // Include filter: doc must match at least one keyword
                const includeKeywords = parseKeywords(includeInput.value);
                if (includeKeywords.length > 0) {
                    const matches = includeKeywords.some(kw => docName.includes(kw));
                    if (!matches) return false;
                }

                // Exclude filter: doc must NOT match any keyword
                const excludeKeywords = parseKeywords(excludeInput.value);
                if (excludeKeywords.length > 0) {
                    const excluded = excludeKeywords.some(kw => docName.includes(kw));
                    if (excluded) return false;
                }

                return true;
            };

            const hasActiveFilters = (): boolean => {
                return !!(dateFromInput.value || dateToInput.value || includeInput.value.trim() || excludeInput.value.trim());
            };

            const applyFilters = () => {
                let visibleCount = 0;
                checkboxes.forEach(c => {
                    const visible = isDocVisible(c.doc);
                    c.labelEl.style.display = visible ? "flex" : "none";
                    if (!visible) {
                        c.cb.checked = false;
                    } else {
                        c.cb.checked = true;
                        visibleCount++;
                    }
                });

                // Update group container visibility
                const groupContainers = listContainer.querySelectorAll<HTMLElement>(":scope > div");
                groupContainers.forEach(container => {
                    const labels = container.querySelectorAll<HTMLElement>("label");
                    if (labels.length === 0) return;
                    const anyVisible = Array.from(labels).some(l => l.style.display !== "none");
                    container.style.display = anyVisible ? "flex" : "none";
                });

                if (hasActiveFilters()) {
                    filterCountEl.textContent = `${visibleCount} de ${docs.length} archivos`;
                } else {
                    filterCountEl.textContent = "";
                }

                updateCount();
            };

            // Debounce for text inputs
            let filterTimeout: ReturnType<typeof setTimeout> | null = null;
            const applyFiltersDebounced = () => {
                if (filterTimeout) clearTimeout(filterTimeout);
                filterTimeout = setTimeout(applyFilters, 300);
            };

            dateFromInput.onchange = applyFilters;
            dateToInput.onchange = applyFilters;
            includeInput.oninput = applyFiltersDebounced;
            excludeInput.oninput = applyFiltersDebounced;

            clearFiltersBtn.onclick = () => {
                dateFromInput.value = "";
                dateToInput.value = "";
                includeInput.value = "";
                excludeInput.value = "";
                // Re-show and re-check all
                checkboxes.forEach(c => {
                    c.labelEl.style.display = "flex";
                    c.cb.checked = true;
                });
                const groupContainers = listContainer.querySelectorAll<HTMLElement>(":scope > div");
                groupContainers.forEach(container => container.style.display = "flex");
                filterCountEl.textContent = "";
                updateCount();
            };

            const updateCount = () => {
                groupCheckers.forEach(fn => fn());
                const count = checkboxes.filter(c => c.cb.checked && c.labelEl.style.display !== "none").length;
                downloadBtn.textContent = `Descargar seleccionados (${count})`;
                downloadBtn.disabled = count === 0;
                if (count === 0) {
                    downloadBtn.style.opacity = "0.5";
                    downloadBtn.style.cursor = "not-allowed";
                } else {
                    downloadBtn.style.opacity = "1";
                    downloadBtn.style.cursor = "pointer";
                }
            };

            checkboxes.forEach(c => {
                c.cb.onchange = updateCount;
            });

            selectAllBtn.onclick = () => {
                checkboxes.forEach(c => {
                    if (c.labelEl.style.display !== "none") c.cb.checked = true;
                });
                updateCount();
            };

            deselectAllBtn.onclick = () => {
                checkboxes.forEach(c => {
                    if (c.labelEl.style.display !== "none") c.cb.checked = false;
                });
                updateCount();
            };

            const buttons = document.createElement("div");
            Object.assign(buttons.style, {
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px"
            });

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancelar";
            Object.assign(cancelBtn.style, {
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "8px",
                padding: "10px 16px",
                cursor: "pointer",
                fontSize: "14px",
                transition: "background 0.2s"
            });
            cancelBtn.onmouseenter = () => cancelBtn.style.background = "rgba(255,255,255,0.1)";
            cancelBtn.onmouseleave = () => cancelBtn.style.background = "transparent";

            const downloadBtn = document.createElement("button");
            Object.assign(downloadBtn.style, {
                background: "#3b82f6",
                border: "none",
                color: "#fff",
                borderRadius: "8px",
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                transition: "background 0.2s"
            });
            downloadBtn.onmouseenter = () => {
                if (!downloadBtn.disabled) downloadBtn.style.background = "#2563eb";
            };
            downloadBtn.onmouseleave = () => {
                if (!downloadBtn.disabled) downloadBtn.style.background = "#3b82f6";
            };

            updateCount();

            cancelBtn.onclick = () => {
                document.body.removeChild(wrapper);
                resolve(null);
            };

            downloadBtn.onclick = () => {
                if (downloadBtn.disabled) return;
                const selectedDocs = checkboxes.filter(c => c.cb.checked && c.labelEl.style.display !== "none").map(c => c.doc);
                document.body.removeChild(wrapper);
                resolve(selectedDocs);
            };

            buttons.appendChild(cancelBtn);
            buttons.appendChild(downloadBtn);

            modal.appendChild(titleEl);
            modal.appendChild(subtitleEl);
            modal.appendChild(controls);
            modal.appendChild(filterSection);
            modal.appendChild(listContainer);
            modal.appendChild(buttons);
            wrapper.appendChild(modal);

            document.body.appendChild(wrapper);
        });
    }
}

