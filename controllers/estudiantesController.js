const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const EstudiantesModel = require('../models/estudiantesModel');

const RAIZ = path.join(__dirname, '..');

async function listar(req, res) {
  try {
    res.json(await EstudiantesModel.listar());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function verFoto(req, res) {
  try {
    const ruta = await EstudiantesModel.obtenerFoto(req.params.id);
    if (!ruta) return res.status(404).end();
    res.sendFile(path.resolve(RAIZ, ruta));
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
}

async function verQR(req, res) {
  try {
    const codigo = await EstudiantesModel.obtenerQR(req.params.id);
    if (!codigo) return res.status(404).end();
    const png = await QRCode.toBuffer(codigo, { width: 320, margin: 2 });
    res.set('Cache-Control', 'no-store');
    res.type('png').send(png);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
}

async function registrar(req, res) {
  const { nombre, documento, autorizacion, foto, descriptor } = req.body || {};

  if (!nombre || !documento) {
    return res.status(400).json({ error: 'Complete todos los campos obligatorios' });
  }
  if (!autorizacion) {
    return res.status(400).json({ error: 'Debe aceptar el uso de datos para continuar' });
  }
  if (typeof foto !== 'string' || !foto.startsWith('data:image/jpeg;base64,')) {
    return res.status(400).json({ error: 'Debe tomar la foto del rostro' });
  }

  const descriptorValido = Array.isArray(descriptor) && descriptor.length === 128 &&
    descriptor.every(n => typeof n === 'number' && Number.isFinite(n));
  if (!descriptorValido) {
    return res.status(400).json({ error: 'No se detectó un rostro en la foto. Tómela de nuevo' });
  }

  try {
    const id = await EstudiantesModel.registrar(
      { nombre, documento, descriptor },
      (nuevoId) => {
        const rutaRelativa = 'uploads/' + nuevoId + '.jpg';
        const rutaAbsoluta = path.join(RAIZ, rutaRelativa);
        const base64 = foto.replace(/^data:image\/jpeg;base64,/, '');
        fs.writeFileSync(rutaAbsoluta, Buffer.from(base64, 'base64'));
        return { rutaRelativa, rutaAbsoluta };
      }
    );
    res.status(201).json({ ok: true, id });
  } catch (error) {
    if (error.archivoCreado?.rutaAbsoluta &&
        fs.existsSync(error.archivoCreado.rutaAbsoluta)) {
      fs.unlinkSync(error.archivoCreado.rutaAbsoluta);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El estudiante ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function actualizar(req, res) {
  const { nombre, documento } = req.body || {};
  if (!nombre || !documento) {
    return res.status(400).json({ error: 'Complete todos los campos obligatorios' });
  }
  try {
    const filasAfectadas = await EstudiantesModel.actualizar(
      req.params.id, nombre, documento
    );
    if (!filasAfectadas) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un estudiante con ese documento' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function eliminar(req, res) {
  try {
    const resultado = await EstudiantesModel.eliminar(req.params.id);
    if (!resultado.eliminados) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    if (resultado.rutaFoto) {
      const archivo = path.resolve(RAIZ, resultado.rutaFoto);
      if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { listar, verFoto, verQR, registrar, actualizar, eliminar };
