<?php
declare(strict_types=1);

header('Content-Type: application/json');

function json_input(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

try {
  $pdo = new PDO(
    "mysql:host=db;dbname=noteboard;charset=utf8mb4",
    "noteboard",
    "noteboard",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  $method = $_SERVER['REQUEST_METHOD'];

  // -------- GET: list cards --------
  if ($method === 'GET') {
    $boardId = isset($_GET['board_id']) ? (int)$_GET['board_id'] : 1;

    $stmt = $pdo->prepare("
      SELECT id, board_id, type, title, description, importance,
             pos_x, pos_y, z_index, color, is_pinned, is_archived,
             created_at, updated_at
      FROM cards
      WHERE board_id = ? AND is_archived = 0
      ORDER BY z_index ASC, id ASC
    ");
    $stmt->execute([$boardId]);

    echo json_encode(["success" => true, "cards" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
  }

  // -------- POST: create card --------
  if ($method === 'POST') {
    $in = json_input();

    $boardId = (int)($in['board_id'] ?? 1);
    $type = (string)($in['type'] ?? 'note');

    $title = (string)($in['title'] ?? '');
    $description = $in['description'] ?? null;
    $importance = (int)($in['importance'] ?? 3);

    $posX = (int)($in['pos_x'] ?? 150);
    $posY = (int)($in['pos_y'] ?? 150);
    $zIndex = (int)($in['z_index'] ?? 0);

    $color = (string)($in['color'] ?? 'default');
    $isPinned = !empty($in['is_pinned']) ? 1 : 0;

    // basic guardrails
    if (!in_array($type, ['note', 'section'], true)) $type = 'note';
    if ($importance < 1) $importance = 1;
    if ($importance > 5) $importance = 5;

    $stmt = $pdo->prepare("
      INSERT INTO cards
        (board_id, type, title, description, importance, pos_x, pos_y, z_index, color, is_pinned, is_archived)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ");
    $stmt->execute([$boardId, $type, $title, $description, $importance, $posX, $posY, $zIndex, $color, $isPinned]);

    $id = (int)$pdo->lastInsertId();

    echo json_encode(["success" => true, "id" => $id]);
    exit;
  }

  // -------- PUT: update card --------
  if ($method === 'PUT') {
    $in = json_input();
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(["success" => false, "error" => "Missing id"]);
      exit;
    }

    // Only update fields that are provided
    $fields = [];
    $vals = [];

    $allowed = [
      'title' => 'title',
      'description' => 'description',
      'importance' => 'importance',
      'pos_x' => 'pos_x',
      'pos_y' => 'pos_y',
      'z_index' => 'z_index',
      'color' => 'color',
      'is_pinned' => 'is_pinned',
      'is_archived' => 'is_archived',
      'type' => 'type',
    ];

    foreach ($allowed as $k => $col) {
      if (!array_key_exists($k, $in)) continue;

      $v = $in[$k];

      if ($k === 'importance') {
        $v = (int)$v;
        if ($v < 1) $v = 1;
        if ($v > 5) $v = 5;
      }
      if (in_array($k, ['pos_x','pos_y','z_index'], true)) $v = (int)$v;
      if (in_array($k, ['is_pinned','is_archived'], true)) $v = !empty($v) ? 1 : 0;

      if ($k === 'type' && !in_array((string)$v, ['note','section'], true)) continue;

      $fields[] = "$col = ?";
      $vals[] = $v;
    }

    if (!$fields) {
      http_response_code(400);
      echo json_encode(["success" => false, "error" => "No fields to update"]);
      exit;
    }

    $vals[] = $id;

    $sql = "UPDATE cards SET " . implode(", ", $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);

    echo json_encode(["success" => true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(["success" => false, "error" => "Method not allowed"]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => "Database error"]);
}
