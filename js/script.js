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
