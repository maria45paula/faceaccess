// Servidor principal de FaceAccess
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

/** Aplicación principal de Express. */
const app = express();

// Carpeta de fotos: está FUERA de "public", así nadie las abre escribiendo la URL (SCRUM-29)
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

/**Lee el cuerpo JSON de las peticiones*/
app.use(express.json({ limit: '5mb' }));   // la foto viaja como texto base64
/** Maneja la sesión del usuario con una cookie que dura 30 minutos. */
app.use(session({
  secret: 'cambien-esta-frase-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 30 }   // la sesión dura 30 minutos
}));

/**Publica las pantallas Html, Js y modelos de la carpeta viewa/public */
app.use(express.static(path.join(__dirname, 'views', 'public')));
/**Rutas de la API: cada uno de estos modulos atiende su propio grupo de Urls. */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/estudiantes', require('./routes/estudiantes'));
app.use('/api/ingreso', require('./routes/ingreso'));
app.use('/api/historial', require('./routes/historial'));   // SCRUM-23 / SCRUM-24

/**Enciende el servidor en el puerto 3000. */
app.listen(3000, () => console.log('FaceAccess en http://localhost:3000/login.html'));
