(() => {
  const board = document.getElementById("board");
  const viewport = document.getElementById("viewport");

  const addNoteBtn = document.getElementById("addNoteBtn");
  const addSectionBtn = document.getElementById("addSectionBtn");

  if (!board || !viewport || !addNoteBtn || !addSectionBtn) {
    console.error("Missing required elements:", {
      board,
      viewport,
      addNoteBtn,
      addSectionBtn,
    });
    return;
  }

  const BOARD_ID = 1;
  let zIndexCounter = 1;

  // --- Camera (open-world canvas) ---
  let cameraX = 0;
  let cameraY = 0;
  let zoom = 1;

  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 1.1;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function updateCamera() {
    board.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`;
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - cameraX) / zoom,
      y: (sy - cameraY) / zoom,
    };
  }

  function zoomAtCursor(newZoom, cursorX, cursorY) {
    newZoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);

    const before = screenToWorld(cursorX, cursorY);

    zoom = newZoom;
    cameraX = cursorX - before.x * zoom;
    cameraY = cursorY - before.y * zoom;

    updateCamera();
  }

  // --- API helpers (cards) ---
  async function apiGetCards() {
    const res = await fetch(`/api/cards.php?board_id=${BOARD_ID}`);
    const data = await res.json();
    if (!data.success) throw new Error("Failed to load cards");
    return data.cards;
  }

  async function apiCreateCard(payload) {
    const res = await fetch(`/api/cards.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error("Failed to create card");
    return data.id;
  }

  async function apiUpdateCard(id, patch) {
    const res = await fetch(`/api/cards.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (!data.success) throw new Error("Failed to update card");
    return true;
  }

  // --- API helpers (board camera) ---
  async function apiGetBoard() {
    const res = await fetch(`/api/board.php?id=${BOARD_ID}`);
    const data = await res.json();
    if (!data.success) throw new Error("Failed to load board");
    return data.board;
  }

  async function apiSaveBoardView(patch) {
    const res = await fetch(`/api/board.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: BOARD_ID, ...patch }),
    });
    const data = await res.json();
    if (!data.success) throw new Error("Failed to save board view");
    return true;
  }

  const saveBoardView = debounce(async () => {
    await apiSaveBoardView({
      view_x: Math.round(cameraX),
      view_y: Math.round(cameraY),
      zoom: Number(zoom.toFixed(4)),
    });
  }, 300);

  // --- Pan by dragging empty space ---
  viewport.addEventListener("mousedown", (e) => {
    if (e.target.closest(".card")) return;
    if (e.target.matches("textarea, input, select, button")) return;

    isPanning = true;
    panStartX = e.clientX - cameraX;
    panStartY = e.clientY - cameraY;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    cameraX = e.clientX - panStartX;
    cameraY = e.clientY - panStartY;
    updateCamera();
  });

  document.addEventListener("mouseup", () => {
    if (!isPanning) return;
    isPanning = false;
    saveBoardView();
  });

  // --- Zoom with Ctrl + wheel ---
  document.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const direction = e.deltaY > 0 ? "out" : "in";
      const factor = direction === "in" ? ZOOM_STEP : 1 / ZOOM_STEP;

      zoomAtCursor(zoom * factor, e.clientX, e.clientY);
      saveBoardView();
    },
    { passive: false }
  );

  // --- Keyboard shortcuts ---
  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    if (e.key === "+" || e.key === "=") {
      zoomAtCursor(zoom * ZOOM_STEP, cx, cy);
      saveBoardView();
    } else if (e.key === "-" || e.key === "_") {
      zoomAtCursor(zoom / ZOOM_STEP, cx, cy);
      saveBoardView();
    } else if (e.key === "0") {
      zoomAtCursor(1, cx, cy);
      saveBoardView();
    }
  });

  // --- UI creation ---
  function renderCard(card) {
    const el = document.createElement("div");
    el.className = card.type === "section" ? "card card-section" : "card";
    el.dataset.id = card.id;

    el.style.left = `${card.pos_x}px`;
    el.style.top = `${card.pos_y}px`;
    el.style.zIndex = card.z_index || zIndexCounter++;

    zIndexCounter = Math.max(zIndexCounter, (card.z_index || 0) + 1);

    // Template per type
    if (card.type === "section") {
      el.innerHTML = `
        <div class="card-head">
          <input class="card-title" placeholder="Section title..." value="${escapeHtml(
            card.title || ""
          )}" />
          <div class="card-actions">
            <button class="card-archive" title="Archive">✕</button>
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="card-head">
          <input class="card-title" placeholder="Title..." value="${escapeHtml(
            card.title || ""
          )}" />

          <select class="card-importance" title="Importance">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<option value="${n}" ${
                    Number(card.importance) === n ? "selected" : ""
                  }>${n}</option>`
              )
              .join("")}
          </select>

          <div class="card-actions">
            <button class="card-archive" title="Archive">✕</button>
          </div>
        </div>

        <textarea class="card-desc" placeholder="Description...">${escapeHtml(
          card.description || ""
        )}</textarea>
      `;
    }

    // Bring to front (ignore buttons/inputs)
    el.addEventListener("mousedown", async (e) => {
      if (e.target.matches("textarea, input, select, button")) return;
      const newZ = zIndexCounter++;
      el.style.zIndex = newZ;
      await apiUpdateCard(card.id, { z_index: newZ });
    });

    makeDraggable(el);

    // Archive handler
    const archiveBtn = el.querySelector(".card-archive");
    if (archiveBtn) {
      archiveBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await apiUpdateCard(card.id, { is_archived: 1 });
        el.remove();
      });
    }

    // Save edits (works for both types)
    const titleInput = el.querySelector(".card-title");
    const impSelect = el.querySelector(".card-importance"); // null for section
    const descArea = el.querySelector(".card-desc"); // null for section

    const saveEdits = debounce(async () => {
      const patch = { title: titleInput.value };
      if (impSelect) patch.importance = Number(impSelect.value);
      if (descArea) patch.description = descArea.value;
      await apiUpdateCard(card.id, patch);
    }, 350);

    titleInput.addEventListener("input", saveEdits);
    if (impSelect) impSelect.addEventListener("change", saveEdits);
    if (descArea) descArea.addEventListener("input", saveEdits);

    board.appendChild(el);
  }

  function makeDraggable(cardEl) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    cardEl.addEventListener("mousedown", (e) => {
      if (e.target.matches("textarea, input, select, button")) return;
      isDragging = true;

      const rect = cardEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const worldX = (e.clientX - offsetX - cameraX) / zoom;
      const worldY = (e.clientY - offsetY - cameraY) / zoom;

      cardEl.style.left = `${worldX}px`;
      cardEl.style.top = `${worldY}px`;
    });

    document.addEventListener("mouseup", async () => {
      if (!isDragging) return;
      isDragging = false;

      const id = Number(cardEl.dataset.id);
      await apiUpdateCard(id, {
        pos_x: Math.round(parseFloat(cardEl.style.left)),
        pos_y: Math.round(parseFloat(cardEl.style.top)),
      });
    });
  }

  // --- utilities ---
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // --- startup ---
  async function init() {
    board.innerHTML = "";

    try {
      const b = await apiGetBoard();
      cameraX = Number(b?.view_x ?? 0);
      cameraY = Number(b?.view_y ?? 0);
      zoom = Number(b?.zoom ?? 1);
    } catch {
      cameraX = 0;
      cameraY = 0;
      zoom = 1;
    }

    updateCamera();

    const cards = await apiGetCards();
    cards.forEach(renderCard);
  }

  // + Note
  addNoteBtn.addEventListener("click", async () => {
    const spawn = screenToWorld(260, 190);

    const newCard = {
      board_id: BOARD_ID,
      type: "note",
      title: "",
      description: "",
      importance: 3,
      pos_x: Math.round(spawn.x),
      pos_y: Math.round(spawn.y),
      z_index: zIndexCounter++,
    };

    const id = await apiCreateCard(newCard);
    renderCard({ ...newCard, id });
  });

  // + Section
  addSectionBtn.addEventListener("click", async () => {
    const spawn = screenToWorld(260, 190);

    const newCard = {
      board_id: BOARD_ID,
      type: "section",
      title: "New section",
      description: "",
      importance: 3,
      pos_x: Math.round(spawn.x),
      pos_y: Math.round(spawn.y),
      z_index: zIndexCounter++,
    };

    const id = await apiCreateCard(newCard);
    renderCard({ ...newCard, id });
  });

  init().catch(console.error);
})();
