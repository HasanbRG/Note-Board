(() => {
  const board = document.getElementById("board");
  const addBtn = document.getElementById("addCardBtn");

  const BOARD_ID = 1;

  let zIndexCounter = 1;

  // --- Camera (open-world canvas) ---
  let cameraX = 0;
  let cameraY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  function updateCamera() {
    board.style.transform = `translate(${cameraX}px, ${cameraY}px)`;
  }

  // Pan by dragging empty space
  document.addEventListener("mousedown", (e) => {
    // Don't pan if clicking a card or interacting with inputs
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
    isPanning = false;
  });

  // --- API helpers ---
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

  // --- UI creation ---
  function renderCard(card) {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.id = card.id;

    el.style.left = `${card.pos_x}px`;
    el.style.top = `${card.pos_y}px`;
    el.style.zIndex = card.z_index || zIndexCounter++;

    // Keep global z-index growing so clicks always bring cards to front
    zIndexCounter = Math.max(zIndexCounter, (card.z_index || 0) + 1);

    el.innerHTML = `
      <div class="card-head">
        <input class="card-title" placeholder="Title..." value="${escapeHtml(card.title || "")}" />
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
      </div>
      <textarea class="card-desc" placeholder="Description...">${escapeHtml(
        card.description || ""
      )}</textarea>
    `;

    // Bring to front when you interact (but don't steal focus from inputs)
    el.addEventListener("mousedown", async (e) => {
      if (e.target.matches("textarea, input, select")) return;

      const newZ = zIndexCounter++;
      el.style.zIndex = newZ;
      await apiUpdateCard(card.id, { z_index: newZ });
    });

    makeDraggable(el);

    // Save edits (debounced)
    const titleInput = el.querySelector(".card-title");
    const impSelect = el.querySelector(".card-importance");
    const descArea = el.querySelector(".card-desc");

    const saveEdits = debounce(async () => {
      await apiUpdateCard(card.id, {
        title: titleInput.value,
        importance: Number(impSelect.value),
        description: descArea.value,
      });
    }, 350);

    titleInput.addEventListener("input", saveEdits);
    impSelect.addEventListener("change", saveEdits);
    descArea.addEventListener("input", saveEdits);

    board.appendChild(el);
  }

  function makeDraggable(cardEl) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    cardEl.addEventListener("mousedown", (e) => {
      // Don't start drag when editing text
      if (e.target.matches("textarea, input, select")) return;

      isDragging = true;

      // IMPORTANT: Because the board is translated, use getBoundingClientRect for correct offsets
      const rect = cardEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      // Convert screen coords -> world coords by removing camera offset
      const worldX = e.clientX - offsetX - cameraX;
      const worldY = e.clientY - offsetY - cameraY;

      cardEl.style.left = `${worldX}px`;
      cardEl.style.top = `${worldY}px`;
    });

    document.addEventListener("mouseup", async () => {
      if (!isDragging) return;
      isDragging = false;

      const id = Number(cardEl.dataset.id);
      await apiUpdateCard(id, {
        pos_x: parseInt(cardEl.style.left, 10),
        pos_y: parseInt(cardEl.style.top, 10),
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
    updateCamera(); // apply initial camera transform

    const cards = await apiGetCards();
    cards.forEach(renderCard);
  }

  addBtn.addEventListener("click", async () => {
    // Spawn near the visible area (so it doesn't appear off-screen after panning)
    const spawnX = Math.round(220 - cameraX);
    const spawnY = Math.round(160 - cameraY);

    const newCard = {
      board_id: BOARD_ID,
      type: "note",
      title: "",
      description: "",
      importance: 3,
      pos_x: spawnX,
      pos_y: spawnY,
      z_index: zIndexCounter++,
    };

    const id = await apiCreateCard(newCard);
    renderCard({ ...newCard, id });
  });

  init().catch(console.error);
})();
