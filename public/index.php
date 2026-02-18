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
    <button id="addCardBtn" class="btn">+ New card</button>
  </header>

  <main id="board" class="board" aria-label="Board canvas"></main>

  <script src="/assets/js/app.js" defer></script>
</body>
</html>
