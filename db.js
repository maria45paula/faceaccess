// Conexión a MySQL
const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
  host: 'localhost',
  user: 'root',
  puerto:3307,
  password: 'Mapagu21+.',
  database: 'faceaccess',
  waitForConnections: true,
  connectionLimit: 10
});