(function(){

  var WHATSAPP_NUMBER = "5491126008116"; // número con código de país, formato wa.me (54 9 + área + número)

  var flavors = [
    {id:"carne", name:"Carne", note:"Clásica"},
    {id:"carne_picante", name:"Carne Picante", note:""},
    {id:"pollo", name:"Pollo", note:""},
    {id:"jamon_queso", name:"Jamón y Queso", note:""},
    {id:"queso_cebolla", name:"Queso y Cebolla", note:"Vegetariana"},
    {id:"parisien", name:"Parisién", note:""},
    {id:"choclo", name:"Choclo", note:"Vegetariana"},
    {id:"matambre", name:"Matambre", note:""},
    {id:"cuatro_quesos", name:"4 Quesos", note:"Vegetariana"},
    {id:"ternera_queso", name:"Ternera y Queso", note:""},
    {id:"sfijas", name:"Sfijas", note:"Especialidad"}
  ];

  // qty[id] = cantidad de "medias docenas" (cada click suma/resta 0,5 docena)
  var qty = {};
  flavors.forEach(function(f){ qty[f.id] = 0; });

  function fmt(n){
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
  }

  var picker = document.getElementById('flavorPicker');
  flavors.forEach(function(f){
    var row = document.createElement('div');
    row.className = 'flavor-row';
    row.innerHTML =
      '<div><span class="fname">'+f.name+'</span>'+(f.note ? '<span class="fnote">'+f.note+'</span>' : '')+'</div>' +
      '<div class="stepper">' +
        '<button type="button" data-act="minus" data-id="'+f.id+'" aria-label="Restar media docena de '+f.name+'">–</button>' +
        '<span class="qty" id="qty-'+f.id+'">0</span>' +
        '<button type="button" data-act="plus" data-id="'+f.id+'" aria-label="Sumar media docena de '+f.name+'">+</button>' +
      '</div>';
    picker.appendChild(row);
  });

  picker.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(!btn) return;
    var id = btn.getAttribute('data-id');
    var act = btn.getAttribute('data-act');
    if(act === 'plus') qty[id]++;
    if(act === 'minus') qty[id] = Math.max(0, qty[id]-1);
    document.getElementById('qty-'+id).textContent = fmt(qty[id] * 0.5);
    render();
  });

  function priceForDocena(totalDocenas){
    if(totalDocenas >= 7) return 20000;
    return 22000;
  }

  function render(){
    var lines = document.getElementById('orderLines');
    var totalEl = document.getElementById('orderTotal');
    var tierNote = document.getElementById('tierNote');
    var waBtn = document.getElementById('waOrderBtn');

    var totalHalfUnits = 0;
    flavors.forEach(function(f){ totalHalfUnits += qty[f.id]; });
    var totalDocenas = totalHalfUnits * 0.5;

    if(totalHalfUnits === 0){
      lines.innerHTML = '<p class="order-empty">Todavía no elegiste ninguna media docena.</p>';
      totalEl.textContent = '$0';
      tierNote.textContent = '1 a 6 docenas: $22.000 c/u · 7 docenas o más: $20.000 c/u';
      waBtn.setAttribute('aria-disabled','true');
      waBtn.style.opacity = '.5';
      waBtn.style.pointerEvents = 'none';
      waBtn.href = '#';
      return;
    }

    var unitPriceDocena = priceForDocena(totalDocenas);
    var unitPriceHalf = unitPriceDocena / 2;
    var total = totalHalfUnits * unitPriceHalf;

    var html = '';
    var msgLines = [];
    flavors.forEach(function(f){
      if(qty[f.id] > 0){
        var docenasF = qty[f.id] * 0.5;
        var label = fmt(docenasF) + ' docena' + (docenasF === 1 ? '' : 's') + ' de ' + f.name;
        html += '<div class="order-line"><span>'+f.name+'</span><span>x'+fmt(docenasF)+'</span></div>';
        msgLines.push('- ' + label);
      }
    });
    lines.innerHTML = html;
    totalEl.textContent = '$' + total.toLocaleString('es-AR');

    if(totalDocenas >= 7){
      tierNote.textContent = 'Precio promo por volumen: $20.000 c/u (' + fmt(totalDocenas) + ' docenas)';
    } else {
      tierNote.textContent = '$22.000 c/u · Llegando a 7 docenas el precio baja a $20.000 c/u';
    }

    var msg = 'Hola! Quiero hacer este pedido a TAFÍ\'S:%0A%0A' +
      encodeURIComponent(msgLines.join('\n')) +
      '%0A%0A' + encodeURIComponent('Total: ' + fmt(totalDocenas) + ' docenas x $' + unitPriceDocena.toLocaleString('es-AR') + ' = $' + total.toLocaleString('es-AR')) +
      '%0A%0A' + encodeURIComponent('¿Coordinamos día y horario de entrega?');

    waBtn.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg;
    waBtn.removeAttribute('aria-disabled');
    waBtn.style.opacity = '1';
    waBtn.style.pointerEvents = 'auto';
  }

  render();
})();

// ===== Carrusel "Nuestra filosofía": loop infinito + autoplay + arrastre manual (mouse y touch) =====
(function(){

  var wrap = document.querySelector('.philosophy-track-wrap');
  var track = document.getElementById('philosophyTrack');
  if(!wrap || !track) return;

  var originalGroup = track.querySelector('.philosophy-group');
  if(!originalGroup) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var AUTOPLAY_SPEED = 0.9; // px "reales" por frame (se acumulan en un contador propio, ver más abajo)
  var RESUME_DELAY = 2200; // ms de inactividad antes de retomar el autoplay

  // Ancho de UNA vuelta completa de fotos (las 4 originales). Es el valor que
  // usamos para "dar la vuelta" del loop.
  var groupWidth = 0;

  // En pantallas anchas, con un solo grupo duplicado el navegador llega al
  // final físico del scroll ANTES del punto donde reiniciamos el ciclo
  // (el final real queda más cerca que la mitad necesaria), y el carrusel
  // se siente "cortado" en vez de infinito. La solución: clonar el grupo de
  // fotos las veces que hagan falta según el ancho de pantalla, para que
  // siempre sobre margen de sobra antes de tocar el final real.
  function ensureEnoughCopies(){
    groupWidth = originalGroup.getBoundingClientRect().width;
    if(!groupWidth) return;

    var needed = Math.ceil(wrap.clientWidth / groupWidth) + 2; // +2 grupos de margen
    var current = track.querySelectorAll('.philosophy-group').length;

    for(var i = current; i < needed; i++){
      var clone = originalGroup.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      var imgs = clone.querySelectorAll('img');
      for(var j = 0; j < imgs.length; j++){ imgs[j].setAttribute('alt', ''); }
      var links = clone.querySelectorAll('a');
      for(var k = 0; k < links.length; k++){ links[k].setAttribute('tabindex', '-1'); }
      track.appendChild(clone);
    }
  }

  var resizeTimer = null;
  function onResize(){
    if(resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(ensureEnoughCopies, 200);
  }

  var autoplay = !reduceMotion;
  var isPointerDragging = false;
  var isTouching = false;
  var moved = false;
  var startX = 0;
  var startScroll = 0;
  var resumeTimer = null;

  // wrap.scrollLeft solo acepta enteros: si acumuláramos el avance del autoplay
  // leyendo y escribiendo scrollLeft en cada frame, un incremento menor a 1px
  // se redondea siempre para abajo y el carrusel nunca se mueve. Por eso el
  // autoplay lleva su propio contador flotante, independiente del que usan
  // el arrastre manual y el scroll nativo (que sí trabajan directo sobre scrollLeft).
  var virtualScroll = wrap.scrollLeft;

  function syncVirtualScroll(){
    virtualScroll = wrap.scrollLeft;
  }

  function pauseAutoplay(){
    autoplay = false;
    if(resumeTimer){ clearTimeout(resumeTimer); resumeTimer = null; }
  }
  function scheduleResume(){
    if(reduceMotion) return;
    if(resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(function(){ syncVirtualScroll(); autoplay = true; }, RESUME_DELAY);
  }

  // Reubica el scroll dentro de una "vuelta" (groupWidth) para que el ciclo
  // se sienta infinito. Devuelve cuánto se corrigió, para poder reacomodar
  // también la referencia del arrastre manual (ver pointermove).
  function keepLooped(){
    if(groupWidth <= 0) return 0;
    var totalDelta = 0;
    while(wrap.scrollLeft >= groupWidth){
      wrap.scrollLeft -= groupWidth;
      totalDelta -= groupWidth;
    }
    while(wrap.scrollLeft < 0){
      wrap.scrollLeft += groupWidth;
      totalDelta += groupWidth;
    }
    return totalDelta;
  }

  function tick(){
    if(autoplay && !isPointerDragging && !isTouching && groupWidth > 0){
      virtualScroll += AUTOPLAY_SPEED;
      if(virtualScroll >= groupWidth){ virtualScroll -= groupWidth; }
      wrap.scrollLeft = Math.round(virtualScroll);
    }
    requestAnimationFrame(tick);
  }

  // --- Arrastre con mouse (Pointer Events, sin táctil: el táctil ya scrollea nativo) ---
  // Importante: NO se captura el puntero en pointerdown. Si se captura de entrada,
  // el click posterior (down+up sin mover) queda "dirigido" al wrap en vez de al
  // link de la tarjeta, y el botón "Conocé toda la historia" deja de navegar aun
  // en un click normal. Por eso el arrastre (y la captura) solo arranca cuando
  // el mouse se mueve más de unos pocos px — un click simple nunca lo activa.
  wrap.addEventListener('pointerdown', function(e){
    if(e.pointerType === 'touch') return;
    isPointerDragging = true;
    moved = false;
    pauseAutoplay();
    startX = e.clientX;
    startScroll = wrap.scrollLeft;
  });

  wrap.addEventListener('pointermove', function(e){
    if(!isPointerDragging) return;
    var dx = e.clientX - startX;
    if(!moved && Math.abs(dx) > 3){
      moved = true;
      wrap.classList.add('is-dragging');
      try{ wrap.setPointerCapture(e.pointerId); }catch(err){}
    }
    if(moved){
      wrap.scrollLeft = startScroll - dx;
      // Si el arrastre cruzó el punto de reinicio del loop, la referencia
      // "startScroll" tiene que correrse lo mismo: si no, el próximo
      // pointermove recalcula sobre la posición vieja (sin loopear) y el
      // scroll termina pegado contra el final real del navegador.
      var delta = keepLooped();
      if(delta) startScroll += delta;
    }
  });

  function endPointerDrag(){
    if(!isPointerDragging) return;
    isPointerDragging = false;
    wrap.classList.remove('is-dragging');
    syncVirtualScroll();
    scheduleResume();
  }
  wrap.addEventListener('pointerup', endPointerDrag);
  wrap.addEventListener('pointercancel', endPointerDrag);
  wrap.addEventListener('pointerleave', endPointerDrag);

  // Evita que un arrastre termine "clickeando" el botón de la última foto
  wrap.addEventListener('click', function(e){
    if(moved){ e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  // --- Táctil: usamos el scroll nativo del navegador (más fluido), solo pausamos el autoplay ---
  wrap.addEventListener('touchstart', function(){ isTouching = true; pauseAutoplay(); }, {passive:true});
  wrap.addEventListener('touchend', function(){ isTouching = false; syncVirtualScroll(); scheduleResume(); }, {passive:true});
  wrap.addEventListener('touchcancel', function(){ isTouching = false; syncVirtualScroll(); scheduleResume(); }, {passive:true});

  // Cualquier scroll (touch, trackpad, teclado) mantiene el loop correcto y sincroniza el contador
  wrap.addEventListener('scroll', function(){ keepLooped(); syncVirtualScroll(); }, {passive:true});

  // Pausa al pasar el mouse por encima (desktop), retoma al salir
  wrap.addEventListener('mouseenter', pauseAutoplay);
  wrap.addEventListener('mouseleave', function(){ if(!isPointerDragging) scheduleResume(); });

  window.addEventListener('resize', onResize);

  // Pausa cuando la pestaña no está visible, por performance
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ pauseAutoplay(); }
    else if(!isPointerDragging && !isTouching){ syncVirtualScroll(); autoplay = !reduceMotion; }
  });

  ensureEnoughCopies();
  requestAnimationFrame(tick);
})();
