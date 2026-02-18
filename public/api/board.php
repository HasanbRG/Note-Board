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

  if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 1;

    $stmt = $pdo->prepare("SELECT id, name, view_x, view_y, zoom FROM boards WHERE id = ?");
    $stmt->execute([$id]);
    $board = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "board" => $board]);
    exit;
  }

  if ($method === 'PUT') {
    $in = json_input();
    $id = (int)($in['id'] ?? 0);

    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(["success" => false, "error" => "Missing id"]);
      exit;
    }

    $viewX = (int)($in['view_x'] ?? 0);
    $viewY = (int)($in['view_y'] ?? 0);
    $zoom  = (float)($in['zoom'] ?? 1);

    // guardrails
    if ($zoom < 0.25) $zoom = 0.25;
    if ($zoom > 2.5)  $zoom = 2.5;

    $stmt = $pdo->prepare("UPDATE boards SET view_x = ?, view_y = ?, zoom = ? WHERE id = ?");
    $stmt->execute([$viewX, $viewY, $zoom, $id]);

    echo json_encode(["success" => true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(["success" => false, "error" => "Method not allowed"]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => "Database error"]);
}
