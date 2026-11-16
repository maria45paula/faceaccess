DROP DATABASE IF EXISTS faceaccess;
CREATE DATABASE faceaccess CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE faceaccess;

-- Personal que inicia sesión
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol ENUM('administrador','porteria') NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Estudiantes registrados 
CREATE TABLE estudiantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  documento VARCHAR(20) NOT NULL UNIQUE,
  codigo_qr VARCHAR(100) UNIQUE,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Rostro de cada estudiante 
CREATE TABLE rostros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id INT NOT NULL UNIQUE,
  descriptor TEXT NOT NULL,
  foto_ruta VARCHAR(255),
  fecha_captura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
);

-- Consentimiento de uso de datos 
CREATE TABLE autorizaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id INT NOT NULL UNIQUE,
  aceptada BOOLEAN NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
);

-- Historial de intentos de ingresoCREATE TABLE ingresos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id INT NULL,
  metodo ENUM('rostro','qr','documento') NOT NULL,
  resultado ENUM('permitido','denegado') NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE SET NULL
);