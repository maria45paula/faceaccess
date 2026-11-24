(function () {
  const raiz = document.documentElement;
  const TEXTO = 'fa_texto_grande';
  const CONTRASTE = 'fa_alto_contraste';

  // localStorage puede estar bloqueado (modo privado): en ese caso el modo vale solo en esa pantalla
  function leer(clave) { try { return localStorage.getItem(clave) === '1'; } catch (e) { return false; } }
  function guardar(clave, activo) { try { localStorage.setItem(clave, activo ? '1' : '0'); } catch (e) { /* sin guardar */ } }

  // Se aplica antes de que cargue el resto de la página, así no se ve un parpadeo
  raiz.classList.toggle('texto-grande', leer(TEXTO));
  raiz.classList.toggle('alto-contraste', leer(CONTRASTE));

  // Botón que se enciende y se apaga. El estado se anuncia con aria-pressed y también se ve con una marca ✔
  function crearInterruptor(etiqueta, clase, clave) {
    const boton = document.createElement('button');
    boton.type = 'button';

    function pintar() {
      const activo = raiz.classList.contains(clase);
      boton.setAttribute('aria-pressed', String(activo));
      boton.replaceChildren();
      if (activo) {
        const marca = document.createElement('span');
        marca.setAttribute('aria-hidden', 'true');   // el lector de pantalla ya dice "presionado"
        marca.textContent = '✔ ';
        boton.append(marca);
      }
      boton.append(etiqueta);
    }

    boton.addEventListener('click', () => {
      const activo = raiz.classList.toggle(clase);
      guardar(clave, activo);
      pintar();
    });
    pintar();
    return boton;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const barra = document.createElement('div');
    barra.className = 'fa-barra';
    barra.setAttribute('role', 'group');
    barra.setAttribute('aria-label', 'Opciones de accesibilidad');
    barra.append(
      crearInterruptor('Texto grande', 'texto-grande', TEXTO),
      crearInterruptor('Alto contraste', 'alto-contraste', CONTRASTE)
    );
    document.body.prepend(barra);
  });
})();