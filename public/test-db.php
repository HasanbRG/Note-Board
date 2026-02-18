<?php

try {
    $pdo = new PDO(
        "mysql:host=db;dbname=noteboard;charset=utf8mb4",
        "noteboard",
        "noteboard",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]
    );

    echo "Database connected successfully ✅";

} catch (PDOException $e) {
    echo "Connection failed ❌";
}
