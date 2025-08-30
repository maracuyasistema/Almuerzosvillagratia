// ==================== 1) Config Firebase ====================
const firebaseConfig = {
  apiKey: "AIzaSyCyOM53d_eMSOi4AOjbS2roW7ZTZCJFRoM",
  authDomain: "pedidos-maracuya-villa-gratia.firebaseapp.com",
  databaseURL: "https://pedidos-maracuya-villa-gratia-default-rtdb.firebaseio.com",
  projectId: "pedidos-maracuya-villa-gratia",
  storageBucket: "pedidos-maracuya-villa-gratia.appspot.com",
  messagingSenderId: "133347942396",
  appId: "1:133347942396:web:d28e071c2449b8544c1c79"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==================== 2) Fecha y helpers ====================
function pad(n){return n<10?'0'+n:n;}
const hoy = new Date();
const yyyy = hoy.getFullYear();
const mm = pad(hoy.getMonth()+1);
const dd = pad(hoy.getDate());
const fechaStr = `${yyyy}-${mm}-${dd}`;

document.getElementById('fechaActual').textContent = hoy.toLocaleDateString('es-PE', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
document.getElementById('fecha-pedido').value = fechaStr;
document.getElementById('metodo-pago').value = "Credito";
document.getElementById('fecha-mostrar').value = fechaStr;

// ==================== 3) Estados globales ====================
let listaJugos = [];
let listaFondos = [];
let listaPlatosVariados = [];

let _listaPedidosDelDia = [];
let _filtroActivo = null; // { tipo: 'pendientes' | 'morosos' }
let _pedidosRefActual = null;

// alumno seleccionado
window.listaAlumnos = [];
window.alumnoSeleccionadoKey = '';
window.alumnoSeleccionadoNombre = '';
window._gradoSeleccionado = '';
window._nivelSeleccionado = '';
window._salonSeleccionado = '';

const nombreNinoInput = document.getElementById('nombre-nino');
const btnEditarEst = document.getElementById('btn-editar-estudiante');

// ======= Reporte (rango) =======
window.__reporteBase = [];     // lista sin filtrar del rango
window.__reporteFiltrado = []; // lista tras filtros activos

// ==================== 4) Catálogos ====================
db.ref('Jugos').on('value', snap => {
  listaJugos = [];
  snap.forEach(child => {
    const val = child.val();
    if(val) listaJugos.push(val.Nombre || val.nombre || val);
  });
});
db.ref('Fondos').on('value', snap => {
  listaFondos = [];
  snap.forEach(child => {
    const val = child.val();
    if(val) listaFondos.push(val.Nombre || val.nombre || val);
  });
});
db.ref('Variados').on('value', snap => {
  listaPlatosVariados = [];
  snap.forEach(child => {
    const val = child.val();
    if(val) listaPlatosVariados.push(val.Nombre || val.nombre || val);
  });
});

// ==================== 5) Desayunos: selects dependientes ====================
let categoriasBebidas = [];
let productosPorCategoriaBebidas = {};
let categoriasFondo = [];
let productosPorCategoriaFondo = {};

function cargarDesayunoFirebase() {
  db.ref('Desayunos').once('value').then(snap => {
    categoriasBebidas = [];
    productosPorCategoriaBebidas = {};
    categoriasFondo = [];
    productosPorCategoriaFondo = {};
    snap.forEach(child => {
      const val = child.val();
      if(val?.tipo === "Bebidas") {
        if(!categoriasBebidas.includes(val.categoria)) {
          categoriasBebidas.push(val.categoria);
          productosPorCategoriaBebidas[val.categoria] = [];
        }
        productosPorCategoriaBebidas[val.categoria].push(val.producto);
      }
      if(val?.tipo === "Fondo") {
        if(!categoriasFondo.includes(val.categoria)) {
          categoriasFondo.push(val.categoria);
          productosPorCategoriaFondo[val.categoria] = [];
        }
        productosPorCategoriaFondo[val.categoria].push(val.producto);
      }
    });
    llenarSelectSimple('bebidas-categoria', categoriasBebidas);
    llenarSelectSimple('fondo-categoria', categoriasFondo);
    llenarSelectSimple('bebidas-producto', []);
    llenarSelectSimple('fondo-producto', []);
  });
}
function llenarSelectSimple(id, array) {
  const sel = document.getElementById(id);
  if(!sel) return;
  sel.innerHTML = `<option value="">Selecciona</option>`;
  array.forEach(val => sel.innerHTML += `<option value="${val}">${val}</option>`);
}
document.addEventListener('DOMContentLoaded', function() {
  cargarDesayunoFirebase();
  document.getElementById('bebidas-categoria').addEventListener('change', function(){
    const cat = this.value;
    llenarSelectSimple('bebidas-producto', cat ? productosPorCategoriaBebidas[cat] : []);
  });
  document.getElementById('fondo-categoria').addEventListener('change', function(){
    const cat = this.value;
    llenarSelectSimple('fondo-producto', cat ? productosPorCategoriaFondo[cat] : []);
  });
});

// ==================== 6) Mostrar/Ocultar por tipo ====================
function actualizarLabelsPorTipo() {
  const tipo = document.getElementById('tipo-pedido').value;
  const bloqueDesayuno = document.getElementById('bloque-desayuno');
  const bloqueGeneral = document.getElementById('bloque-general');
  if(bloqueDesayuno && bloqueGeneral) {
    bloqueDesayuno.style.display = (tipo === "Desayunos") ? '' : 'none';
    bloqueGeneral.style.display = (tipo === "Desayunos") ? 'none' : '';
  }
  const grupoEntrada = document.getElementById('grupo-entrada');
  const grupoPostre = document.getElementById('grupo-postre');
  if (tipo === "Variado") {
    if (grupoEntrada) grupoEntrada.style.display = 'none';
    if (grupoPostre) grupoPostre.style.display = 'none';
    document.getElementById('entrada').value = "";
    document.getElementById('postre').value = "";
  } else if (tipo === "Desayunos") {
    if (grupoEntrada) grupoEntrada.style.display = '';
    if (grupoPostre) grupoPostre.style.display = 'none';
    document.getElementById('postre').value = "nullahi";
  } else {
    if (grupoEntrada) grupoEntrada.style.display = '';
    if (grupoPostre) grupoPostre.style.display = '';
  }
  document.getElementById('label-menu-dia').textContent = (tipo === "Desayunos") ? "Jugo" : "Plato";
  document.getElementById('label-entrada').textContent = (tipo === "Desayunos") ? "Fondo" : "Entrada";
  document.getElementById('label-postre').textContent = (tipo === "Desayunos") ? "" : "Postre";

  const menuInput = document.getElementById('menu-dia');
  const entradaInput = document.getElementById('entrada');
  if (menuInput && entradaInput) {
    if (tipo === "Almuerzo") {
      menuInput.setAttribute('readonly', true);
      menuInput.classList.add('input-disabled');
      entradaInput.setAttribute('readonly', true);
      entradaInput.classList.add('input-disabled');
    } else {
      menuInput.removeAttribute('readonly');
      menuInput.classList.remove('input-disabled');
      entradaInput.removeAttribute('readonly');
      entradaInput.classList.remove('input-disabled');
    }
  }
}
document.getElementById('tipo-pedido').addEventListener('change', function(){
  if(this.value === "Desayunos") cargarDesayunoFirebase();
  mostrarOcultarPromoBtn();
  actualizarLabelsPorTipo();
  cargarMenuPorFechaYTipo();
});
actualizarLabelsPorTipo();

// ==================== 7) Cargar menú por fecha/tipo ====================
function cargarMenuPorFechaYTipo() {
  const fecha = document.getElementById('fecha-pedido').value;
  const tipo = document.getElementById('tipo-pedido').value;
  if (tipo === "Almuerzo") {
    db.ref(`Almuerzos/${fecha}`).once('value').then(snap => {
      const menuDia = snap.val();
      document.getElementById('menu-dia').value   = (menuDia && menuDia["Menú"])    ? menuDia["Menú"]    : 'No hay menú';
      document.getElementById('entrada').value    = (menuDia && menuDia["Entrada"]) ? menuDia["Entrada"] : 'No hay entrada';
      document.getElementById('postre').value     = (menuDia && menuDia["Postre"])  ? menuDia["Postre"]  : 'No hay postre';
    });
  } else {
    document.getElementById('menu-dia').value = "";
    document.getElementById('entrada').value = "";
    document.getElementById('postre').value = (tipo === "Desayunos") ? "nullahi" : "";
  }
  actualizarLabelsPorTipo();
}
document.getElementById('fecha-pedido').addEventListener('change', cargarMenuPorFechaYTipo);
cargarMenuPorFechaYTipo();

// ==================== 8) Autocomplete Variados (platos) ====================
window.filtrarPlatos = function() {
  const tipo = document.getElementById('tipo-pedido').value;
  if (tipo !== "Variado") return;
  const input = document.getElementById('menu-dia');
  const sugerencias = document.getElementById('sugerenciasPlatos');
  const val = input.value.trim().toLowerCase();
  sugerencias.innerHTML = "";
  if (val.length < 1) { sugerencias.classList.remove('active'); return; }
  const encontrados = listaPlatosVariados.filter(j => j.toLowerCase().includes(val));
  encontrados.forEach(j => {
    let div = document.createElement('div');
    div.textContent = j;
    div.onclick = function() {
      input.value = j;
      sugerencias.classList.remove('active'); sugerencias.innerHTML = "";
    };
    sugerencias.appendChild(div);
  });
  sugerencias.classList.add('active');
};
document.getElementById('menu-dia').addEventListener('input', () => {
  if (document.getElementById('tipo-pedido').value === "Variado") filtrarPlatos();
});
document.getElementById('menu-dia').addEventListener('focus', () => {
  if (document.getElementById('tipo-pedido').value === "Variado") filtrarPlatos();
});

// ==================== 9) Autocomplete Nombres ====================
db.ref('Nombres').on('value', snap => {
  window.listaAlumnos = [];
  snap.forEach(child => {
    const val = child.val();
    val._id = child.key;
    window.listaAlumnos.push(val);
  });
});
window.filtrarNombres = function() {
  const input = nombreNinoInput;
  const nombreInput = input.value.trim().toLowerCase();
  const sugerencias = document.getElementById('sugerenciasNombres');
  sugerencias.innerHTML = "";
  if (nombreInput.length < 2) { sugerencias.classList.remove('active'); return; }
  if (!window.listaAlumnos.length) {
    sugerencias.classList.remove('active');
    document.getElementById('infoAlumno').innerHTML = '<span style="color: #999; font-size: 0.9em;">Cargando estudiantes...</span>';
    return;
  }
  const encontrados = window.listaAlumnos.filter(alum =>
    alum.Nombre && alum.Nombre.toLowerCase().includes(nombreInput)
  );
  if (!encontrados.length) {
    sugerencias.classList.remove('active');
    document.getElementById('infoAlumno').innerHTML = '<span style="color: #999; font-size: 0.9em;">Sin coincidencias.</span>';
    return;
  }
  encontrados.forEach(alum => {
    let div = document.createElement('div');
    div.textContent = alum.Nombre + " (" + (alum.Grado || '-') + ", " + (alum.Salon || '-') + ")";
    div.onclick = function() {
      input.value = alum.Nombre;
      window.alumnoSeleccionadoKey = alum._id;
      window.alumnoSeleccionadoNombre = alum.Nombre;
      window._gradoSeleccionado = alum.Grado || '';
      window._nivelSeleccionado = alum.Nivel || '';
      window._salonSeleccionado = alum.Salon || '';
      btnEditarEst.style.display = '';
      document.getElementById('infoAlumno').innerHTML = `
        <p><strong>Nombre:</strong> ${alum.Nombre || ''}</p>
        <p><strong>Grado:</strong> ${alum.Grado || ''}</p>
        <p><strong>Nivel:</strong> ${alum.Nivel || ''}</p>
        <p><strong>Salón:</strong> ${alum.Salon || ''}</p>
      `;
      sugerencias.classList.remove('active');
    };
    sugerencias.appendChild(div);
  });
  sugerencias.classList.add('active');
};
nombreNinoInput.addEventListener('input', function() {
  if (this.value !== window.alumnoSeleccionadoNombre) {
    btnEditarEst.style.display = 'none';
    window.alumnoSeleccionadoKey = '';
    window.alumnoSeleccionadoNombre = '';
    window._gradoSeleccionado = '';
    window._nivelSeleccionado = '';
    window._salonSeleccionado = '';
    document.getElementById('infoAlumno').innerHTML = '';
  }
  window.filtrarNombres && window.filtrarNombres();
});
nombreNinoInput.addEventListener('focus', window.filtrarNombres);
document.addEventListener('click', function(e){
  if(!e.target.closest('.form-group')) {
    document.getElementById('sugerenciasNombres').classList.remove('active');
    document.getElementById('sugerenciasPlatos').classList.remove('active');
  }
});
nombreNinoInput.addEventListener('keydown', function(e){
  if (e.key === 'Enter') e.preventDefault();
});

// ==================== 10) Filtro fecha del día ====================
document.getElementById('fecha-mostrar').addEventListener('change', function(){
  const fecha = this.value || fechaStr;
  _filtroActivo = null;
  cargarPedidos(fecha);
});

// ==================== 11) Registrar pedido individual ====================
document.getElementById('form-pedido').addEventListener('submit', function(e) {
  e.preventDefault();
  const nombre = nombreNinoInput.value.trim();

  if (!window.alumnoSeleccionadoKey) {
    alert('Debes seleccionar un alumno de la lista de sugerencias');
    nombreNinoInput.focus(); return;
  }

  const fecha = document.getElementById('fecha-pedido').value;
  const tipo = document.getElementById('tipo-pedido').value;
  let menu = '', entrada = '', postre = '';
  if (tipo === "Desayunos") {
    menu = document.getElementById('bebidas-producto').value;
    entrada = document.getElementById('fondo-producto').value;
    postre = "";
  } else if (tipo === "Variado") {
    menu = document.getElementById('menu-dia').value;
    entrada = ""; postre = "";
  } else {
    menu = document.getElementById('menu-dia').value;
    entrada = document.getElementById('entrada').value;
    postre = document.getElementById('postre').value;
  }
  const pagado = document.getElementById('metodo-pago').value === "Pagado";
  const observaciones = document.getElementById('observaciones').value.trim();

  if (tipo === "Almuerzo") {
    db.ref('pedidos').orderByChild('fecha').equalTo(fecha).once('value').then(snap => {
      let yaHay = false;
      snap.forEach(child => {
        let val = child.val();
        if(val.nombre && val.nombre.toLowerCase() === nombre.toLowerCase() && val.tipo === "Almuerzo") yaHay = true;
      });
      if (yaHay) { alert('¡Este alumno ya tiene pedido de almuerzo para ese día!'); return; }
      guardarPedido();
    });
  } else {
    guardarPedido();
  }

  function guardarPedido() {
    const nuevoRef = window._editandoPedidoID ? db.ref('pedidos/' + window._editandoPedidoID) : db.ref('pedidos').push();
    const pedido = {
      id: nuevoRef.key,
      nombre, fecha, tipo, menu, entrada, postre,
      pagado, estado: "Pendiente", observaciones,
      grado: window._gradoSeleccionado || '',
      nivel: window._nivelSeleccionado || '',
      salon: window._salonSeleccionado || ''
    };
    nuevoRef.set(pedido).then(()=>{
      document.getElementById('form-pedido').reset();
      document.getElementById('fecha-pedido').value = fechaStr;
      document.getElementById('infoAlumno').innerHTML = '';
      window._gradoSeleccionado = ''; window._nivelSeleccionado = ''; window._salonSeleccionado = '';
      window.alumnoSeleccionadoKey = ''; window.alumnoSeleccionadoNombre = '';
      window._editandoPedidoID = null;
      cargarMenuPorFechaYTipo(); actualizarLabelsPorTipo();
      cargarPedidos(document.getElementById('fecha-mostrar').value || fechaStr);
      alert("Pedido registrado exitosamente!");
    });
  }
});

// ==================== 12) Cargar pedidos del día (sin fugas) ====================
function cargarPedidos(fecha) {
  if (_pedidosRefActual) _pedidosRefActual.off('value');
  const ref = db.ref('pedidos').orderByChild('fecha').equalTo(fecha);
  _pedidosRefActual = ref;
  ref.on('value', snap => {
    const pedidos = snap.val() || {};
    _listaPedidosDelDia = Object.values(pedidos);
    resumenPedidos(_listaPedidosDelDia);
    aplicarFiltroYRender();
  });
}
cargarPedidos(fechaStr);

// ==================== 13) Render tabla día ====================
function renderizaPedidos(lista) {
  const tbody = document.getElementById('tbody-pedidos');
  tbody.innerHTML = "";
  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#aaa;">No hay pedidos hoy.</td></tr>`;
    return;
  }
  lista.forEach(p => {
    const pagoBadge =
      `<span class="badge ${p.pagado ? 'badge-pagado' : 'badge-pendiente'}">${p.pagado ? 'Pagado' : 'Pendiente'}</span>`;
    const estadoBadge =
      `<span class="badge ${
        p.estado==='Pendiente' ? 'badge-pendiente':
        (p.estado==='Entregado' ? 'badge-pagado':'badge-rechazado')
      }">${p.estado}</span>`;
    tbody.innerHTML += `
      <tr>
        <td>${p.nombre || '-'}</td>
        <td>${p.tipo || '-'}</td>
        <td>${p.menu||'-'}<br><span class="small">${p.entrada||''} ${p.postre&&p.postre!=="nullahi" ? '· '+p.postre : ''}</span></td>
        <td>${pagoBadge}</td>
        <td>${estadoBadge}</td>
        <td>${p.observaciones || "—"}</td>
        <td>
          ${p.estado === "Pendiente" ? `
            <button class="btn-tabla btn-mini btn-green" onclick="marcarEntregado('${p.id}')">Entregar</button>
            <button class="btn-tabla btn-mini btn-red"   onclick="rechazarPedido('${p.id}')">Rechazar</button>
          ` : ""}
          <button class="btn-tabla btn-mini btn-azul" onclick="editarPedido('${p.id}')">Editar</button>
          <button class="btn-tabla btn-mini btn-grey" onclick="eliminarPedido('${p.id}')">Eliminar</button>
        </td>
      </tr>
    `;
  });
}

// ==================== 14) Acciones pedido ====================
window.marcarEntregado = id => db.ref('pedidos/' + id).update({estado: "Entregado"});
window.rechazarPedido  = id => db.ref('pedidos/' + id).update({estado: "Rechazado"});
window.eliminarPedido  = id => { if(confirm("¿Eliminar pedido?")) db.ref('pedidos/' + id).remove(); }

window.editarPedido = function(id) {
  db.ref('pedidos/' + id).once('value').then(snap => {
    const p = snap.val(); if (!p) return alert('Pedido no encontrado');
    document.getElementById('nombre-nino').value = p.nombre;
    document.getElementById('fecha-pedido').value = p.fecha;
    document.getElementById('tipo-pedido').value = p.tipo;
    document.getElementById('observaciones').value = p.observaciones || "";
    actualizarLabelsPorTipo(); cargarMenuPorFechaYTipo();
    if (p.tipo === "Desayunos") {
      setTimeout(() => {
        document.getElementById('bebidas-producto').value = p.menu || "";
        document.getElementById('fondo-producto').value = p.entrada || "";
      }, 350);
    } else if (p.tipo === "Variado") {
      document.getElementById('menu-dia').value = p.menu || "";
    } else {
      document.getElementById('menu-dia').value = p.menu || "";
      document.getElementById('entrada').value = p.entrada || "";
      document.getElementById('postre').value = p.postre || "";
    }
    document.getElementById('metodo-pago').value = p.pagado ? "Pagado" : "Credito";
    window._editandoPedidoID = id;

    const alum = window.listaAlumnos.find(a => a.Nombre === p.nombre);
    if (alum) {
      window.alumnoSeleccionadoKey = alum._id;
      window.alumnoSeleccionadoNombre = alum.Nombre;
      window._gradoSeleccionado = alum.Grado || '';
      window._nivelSeleccionado = alum.Nivel || '';
      window._salonSeleccionado = alum.Salon || '';
      btnEditarEst.style.display = '';
    }
  });
};

// ==================== 15) Tarjetas: resumen + filtros por click ====================
function resumenPedidos(lista) {
  const total      = lista.length;
  const entregados = lista.filter(p=>p.estado==="Entregado").length;
  const pendientes = lista.filter(p=>p.estado==="Pendiente").length;
  const morosos    = lista.filter(p=>!p.pagado).length;

  const cards = document.querySelectorAll('.admin-card-num');
  if(cards[0]) cards[0].textContent = total;
  if(cards[1]) cards[1].textContent = entregados;
  if(cards[2]) cards[2].textContent = pendientes;
  if(cards[3]) cards[3].textContent = morosos;

  const cardPendientes = document.querySelector('.card-orange');
  const cardMorosos    = document.querySelector('.card-violet');

  if (cardPendientes && !cardPendientes.dataset.bindClick) {
    cardPendientes.dataset.bindClick = '1';
    cardPendientes.addEventListener('click', () => {
      _filtroActivo = { tipo: 'pendientes' };
      aplicarFiltroYRender();
    });
  }
  if (cardMorosos && !cardMorosos.dataset.bindClick) {
    cardMorosos.dataset.bindClick = '1';
    cardMorosos.addEventListener('click', () => {
      _filtroActivo = { tipo: 'morosos' };
      aplicarFiltroYRender();
    });
  }
}

function aplicarFiltroYRender() {
  let lista = [..._listaPedidosDelDia];
  if (_filtroActivo?.tipo === 'pendientes') lista = lista.filter(p => p.estado === 'Pendiente');
  if (_filtroActivo?.tipo === 'morosos')    lista = lista.filter(p => !p.pagado);
  renderizaPedidos(lista);

  const barra = document.getElementById('filtro-activo-bar');
  if (_filtroActivo) {
    barra.style.display = '';
    barra.querySelector('span').textContent =
      _filtroActivo.tipo === 'pendientes' ? 'Filtro: Pendientes' :
      _filtroActivo.tipo === 'morosos'    ? 'Filtro: Morosos'    : '';
  } else {
    barra.style.display = 'none';
  }
}
document.getElementById('btn-quitar-filtro')?.addEventListener('click', () => {
  _filtroActivo = null; aplicarFiltroYRender();
});

// ==================== 16) Impresión tarjetas del día ====================
window.imprimirPedidos = function() {
  let filas = document.querySelectorAll("#tbody-pedidos tr");
  if (filas.length == 0 || filas[0].children[0].textContent.includes("No hay pedidos")) {
    alert("No hay pedidos para imprimir."); return;
  }
  let html = `
    <html>
    <head>
      <title>Pedidos de Hoy</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .pedido-tarjeta {
          border: 2px solid #0066cc; border-radius: 18px;
          padding: 18px 30px; margin: 20px auto; max-width: 430px;
          background: #f6faff; box-shadow: 0 4px 18px #005cbb15;
        }
        .pedido-tarjeta h2 { margin: 0 0 6px; font-size: 2em; color: #094785; }
        .pedido-info { font-size: 1.1em; margin: 4px 0 10px; }
        .pedido-observacion { color: #D2691E; font-weight: bold; font-size: 1.08em; margin-top: 6px; }
      </style>
    </head>
    <body>
      <h1 style="text-align:center">Pedidos de Hoy</h1>
  `;
  filas.forEach(fila => {
    let celdas = fila.children; if (celdas.length < 7) return;
    let nombre = celdas[0].textContent.trim();
    let tipo = celdas[1].textContent.trim();
    let detalles = celdas[2].textContent.trim();
    let estado = celdas[4].textContent.trim();
    let observacion = celdas[5].textContent.trim();
    html += `
      <div class="pedido-tarjeta">
        <h2>${nombre}</h2>
        <div class="pedido-info"><b>Tipo:</b> ${tipo}</div>
        <div class="pedido-info"><b>Pedido:</b> <span style="font-weight:bold">${detalles.replace(/\n/g, "<br>")}</span></div>
        <div class="pedido-info"><b>Estado:</b> ${estado}</div>
        ${observacion && observacion !== "—" ? `<div class="pedido-observacion">Observación: ${observacion}</div>` : ""}
      </div>
    `;
  });
  html += `</body></html>`;
  let printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(html);
  printWindow.document.close(); printWindow.focus(); printWindow.print();
  setTimeout(() => printWindow.close(), 800);
};

// ==================== 17) Exportar Excel tabla del día ====================
window.exportarExcelTablaHoy = function() {
  let tabla = document.getElementById("tabla-hoy");
  let csv = [];
  for (let row of tabla.rows) {
    let cols = [];
    for (let cell of row.cells) {
      cols.push('"' + cell.innerText.replace(/"/g, '""') + '"');
    }
    csv.push(cols.join(","));
  }
  descargarCSV(csv.join("\n"), `pedidos_${document.getElementById('fecha-mostrar').value || fechaStr}.csv`);
};
function descargarCSV(contenido, nombre) {
  let blob = new Blob([contenido], { type: 'text/csv' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ==================== 18) Modal Estudiante (agregar/editar) ====================
const gradosPorNivel = {
  "Primaria": ["1er Grado","2do Grado","3er Grado","4to Grado","5to Grado","6to Grado"],
  "Secundaria": ["1er Año","2do Año","3er Año","4to Año","5to Año"]
};
const btnAgregarEst = document.getElementById('btn-agregar-estudiante');
const modalBg = document.getElementById('modal-estudiante-bg');
const modalTitulo = document.getElementById('modal-estudiante-titulo');
const formEst = document.getElementById('form-estudiante');
const msgEst = document.getElementById('msg-estudiante-modal');
const inputNombre = document.getElementById('modal-nombre');
const selectNivel = document.getElementById('modal-nivel');
const selectGrado = document.getElementById('modal-grado');
const inputSalon = document.getElementById('modal-salon');
const btnCerrarModal = document.getElementById('btn-cerrar-modal-est');

selectNivel.onchange = function() {
  let nivel = this.value;
  selectGrado.innerHTML = '<option value="">Selecciona</option>';
  if (nivel && gradosPorNivel[nivel]) {
    gradosPorNivel[nivel].forEach(g => selectGrado.innerHTML += `<option value="${g}">${g}</option>`);
  }
};
function cerrarModalEstudiante() { modalBg.classList.remove('activo'); msgEst.textContent=''; }
btnAgregarEst.onclick = function() {
  formEst.reset(); msgEst.textContent=''; modalTitulo.textContent='Agregar estudiante';
  formEst.dataset.mode='agregar'; formEst.dataset.key=''; modalBg.classList.add('activo');
  setTimeout(()=>inputNombre.focus(), 180);
};
btnEditarEst.onclick = function() {
  if(!window.alumnoSeleccionadoKey) { alert("Selecciona un estudiante existente para editar."); return; }
  const alum = window.listaAlumnos.find(a => a._id === window.alumnoSeleccionadoKey);
  if(!alum) { alert('No se encontró el estudiante.'); return; }
  formEst.reset(); msgEst.textContent=''; modalTitulo.textContent='Editar estudiante';
  inputNombre.value = alum.Nombre || '';
  selectNivel.value = alum.Nivel || ''; selectNivel.onchange();
  selectGrado.value = alum.Grado || ''; inputSalon.value = alum.Salon || '';
  formEst.dataset.mode='editar'; formEst.dataset.key=alum._id; modalBg.classList.add('activo');
  setTimeout(()=>inputNombre.focus(), 180);
};
btnCerrarModal.onclick = cerrarModalEstudiante;
modalBg.onclick = e => { if(e.target === modalBg) cerrarModalEstudiante(); };

formEst.onsubmit = e => {
  e.preventDefault();
  let nombre = inputNombre.value.trim();
  let nivel = selectNivel.value;
  let grado = selectGrado.value;
  let salon = inputSalon.value.trim();
  if(!nombre || !nivel || !grado) { msgEst.textContent = 'Completa todos los campos obligatorios.'; return; }
  if(formEst.dataset.mode === 'editar') {
    let key = formEst.dataset.key;
    if(!key) { msgEst.textContent = 'Error al editar. Intenta otra vez.'; return; }
    db.ref('Nombres/'+key).update({ Nombre:nombre, Nivel:nivel, Grado:grado, Salon:salon }).then(()=>{
      msgEst.textContent = '¡Estudiante actualizado!';
      db.ref('Nombres').once('value', snap => {
        window.listaAlumnos = []; snap.forEach(child => { const val = child.val(); val._id=child.key; window.listaAlumnos.push(val); });
      });
      setTimeout(cerrarModalEstudiante, 900);
    });
  } else {
    const yaExiste = window.listaAlumnos.some(a => a.Nombre && a.Nombre.trim().toLowerCase() === nombre.toLowerCase());
    if(yaExiste) { msgEst.textContent = 'Ya existe un estudiante con ese nombre.'; return; }
    db.ref('Nombres').push({ Nombre:nombre, Nivel:nivel, Grado:grado, Salon:salon }).then(()=>{
      msgEst.textContent = '¡Estudiante agregado!';
      db.ref('Nombres').once('value', snap => {
        window.listaAlumnos = []; snap.forEach(child => { const val = child.val(); val._id=child.key; window.listaAlumnos.push(val); });
      });
      setTimeout(cerrarModalEstudiante, 900);
    });
  }
};

// ==================== 19) Promoción semanal (igual que tenías) ====================
function formato(fecha) {
  let yyyy = fecha.getFullYear();
  let mm = (fecha.getMonth()+1).toString().padStart(2, '0');
  let dd = fecha.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function getLunesViernesSemana(fechaInicio) {
  let fecha = new Date(fechaInicio);
  let day = fecha.getDay();
  if(day === 6) { fecha.setDate(fecha.getDate() + 2);}
  else if(day === 0) {fecha.setDate(fecha.getDate() + 1);}
  day = fecha.getDay();
  let diffToMonday = day === 0 ? -6 : 1 - day;
  let lunes = new Date(fecha); lunes.setDate(fecha.getDate() + diffToMonday);
  let viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);
  return { lunes, viernes };
}
function mostrarOcultarPromoBtn() {
  const tipo = document.getElementById('tipo-pedido').value;
  document.getElementById('bloque-promocion-btn').style.display = (tipo === "Almuerzo") ? '' : 'none';
  document.getElementById('promo-semanal-block').style.display = 'none';
  document.getElementById('msg-promocion').textContent = '';
}
mostrarOcultarPromoBtn();
document.getElementById('btn-promocion-semanal').addEventListener('click', function() {
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  const nombre = nombreNinoInput.value.trim();
  if (!window.alumnoSeleccionadoKey) { document.getElementById('msg-promocion').textContent = 'Selecciona un alumno válido'; return; }
  const fechaSeleccionada = document.getElementById('fecha-pedido').value;
  const observaciones = document.getElementById('observaciones').value.trim();
  const pagado = document.getElementById('metodo-pago').value === "Pagado";
  if (!nombre || nombre.length < 2) { document.getElementById('msg-promocion').textContent = 'Debes elegir un nombre válido'; return; }
  if (!fechaSeleccionada) { document.getElementById('msg-promocion').textContent = 'Debes elegir una fecha válida'; return; }

  let {lunes} = getLunesViernesSemana(fechaSeleccionada);
  let fechasSemana = []; let tmp = new Date(lunes);
  for (let i=0; i<5; i++) { fechasSemana.push(formato(tmp)); tmp.setDate(tmp.getDate()+1); }

  let promesas = fechasSemana.map(f =>
    db.ref('pedidos').orderByChild('fecha').equalTo(f).once('value').then(snap => {
      let yaHay = false;
      snap.forEach(child => {
        let val = child.val();
        if(val.nombre && val.nombre.toLowerCase() === nombre.toLowerCase() && val.tipo === "Almuerzo") yaHay = true;
      });
      return {fecha: f, yaHay};
    })
  );
  Promise.all(promesas).then(resultados => {
    let conflictivos = resultados.filter(r => r.yaHay);
    if (conflictivos.length > 0) {
      document.getElementById('msg-promocion').textContent =
        "El alumno ya tiene pedido registrado en: " + conflictivos.map(r => r.fecha).join(", ") +
        ". Elimina esos pedidos antes de registrar una nueva promoción semanal.";
      return;
    }
    let registros = fechasSemana.map(f => {
      return db.ref('Almuerzos/' + f).once('value').then(snapMenu => {
        let menuDia = snapMenu.val() || {};
        let menu = menuDia["Menú"] || '';
        let entrada = menuDia["Entrada"] || '';
        let postre = menuDia["Postre"] || '';
        const nuevoRef = db.ref('pedidos').push();
        const pedido = {
          id: nuevoRef.key,
          nombre, fecha:f, tipo:"Almuerzo",
          menu, entrada, postre, pagado, estado:"Pendiente", observaciones,
          grado: window._gradoSeleccionado || '',
          nivel: window._nivelSeleccionado || '',
          salon: window._salonSeleccionado || ''
        };
        return nuevoRef.set(pedido);
      });
    });
    Promise.all(registros).then(()=>{
      document.getElementById('msg-promocion').textContent = "¡Promoción semanal registrada correctamente!";
      document.getElementById('form-pedido').reset();
      document.getElementById('fecha-pedido').value = fechaStr;
      cargarMenuPorFechaYTipo(); actualizarLabelsPorTipo();
      cargarPedidos(document.getElementById('fecha-mostrar').value || fechaStr);
      setTimeout(()=>document.getElementById('msg-promocion').textContent = '', 2800);
    });
  });
});

// ==================== 20) Reporte por Rango con FILTROS ====================
document.getElementById('btn-ver-reporte').addEventListener('click', () => {
  const card = document.getElementById('reporte-card');
  card.style.display = card.style.display === 'none' ? '' : 'none';
});

document.getElementById('rep-consultar').addEventListener('click', (e) => {
  e.preventDefault();
  const desde = document.getElementById('rep-desde').value;
  const hasta = document.getElementById('rep-hasta').value;
  if (!desde || !hasta) { alert('Selecciona ambas fechas (desde y hasta).'); return; }
  if (hasta < desde) { alert('La fecha "Hasta" no puede ser menor que "Desde".'); return; }

  db.ref('pedidos').orderByChild('fecha').startAt(desde).endAt(hasta).once('value').then(snap => {
    const data = snap.val() || {};
    const lista = Object.values(data);

    // Guarda base y resetea filtros visibles
    window.__reporteBase = lista;
    document.getElementById('rep-filtros').style.display = '';
    poblarFiltrosDisponibles(lista);
    aplicarFiltrosReporte(); // render inicial con filtros por defecto (Todos)

    document.getElementById('rep-cards').style.display = '';
    document.getElementById('rep-scroll').style.display = '';
    window.__rangoReporte = {desde, hasta}; // para nombres de archivo
  });
});

// ---- util: opciones únicas ordenadas
function uniquesOrdenados(arr){
  return [...new Set(arr.filter(Boolean))].sort((a,b)=> (a||'').localeCompare(b||'', 'es', {numeric:true, sensitivity:'base'}));
}

// ---- poblar selects de Nivel/Grado según resultados
function poblarFiltrosDisponibles(lista) {
  const selNivel = document.getElementById('rep-filtro-nivel');
  const selGrado = document.getElementById('rep-filtro-grado');

  // reset
  selNivel.innerHTML = `<option value="Todos">Todos</option>`;
  selGrado.innerHTML = `<option value="Todos">Todos</option>`;

  const niveles = uniquesOrdenados(lista.map(x => x.nivel));
  niveles.forEach(n => selNivel.innerHTML += `<option value="${n}">${n}</option>`);

  // grados de toda la base (se ajustan si cambia nivel)
  const grados = uniquesOrdenados(lista.map(x => x.grado));
  grados.forEach(g => selGrado.innerHTML += `<option value="${g}">${g}</option>`);
}

// ---- cuando cambie nivel, ajusta lista de grados disponibles
document.getElementById('rep-filtro-nivel').addEventListener('change', () => {
  const nivel = document.getElementById('rep-filtro-nivel').value;
  const selGrado = document.getElementById('rep-filtro-grado');
  selGrado.innerHTML = `<option value="Todos">Todos</option>`;
  const base = window.__reporteBase || [];
  const filtradosPorNivel = (nivel==='Todos') ? base : base.filter(x => (x.nivel||'') === nivel);
  uniquesOrdenados(filtradosPorNivel.map(x => x.grado)).forEach(g => {
    selGrado.innerHTML += `<option value="${g}">${g}</option>`;
  });
  aplicarFiltrosReporte();
});

// ---- aplicar/limpiar filtros
document.getElementById('rep-aplicar').addEventListener('click', (e)=>{ e.preventDefault(); aplicarFiltrosReporte(); });
document.getElementById('rep-limpiar').addEventListener('click', (e)=>{
  e.preventDefault();
  document.getElementById('rep-filtro-tipo').value = 'Todos';
  document.getElementById('rep-filtro-pago').value = 'Todos';
  document.getElementById('rep-filtro-estado').value = 'Todos';
  document.getElementById('rep-filtro-nivel').value = 'Todos';
  // repoblar grados globales
  const selGrado = document.getElementById('rep-filtro-grado');
  selGrado.innerHTML = `<option value="Todos">Todos</option>`;
  uniquesOrdenados((window.__reporteBase||[]).map(x=>x.grado)).forEach(g => selGrado.innerHTML += `<option value="${g}">${g}</option>`);
  document.getElementById('rep-buscar-nombre').value = '';
  aplicarFiltrosReporte();
});

// auto-aplicar al cambiar estos
['rep-filtro-tipo','rep-filtro-pago','rep-filtro-estado','rep-filtro-grado'].forEach(id=>{
  document.getElementById(id).addEventListener('change', aplicarFiltrosReporte);
});
document.getElementById('rep-buscar-nombre').addEventListener('input', aplicarFiltrosReporte);

// ---- Lógica de filtrado + render + contadores
function aplicarFiltrosReporte(){
  const tipo = document.getElementById('rep-filtro-tipo').value;
  const pago = document.getElementById('rep-filtro-pago').value; // Pagado|Pendiente|Todos
  const estado = document.getElementById('rep-filtro-estado').value;
  const nivel = document.getElementById('rep-filtro-nivel').value;
  const grado = document.getElementById('rep-filtro-grado').value;
  const buscar = document.getElementById('rep-buscar-nombre').value.trim().toLowerCase();

  let lista = [...(window.__reporteBase || [])];

  if (tipo !== 'Todos')   lista = lista.filter(x => (x.tipo||'') === tipo);
  if (pago !== 'Todos')   lista = lista.filter(x => (pago === 'Pagado') ? !!x.pagado : !x.pagado);
  if (estado !== 'Todos') lista = lista.filter(x => (x.estado||'') === estado);
  if (nivel !== 'Todos')  lista = lista.filter(x => (x.nivel||'') === nivel);
  if (grado !== 'Todos')  lista = lista.filter(x => (x.grado||'') === grado);
  if (buscar)             lista = lista.filter(x => (x.nombre||'').toLowerCase().includes(buscar));

  // Orden por fecha + nombre
  lista.sort((a,b) => (a.fecha||'').localeCompare(b.fecha||'') || (a.nombre||'').localeCompare(b.nombre||''));

  window.__reporteFiltrado = lista;

  // Contadores (del filtrado)
  const total      = lista.length;
  const entregados = lista.filter(p=>p.estado==="Entregado").length;
  const pendientes = lista.filter(p=>p.estado==="Pendiente").length;
  const morosos    = lista.filter(p=>!p.pagado).length;

  document.getElementById('rep-total').textContent      = total;
  document.getElementById('rep-entregados').textContent = entregados;
  document.getElementById('rep-pendientes').textContent = pendientes;
  document.getElementById('rep-morosos').textContent    = morosos;

  // Render tabla
  const tbody = document.getElementById('rep-tbody');
  tbody.innerHTML = '';
  if (!lista.length){
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#999;">Sin resultados para los filtros aplicados.</td></tr>`;
    return;
  }
  lista.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.fecha || '-'}</td>
        <td>${p.nombre || '-'}</td>
        <td>${p.tipo || '-'}</td>
        <td>${(p.menu||'-')}${p.entrada? ' · '+p.entrada : ''}${(p.postre && p.postre!=='nullahi')? ' · '+p.postre : ''}</td>
        <td>${p.pagado ? 'Pagado' : 'Pendiente'}</td>
        <td>${p.estado || '-'}</td>
        <td>${p.nivel || ''}</td>
        <td>${p.grado || ''}</td>
        <td>${p.salon || ''}</td>
        <td>${p.observaciones || ''}</td>
      </tr>
    `;
  });
}

// Exportar Excel del reporte (usa la tabla filtrada tal cual se ve)
document.getElementById('rep-exportar-excel').addEventListener('click', (e) => {
  e.preventDefault();
  const desde = (window.__rangoReporte&&window.__rangoReporte.desde) || '';
  const hasta = (window.__rangoReporte&&window.__rangoReporte.hasta) || '';
  const tabla = document.getElementById('tabla-reporte');
  if (!tabla || !tabla.rows.length) { alert('Primero consulta un rango.'); return; }

  let csv = [];
  for (let row of tabla.rows) {
    let cols = [];
    for (let cell of row.cells) {
      cols.push('"' + cell.innerText.replace(/"/g, '""') + '"');
    }
    csv.push(cols.join(","));
  }
  descargarCSV(csv.join("\n"), `reporte_${desde}_a_${hasta}_FILTRADO.csv`);
});

// Imprimir / PDF del reporte (respeta filtros porque usa la tabla actual)
document.getElementById('rep-imprimir').addEventListener('click', (e) => {
  e.preventDefault();
  const desde = (window.__rangoReporte&&window.__rangoReporte.desde) || '';
  const hasta = (window.__rangoReporte&&window.__rangoReporte.hasta) || '';
  const w = window.open('', '', 'width=900,height=700');
  const cardsHTML = document.getElementById('rep-cards').outerHTML;
  const tablaHTML = document.getElementById('tabla-reporte').outerHTML;

  w.document.write(`
    <html>
    <head>
      <title>Reporte ${desde} a ${hasta}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 18px; }
        h1 { text-align:center; margin:0 0 14px; }
        .cards { display:grid; grid-template-columns: repeat(4,1fr); gap:12px; margin-bottom:14px; }
        .cards .admin-card { box-shadow:none; border:1px solid #e9eef7; }
        table { width:100%; border-collapse: collapse; }
        th, td { padding: 8px; border-bottom:1px solid #e9eef7; text-align:left; font-size: 13px; }
        th { background:#f7fafc; }
        @media print { .no-print { display:none; } }
      </style>
    </head>
    <body>
      <h1>Reporte de Pedidos · ${desde} a ${hasta}</h1>
      <div class="cards">${cardsHTML}</div>
      ${tablaHTML}
      <div class="no-print" style="text-align:center; margin-top:14px;">
        <button onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>
    </body>
    </html>
  `);
  w.document.close(); w.focus();
});
