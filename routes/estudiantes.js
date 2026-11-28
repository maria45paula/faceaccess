
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/auth');

/**
 * Aplica las validaciones de acceso a todas las rutas de este archivo
 * primero verifica que el usuario haya iniciado sesiòn 
 * y despues comprueba que tenga el rol de administrador 
 */
router.use(requireLogin);
router.use(requireAdmin);

/**
 * Define la ruta principal del proyectp.
 * Se utiliza para ubicar los archivps de las fotografias
 * almacenadas en la carpeta uploads.
 */
const RAIZ = path.join(__dirname, '..');

/**
 * Ruta para listar los estudiantes registrados
 * consulta los datos principales de cada estudiante
 * e indica si tiene una fotografia registrada.
 * 
 *@returns {Array} Lista de estudiantes 
 */
router.get('/', async function (req, res) {
  try {
    /**
     * consulta los estudiantesw y relaciona sus datos
     * con la tabla de rostros
     * la union LEFT JOIN permite mostrar estudiantes
     * aunque todavia no tengan una fotografia
     * los resultados se ordenan desde el mas reciente
     */
    const [rows] = await db.query(
      `SELECT e.id, e.nombre, e.documento, e.fecha_registro, (r.id IS NOT NULL) AS tiene_foto
       FROM estudiantes e LEFT JOIN rostros r ON r.estudiante_id = e.id
       ORDER BY e.id DESC`);
    
    /**
     * Devuelve la lisra de estudiantes en formato JSON .
     */
    res.json(rows);
  } catch (e) {
    /**
     * Captura los errores que ocurren durante 
     * la consulta de estudiantes
     * registrar el error y devuelve una respuesta 500.
     */
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ruta para consultar la fotografia de un estudiante
 * la fotografia solo puede ser consultada por usuarios
 * que hayan incluido sesiòn y tengan permisos de administrador
 * 
 * @param {string} req.params.id Identificador del estudiante 
 */
router.get('/:id/foto', async function (req, res) {
  try {
    /**
     * Busca la ruta de la fotografia asociada
     * al estudiante indicado en la solicitud
     */
    const [rows] = await db.query(
      'SELECT foto_ruta FROM rostros WHERE estudiante_id = ?', [req.params.id]);

    /**
     * comprueba que existe una fotografia registrada 
     * si no existe, devuelve una respuesta404.
     */
    if (!rows[0] || !rows[0].foto_ruta) return res.status(404).end();
    
    /**
     * Construye la ruta completa del archivo
     * y envia la fotografia al cliente 
     */
    res.sendFile(path.resolve(RAIZ, rows[0].foto_ruta));
  } catch (e) {

    /**
     * Captura los errores que ocurran al consultar
     * o enviar la fotografia
     * Devuelve una respuesta 500.
     */
    res.status(500).end();
  }
});

/**
 * Ruta para generar y consultar el codigo QR
 * asociado a un estudiante
 * 
 * @param {string} req.params.id Identificador del estudiante
 */
router.get('/:id/qr', async function (req, res) {
  try {

    /**
     * Consultar el codigo QR almacenado 
     * para el estudiante seleccionado 
     */
    const [rows] = await db.query('SELECT codigo_qr FROM estudiantes WHERE id = ?', [req.params.id]);

    /**
     * Verifica que el estudiante tenga el codigo QR
     * Si no existe, devuelve una respuesta 404.
     */
    if (!rows[0] || !rows[0].codigo_qr) return res.status(404).end();

    /**
     * Genera una imagen png a partir deñ codigo QR
     * Define el ancho de la iamgen y el margen
     */
    const png = await QRCode.toBuffer(rows[0].codigo_qr, { width: 320, margin: 2 });

    /**
     * Evita que el navegador almacne el codigo QR
     * en la cahce ya que funciona como una credencial
     */
    res.set('Cache-Control', 'no-store');  

    /**
     * Indica que la respuesta es una imagen png
     * y envia la imagen del codigo QR
     */
    res.type('png').send(png);
  } catch (e) {

    /** Captura los errrores que ocurran al consultar o generar el codigo QR
     * Registro el error y devuelve a una respuesta 500-
     */
    console.error(e);
    res.status(500).end();

    /**
     * ruta para registrar un nuevo estudiante
     *  requiere los datos personales, autorizaciòn para el grupo
     * de tos, una fotografia y el descriptor facial
     * 
     * @param {string} req.body.nombre  nombre del estudiante
     * @param {string} req.body.documento  documento del estudiante
     * @param {string} req.body.autorizaciòn  autorizar para el uso de datos*/


  }
});

//registrar estudiante con autorización y foto
router.post('/', async function (req, res) {

  /**
   * obtiene los datos enviados para registrar
   * al estudiante desde el cuerpo de la solicitud
   */
  var datos = req.body || {};
  var nombre = datos.nombre;
  var documento = datos.documento;
  var autorizacion = datos.autorizacion;
  var foto = datos.foto;
  var descriptor = datos.descriptor;

  /**
   * Verifican que se hayan ingresado el nombre
   * y el documento del estudiante 
   * si falta alguno, devuelve error 400
   */

  if (!nombre || !documento) {
    return res.status(400).json({ error: 'Complete todos los campos obligatorios' });
    /**
     * comprueba que el estudiante haya aceptado
     * la autorizaciòn para el uso de datos
     * sin esta autorizacion no se permite el registro
     */
  }
  if (!autorizacion) {   // SCRUM-13: sin autorización no se registra
    return res.status(400).json({ error: 'Debe aceptar el uso de datos para continuar' });

    /**
     * Verifica que la fotografia sea una cadena de texto
     * que contenga una imagen jpeg codificada de base64
     * si el formato no es correcto saca un error 400.
     */
  }
  if (typeof foto !== 'string' || !foto.startsWith('data:image/jpeg;base64,')) {   // SCRUM-12
    return res.status(400).json({ error: 'Debe tomar la foto del rostro' });

  }
  /**
   * comprueba que el descriptor facial sea un arreglo
   * de exactamente 128 numeros validos
   * cada elemento debe ser un numero finito
   */
  
  var descriptorOk = true;
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    descriptorOk = false;
  } else {
    for (var i = 0; i < descriptor.length; i++) {
      if (typeof descriptor[i] !== 'number' || !Number.isFinite(descriptor[i])) {
        descriptorOk = false;
        break;
      }
    }
  }
  
  /**
   * Si el descriptor facial no cumple las condiciones 
   * devuelve un error indicado que debe tomarse
   * nuevamente la fotografia
   */
  if (!descriptorOk) {
    return res.status(400).json({ error: 'No se detectó un rostro en la foto. Tómela de nuevo' });
  }
  /**
   * obtiene una conexion independiente con la base de datos
   * para realizar las operaciones dentro de una transaccion
   */

  const conn = await db.getConnection();

  /**
   * Inicializa la variable que almacenara la ruta
   * del archivo de fotografia creado durante el registro
   */
  let rutaArchivo = null;
  /**
   * Intenta registrar al estudiante, guardar su autorizaciòn
   * almacenar la fotografia y registrar el descriptor facial 
   */
  try {
    /**
     * Inicia una transaccion para que las operaciones 
     * se guarden juntas o se deshagan si ocurre un error
     */
    
    await conn.beginTransaction();

    /**
     * Insertar los datos del estudiante en la base de datos
     * El nombre y el documento se limpian con trim()
     * Tambien se genera un codigo QR utilizando el documento
     */

    const [r] = await conn.query(
      'INSERT INTO estudiantes (nombre, documento, codigo_qr) VALUES (?, ?, ?)',
      [nombre.trim(), documento.trim(), 'QR-' + documento.trim()]);

      /**
       * Obtiene el identificador generado
       * para el estudiante recien registrado
       */
    const id = r.insertId;

    /**
     * Registra la autorizaciòn aceptada
     * por el estudiante en la base de datos
     */

    await conn.query(
      'INSERT INTO autorizaciones (estudiante_id, aceptada) VALUES (?, TRUE)', [id]);

      /**
       * Elimina el encabezado del formato base64
       * para obtener unicamente los datos de la imagen
       */

    const base64 = foto.replace(/^data:image\/jpeg;base64,/, '');

    /**
     * Define la ruta relativa donde se guardara
     * la fotografia del estudiante
     */
    const rutaRelativa = 'uploads/' + id + '.jpg';

    /**Construye la ruta completa del archivo 
     * dentro de la carpeta principal del proyecto
     */
    rutaArchivo = path.join(RAIZ, rutaRelativa);

    /**
     * Convierte los datos base64 en un archivo
     * de imagen jpeg y lo guarda en el equipo
     */
    fs.writeFileSync(rutaArchivo, Buffer.from(base64, 'base64'));

    /**
     * Registra en la base de datos la ruta de la fotografia
     * y el descriptor facial convertido a formato json
     */

    await conn.query(
      'INSERT INTO rostros (estudiante_id, foto_ruta, descriptor) VALUES (?, ?, ?)',
      [id, rutaRelativa, JSON.stringify(descriptor)]);

      /**
       * Confirma la transaccion y guarda definitivamente
       * todas las operaciones realizadas 
       */

    await conn.commit();

    /**
     * Devuelve una respuesta 201 indicando que se registro correctamente
     */
    res.status(201).json({ ok: true, id });
  } catch (e) {

    /**
     * Deshace las operaciones de la transaccion 
     * si ocurre un error durante el registro
     */
    await conn.rollback();

    /**
     * Si se alcanzo a crear la fotografia
     * elimina el archivo para evitar que quede almacenado
     * sin registro valido
     */
    if (rutaArchivo && fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);

    /**
     * Comprueba si el error se debe al documento
     *  ya esta registrado en la base de datos
     * en este caso devuelve una respuestas 409
     */
    if (e.code === 'ER_DUP_ENTRY') {   // documento repetido (UNIQUE en la base de datos)
      return res.status(409).json({ error: 'El estudiante ya está registrado' });
    }

    /**
     * Captura y registra cualquier otro error
     * ocurrido durante el proceso de registro
     * devuelve una respuesta 500
     */
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {

    /**
     * Libera la conexion utilizada en la transaccion
     * para que pueda ser utilizada nuevamente
     */
    conn.release();
  }

  
});

/**
   * Ruta para editar los datos de un estudiante 
   * permite actualizar el nombre y el documento
   * 
   * @param {string} req.params.id Identificador del estudiante
   * @param {string} req.body.nombre nombre del estudiante
   * @param {string} req.body.documento nuevo documento del estudiante
   */

router.put('/:id', async function (req, res) {

  /**
   * Obtien el nombre y el documento enviados
   * para actualizar los datos del estudiante
   */
  var datos = req.body || {};
  var nombre = datos.nombre;
  var documento = datos.documento;
  /**
   * Verifica que se hayan ingresado
   * el nombrew y el documento
   */
  if (!nombre || !documento) {
    return res.status(400).json({ error: 'Complete todos los campos obligatorios' });
  }
  /**
   * Intenta actualizar los datos de l estudiante
   * identificador por el id recibido en la ruta 
   */
  try {

    /**
     * Actualizar el nombre y el documento
     * del estudiante en la base de datos
     */
    const [r] = await db.query(
      'UPDATE estudiantes SET nombre = ?, documento = ? WHERE id = ?',
      [nombre.trim(), documento.trim(), req.params.id]);

      /**
       * Comprueba su se modifico algun registro
       * si no se encontro el estudiante, devuelve un error 404.
       */
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    /**
     * Devuelve una respuesta indicando
     * que los datos fueron actualizados
     */
    res.json({ ok: true });
  } catch (e) {

    /**
     * Comprueba si el documento ingresado ya pertenece a otro estudiante
     * si esta repetido, devuelve una respuesta 409.
     */
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un estudiante con ese documento' });
    }

    /**
     * Captura los demas errores que puedan ocurrir
     */
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/**
 * Ruta para eliminar un estudiante
 * elimina su datos de la base de datos y tambien su fotografia
 * 
 * @param {string} req.params.id idetificador estudiante
 */


router.delete('/:id', async function (req, res) {

  /** 
   * intenta consutar y eliminar al estudiante
   *  junto con el archivo de su fotografia 
   */

  try {
    /**
     *  Consulta la ruta de la fotografía asociada
     * al estudiante que se desea eliminar.
     */
    const [fotos] = await db.query(
      'SELECT foto_ruta FROM rostros WHERE estudiante_id = ?', [req.params.id]);
      /**
       * Elimina el registro del estudiante de la base de datos
       * utilizando el identificador recibido en la solicitud
       */
    const [r] = await db.query('DELETE FROM estudiantes WHERE id = ?', [req.params.id]);

    /**
     * 
     * Comprueba si se elimino algun registro
     * si el estudiante no existe, devuelve un error 404
     */
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });

      /**
       * Compruenba si el estudiante tenia una fotografia registrada
       */
    }
    if (fotos[0] && fotos[0].foto_ruta) {
      /**
       * Construye la ruta completa donde se encuentra
       */
      const archivo = path.join(RAIZ, fotos[0].foto_ruta);

      /**
       * verifica que el archivo existe antes de eliminarlo
       */
      if (fs.existsSync(archivo)) fs.unlinkSync(archivo);

    }

    /**
     * Devuelve na respuestaa indicando que el estudiante
     * fue eliminado correctamente
     */
    res.json({ ok: true });

  } catch (e) {
     /**
     * captura los errores que puedan ocurrir durante la consulta, o eliminacion de estudiantes 
     */
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
/**
 * Exporta el router para que pueda ser utilizado 
 * desde el archivo principal de la aplicacion 
 */

module.exports = router;
