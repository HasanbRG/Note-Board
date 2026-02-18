(() => {
  const board = document.getElementById("board");
  const addBtn = document.getElementById("addCardBtn");

  let zIndexCounter = 1;

  function createCard(x = 150, y = 150) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.left = x + "px";
    card.style.top = y + "px";
    card.style.zIndex = zIndexCounter++;

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Write your note...";
    card.appendChild(textarea);

    makeDraggable(card);

    board.appendChild(card);
  }

  function makeDraggable(card) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    card.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "TEXTAREA") return;

      isDragging = true;
      offsetX = e.clientX - card.offsetLeft;
      offsetY = e.clientY - card.offsetTop;

      card.style.zIndex = zIndexCounter++;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      card.style.left = (e.clientX - offsetX) + "px";
      card.style.top = (e.clientY - offsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  addBtn.addEventListener("click", () => {
    createCard(200, 200);
  });

  createCard();
})();
