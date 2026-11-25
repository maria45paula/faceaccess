// Conexión a MySQL
const mysql = require('mysql2/promise');

/**
 * pool de conexiones a MySQUL, compartido por todas las rutas 
 * Mantiene hasta 10 conexiones abiertas para reutilizarlas.
 * @type {import ('mysql2/promise').pool}
 */
module.exports = mysql.createPool({
  host: 'localhost',
  user: 'root',
  port:3307,
  password: 'Mapagu21+.',
  database: 'faceaccess',
  waitForConnections: true,
  connectionLimit: 10
});