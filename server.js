// Punto de entrada de FaceAccess.
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VIEWS = path.join(__dirname, 'views');
const PUBLIC = path.join(__dirname, 'public');

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

app.use(express.json({ limit: '5mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiar-esta-clave-de-sesion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 30,
    sameSite: 'lax'
  }
}));

// Archivos estáticos: CSS, JavaScript del navegador y modelos faciales.
app.use(express.static(PUBLIC));

// Permitir mostrar las fotografías de los estudiantes.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Vistas HTML.
app.get('/', (req, res) => res.redirect('/ingreso.html'));
app.get('/ingreso.html', (req, res) => res.sendFile(path.join(VIEWS, 'ingreso.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(VIEWS, 'login.html')));
app.get('/panel.html', (req, res) => res.sendFile(path.join(VIEWS, 'panel.html')));
app.get('/historial.html', (req, res) => res.sendFile(path.join(VIEWS, 'historial.html')));

// API.
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/estudiantes', require('./routes/estudiantesRoutes'));
app.use('/api/ingreso', require('./routes/ingresoRoutes'));
app.use('/api/historial', require('./routes/historialRoutes'));

app.listen(PORT, () => {
  console.log(`FaceAccess funcionando en http://localhost:${PORT}`);
});
