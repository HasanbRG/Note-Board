<?php
declare(strict_types=1);
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Note Board</title>
  <link rel="stylesheet" href="/assets/css/style.css" />
</head>
<body>
  <header class="topbar">
    <div class="brand">Note Board</div>
    <button id="addNoteBtn" class="btn">+ Note</button>
    <button id="addSectionBtn" class="btn">+ Section</button>
  </header>

  <!-- Viewport stays fixed to the screen -->
  <main id="viewport" class="viewport" aria-label="Board canvas">
    <!-- Board is a huge "world" that we pan/zoom -->
    <div id="board" class="board"></div>
  </main>

  <script src="/assets/js/app.js" defer></script>
</body>
</html>
