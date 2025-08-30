// ============== 1) Firebase ==============
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

// ============== 2) Fecha y helpers ==============
function pad(n){return n<10?'0'+n:n;}
const hoy = new Date();
const yyyy = hoy.getFullYear();
const mm = pad(hoy.getMonth()+1);
const dd = pad(hoy.getDate());
const fechaStr = `${yyyy}-${mm}-${dd}`;

document.getElementById('fechaActual').textContent = hoy.toLocaleDateString('es-PE', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
document.getElementById('fecha-pedido').value = fechaStr;
document.getElementById('fecha-mostrar').value = fechaStr;
document.getElementById('metodo-pago').value = "Credito";

const $ = id => document.getElementById(id);

// ============== 3) Estados globales ==============
let listaJugos = [], listaFondos = [], listaPlatosVariados = [];
let _listaPedidosDelDia = [];
let _filtroActivo = null;
let _pedidosRefActual = null;

// alumno seleccionado
window.listaAlumnos = [];
window.alumnoSeleccionadoKey = '';
window.alumnoSeleccionadoNombre = '';
window._gradoSeleccionado = '';
window._nivelSeleccionado = '';
window._salonSeleccionado = '';

const nombreNinoInput = $('nombre-nino');
const btnEditarEst = $('btn-editar-estudiante');

// Reporte
window.__reporteBase = [];
window.__reporteFiltrado = [];
window.__rangoReporte = {desde:'', hasta:''};

// ============== 4) Catálogos (igual) ==============
db.ref('Jugos').on('value', snap => {
  listaJugos = [];
  snap.forEach(child => { const v = child.val(); if(v) listaJugos.push(v.Nombre || v.nombre || v); });
});
db.ref('Fondos').on('value', snap => {
  listaFondos = [];
  snap.forEach(child => { const v = child.val(); if(v) listaFondos.push(v.Nombre || v.nombre || v); });
});
db.ref('Variados').on('value', snap => {
  listaPlatosVariados = [];
  snap.forEach(child => { const v = child.val(); if(v) listaPlatosVariados.push(v.Nombre || v.nombre || v); });
});

// ============== 5) Desayunos: selects dependientes ==============
let categoriasBebidas=[], productosPorCategoriaBebidas={}, categoriasFondo=[], productosPorCategoriaFondo={};

function cargarDesayunoFirebase() {
  db.ref('Desayunos').once('value').then(snap => {
    categoriasBebidas=[]; productosPorCategoriaBebidas={};
    categoriasFondo=[];   productosPorCategoriaFondo={};
    snap.forEach(ch => {
      const val = ch.val();
      if(val?.tipo==="Bebidas"){
        if(!categoriasBebidas.includes(val.categoria)){
          categoriasBebidas.push(val.categoria); productosPorCategoriaBebidas[val.categoria]=[];
        }
        productosPorCategoriaBebidas[val.categoria].push(val.producto);
      }
      if(val?.tipo==="Fondo"){
        if(!categoriasFondo.includes(val.categoria)){
          categoriasFondo.push(val.categoria); productosPorCategoriaFondo[val.categoria]=[];
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
function llenarSelectSimple(id, arr){
  const sel = $(id); if(!sel) return;
  sel.innerHTML = `<option value="">Selecciona</option>`;
  arr.forEach(v => sel.innerHTML += `<option value="${v}">${v}</option>`);
}
document.addEventListener('DOMContentLoaded', ()=>{
  cargarDesayunoFirebase();
  $('bebidas-categoria').addEventListener('change', function(){
    llenarSelectSimple('bebidas-producto', this.value ? productosPorCategoriaBebidas[this.value] : []);
  });
  $('fondo-categoria').addEventListener('change', function(){
    llenarSelectSimple('fondo-producto', this.value ? productosPorCategoriaFondo[this.value] : []);
  });
});

// ============== 6) Mostrar/Ocultar por tipo ==============
function actualizarLabelsPorTipo(){
  const tipo = $('tipo-pedido').value;
  $('bloque-desayuno').style.display = (tipo==="Desayunos")?'':'none';
  $('bloque-general').style.display = (tipo==="Desayunos")?'none':'';

  const grupoEntrada = $('grupo-entrada');
  const grupoPostre  = $('grupo-postre');

  if (tipo === "Variado") {
    grupoEntrada.style.display = 'none';
    grupoPostre.style.display = 'none';
    $('entrada').value = ""; $('postre').value = "";
  } else if (tipo === "Desayunos") {
    grupoEntrada.style.display = '';
    grupoPostre.style.display = 'none';
    $('postre').value = "nullahi";
  } else {
    grupoEntrada.style.display = '';
    grupoPostre.style.display  = '';
  }
  $('label-menu-dia').textContent = (tipo==="Desayunos") ? "Jugo" : "Plato";
  $('label-entrada').textContent  = (tipo==="Desayunos") ? "Fondo" : "Entrada";
  $('label-postre').textContent   = (tipo==="Desayunos") ? "" : "Postre";

  const menu = $('menu-dia'), entrada = $('entrada');
  if (tipo === "Almuerzo") {
    menu.setAttribute('readonly', true); menu.classList.add('input-disabled');
    entrada.setAttribute('readonly', true); entrada.classList.add('input-disabled');
  } else {
    menu.removeAttribute('readonly'); menu.classList.remove('input-disabled');
    entrada.removeAttribute('readonly'); entrada.classList.remove('input-disabled');
  }
}
$('tipo-pedido').addEventListener('change', function(){
  if(this.value==="Desayunos") cargarDesayunoFirebase();
  mostrarOcultarPromoBtn(); actualizarLabelsPorTipo(); cargarMenuPorFechaYTipo();
});
actualizarLabelsPorTipo();

// ============== 7) Menú por fecha/tipo ==============
function cargarMenuPorFechaYTipo(){
  const fecha = $('fecha-pedido').value;
  const tipo = $('tipo-pedido').value;
  if (tipo === "Almuerzo") {
    db.ref(`Almuerzos/${fecha}`).once('value').then(snap=>{
      const m = snap.val();
      $('menu-dia').value = (m && m["Menú"]) || 'No hay menú';
      $('entrada').value  = (m && m["Entrada"]) || 'No hay entrada';
      $('postre').value   = (m && m["Postre"])  || 'No hay postre';
    });
  } else {
    $('menu-dia').value = ""; $('entrada').value = "";
    $('postre').value = (tipo === "Desayunos") ? "nullahi" : "";
  }
  actualizarLabelsPorTipo();
}
$('fecha-pedido').addEventListener('change', cargarMenuPorFechaYTipo);
cargarMenuPorFechaYTipo();

// ============== 8) Autocomplete Variados ==============
window.filtrarPlatos = function(){
  if ($('tipo-pedido').value !== "Variado") return;
  const input = $('menu-dia');
  const sug = $('sugerenciasPlatos');
  const val = input.value.trim().toLowerCase();
  sug.innerHTML = "";
  if (val.length<1){sug.classList.remove('active');return;}
  const encontrados = listaPlatosVariados.filter(j => j.toLowerCase().includes(val));
  encontrados.forEach(j=>{
    const div = document.createElement('div');
    div.textContent = j;
    div.onclick = ()=>{ input.value=j; sug.classList.remove('active'); sug.innerHTML=""; };
    sug.appendChild(div);
  });
  sug.classList.add('active');
};
$('menu-dia').addEventListener('input', ()=>{ if($('tipo-pedido').value==="Variado") filtrarPlatos(); });
$('menu-dia').addEventListener('focus', ()=>{ if($('tipo-pedido').value==="Variado") filtrarPlatos(); });

// ============== 9) Autocomplete Nombres ==============
db.ref('Nombres').on('value', snap => {
  window.listaAlumnos = [];
  snap.forEach(ch => { const v = ch.val(); v._id = ch.key; window.listaAlumnos.push(v); });
});
window.filtrarNombres = function(){
  const nombreInput = nombreNinoInput.value.trim().toLowerCase();
  const sug = $('sugerenciasNombres'); sug.innerHTML = "";
  if (nombreInput.length<2){sug.classList.remove('active');return;}
  if (!window.listaAlumnos.length){
    $('infoAlumno').innerHTML = '<span style="color:#999;font-size:.9em">Cargando estudiantes...</span>'; return;
  }
  const encontrados = window.listaAlumnos.filter(a => a.Nombre && a.Nombre.toLowerCase().includes(nombreInput));
  if(!encontrados.length){
    $('infoAlumno').innerHTML = '<span style="color:#999;font-size:.9em">Sin coincidencias.</span>'; return;
  }
  encontrados.forEach(alum=>{
    const div = document.createElement('div');
    div.textContent = `${alum.Nombre} (${alum.Grado||'-'}, ${alum.Salon||'-'})`;
    div.onclick = ()=>{
      nombreNinoInput.value = alum.Nombre;
      window.alumnoSeleccionadoKey = alum._id; window.alumnoSeleccionadoNombre = alum.Nombre;
      window._gradoSeleccionado = alum.Grado||''; window._nivelSeleccionado = alum.Nivel||''; window._salonSeleccionado = alum.Salon||'';
      btnEditarEst.style.display=''; $('infoAlumno').innerHTML = `
        <p><strong>Nombre:</strong> ${alum.Nombre||''}</p>
        <p><strong>Grado:</strong> ${alum.Grado||''}</p>
        <p><strong>Nivel:</strong> ${alum.Nivel||''}</p>
        <p><strong>Salón:</strong> ${alum.Salon||''}</p>`;
      sug.classList.remove('active');
    };
    sug.appendChild(div);
  });
  sug.classList.add('active');
};
nombreNinoInput.addEventListener('input', function(){
  if (this.value !== window.alumnoSeleccionadoNombre){
    btnEditarEst.style.display='none';
    window.alumnoSeleccionadoKey=''; window.alumnoSeleccionadoNombre='';
    window._gradoSeleccionado=''; window._nivelSeleccionado=''; window._salonSeleccionado='';
    $('infoAlumno').innerHTML='';
  }
  window.filtrarNombres();
});
nombreNinoInput.addEventListener('focus', window.filtrarNombres);
document.addEventListener('click', e=>{
  if(!e.target.closest('.form-group')){
    $('sugerenciasNombres').classList.remove('active');
    $('sugerenciasPlatos').classList.remove('active');
  }
});
nombreNinoInput.addEventListener('keydown', e=>{ if(e.key==='Enter') e.preventDefault(); });

// ============== 10) Filtrar por fecha del día ==============
$('fecha-mostrar').addEventListener('change', function(){
  _filtroActivo=null; cargarPedidos(this.value || fechaStr);
});

// ============== 11) Registrar pedido ==============
$('form-pedido').addEventListener('submit', function(e){
  e.preventDefault();
  const nombre = nombreNinoInput.value.trim();
  if (!window.alumnoSeleccionadoKey){ alert('Debes seleccionar un alumno de la lista de sugerencias'); nombreNinoInput.focus(); return; }

  const fecha = $('fecha-pedido').value;
  const tipo  = $('tipo-pedido').value;
  let menu='', entrada='', postre='';
  if (tipo==="Desayunos"){
    menu=$('bebidas-producto').value; entrada=$('fondo-producto').value; postre="";
  } else if (tipo==="Variado"){
    menu=$('menu-dia').value; entrada=""; postre="";
  } else {
    menu=$('menu-dia').value; entrada=$('entrada').value; postre=$('postre').value;
  }
  const pagado = $('metodo-pago').value === "Pagado";
  const observaciones = $('observaciones').value.trim();

  if (tipo === "Almuerzo"){
    db.ref('pedidos').orderByChild('fecha').equalTo(fecha).once('value').then(snap=>{
      let ya=false; snap.forEach(ch=>{const v=ch.val(); if(v.nombre && v.nombre.toLowerCase()===nombre.toLowerCase() && v.tipo==="Almuerzo") ya=true;});
      if(ya){alert('¡Este alumno ya tiene pedido de almuerzo para ese día!');return;}
      guardar();
    });
  } else guardar();

  function guardar(){
    const ref = window._editandoPedidoID ? db.ref('pedidos/'+window._editandoPedidoID) : db.ref('pedidos').push();
    const p = {
      id: ref.key, nombre, fecha, tipo, menu, entrada, postre, pagado,
      estado:"Pendiente", observaciones,
      grado: window._gradoSeleccionado||'', nivel: window._nivelSeleccionado||'', salon: window._salonSeleccionado||''
    };
    ref.set(p).then(()=>{
      $('form-pedido').reset(); $('fecha-pedido').value=fechaStr; $('infoAlumno').innerHTML='';
      window._gradoSeleccionado=''; window._nivelSeleccionado=''; window._salonSeleccionado='';
      window.alumnoSeleccionadoKey=''; window.alumnoSeleccionadoNombre=''; window._editandoPedidoID=null;
      cargarMenuPorFechaYTipo(); actualizarLabelsPorTipo(); cargarPedidos($('fecha-mostrar').value||fechaStr);
      alert('Pedido registrado exitosamente!');
    });
  }
});

// ============== 12) Cargar pedidos del día ==============
function cargarPedidos(fecha){
  if(_pedidosRefActual) _pedidosRefActual.off('value');
  const ref = db.ref('pedidos').orderByChild('fecha').equalTo(fecha);
  _pedidosRefActual = ref;
  ref.on('value', snap=>{
    const pedidos = snap.val()||{};
    _listaPedidosDelDia = Object.values(pedidos);
    resumenPedidos(_listaPedidosDelDia);
    aplicarFiltroYRender();
  });
}
cargarPedidos(fechaStr);

// ============== 13) Render tabla día ==============
function renderizaPedidos(lista){
  const tbody = $('tbody-pedidos'); tbody.innerHTML="";
  if(!lista.length){ tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#aaa;">No hay pedidos hoy.</td></tr>`; return; }
  lista.forEach(p=>{
    const pagoBadge = `<span class="badge ${p.pagado?'badge-pagado':'badge-pendiente'}">${p.pagado?'Pagado':'Pendiente'}</span>`;
    const estadoBadge = `<span class="badge ${p.estado==='Pendiente'?'badge-pendiente':(p.estado==='Entregado'?'badge-pagado':'badge-rechazado')}">${p.estado}</span>`;
    tbody.innerHTML += `
      <tr>
        <td>${p.nombre||'-'}</td>
        <td>${p.tipo||'-'}</td>
        <td>${p.menu||'-'}<br><span class="small">${p.entrada||''} ${p.postre&&p.postre!=='nullahi'?'· '+p.postre:''}</span></td>
        <td>${pagoBadge}</td>
        <td>${estadoBadge}</td>
        <td>${p.observaciones||'—'}</td>
        <td>
          ${p.estado==="Pendiente" ? `
            <button class="btn-tabla btn-mini btn-green" onclick="marcarEntregado('${p.id}')">Entregar</button>
            <button class="btn-tabla btn-mini btn-red" onclick="rechazarPedido('${p.id}')">Rechazar</button>` : ``}
          <button class="btn-tabla btn-mini btn-azul" onclick="editarPedido('${p.id}')">Editar</button>
          <button class="btn-tabla btn-mini btn-grey" onclick="eliminarPedido('${p.id}')">Eliminar</button>
        </td>
      </tr>`;
  });
}

// ============== 14) Acciones pedido ==============
window.marcarEntregado = id => db.ref('pedidos/'+id).update({estado:"Entregado"});
window.rechazarPedido  = id => db.ref('pedidos/'+id).update({estado:"Rechazado"});
window.eliminarPedido  = id => { if(confirm('¿Eliminar pedido?')) db.ref('pedidos/'+id).remove(); }
window.editarPedido = id => {
  db.ref('pedidos/'+id).once('value').then(snap=>{
    const p = snap.val(); if(!p) return alert('Pedido no encontrado');
    $('nombre-nino').value=p.nombre; $('fecha-pedido').value=p.fecha; $('tipo-pedido').value=p.tipo; $('observaciones').value=p.observaciones||"";
    actualizarLabelsPorTipo(); cargarMenuPorFechaYTipo();
    if(p.tipo==="Desayunos"){ setTimeout(()=>{ $('bebidas-producto').value=p.menu||""; $('fondo-producto').value=p.entrada||""; },350); }
    else if(p.tipo==="Variado"){ $('menu-dia').value=p.menu||""; }
    else { $('menu-dia').value=p.menu||""; $('entrada').value=p.entrada||""; $('postre').value=p.postre||""; }
    $('metodo-pago').value = p.pagado ? "Pagado" : "Credito"; window._editandoPedidoID = id;
    const alum = window.listaAlumnos.find(a => a.Nombre===p.nombre);
    if(alum){ window.alumnoSeleccionadoKey=alum._id; window.alumnoSeleccionadoNombre=alum.Nombre; window._gradoSeleccionado=alum.Grado||''; window._nivelSeleccionado=alum.Nivel||''; window._salonSeleccionado=alum.Salon||''; btnEditarEst.style.display=''; }
  });
};

// ============== 15) Tarjetas resumen + filtro click ==============
function resumenPedidos(lista){
  const total=lista.length, entregados=lista.filter(p=>p.estado==="Entregado").length, pendientes=lista.filter(p=>p.estado==="Pendiente").length, morosos=lista.filter(p=>!p.pagado).length;
  const nums = document.querySelectorAll('.admin-card-num');
  if(nums[0]) nums[0].textContent=total; if(nums[1]) nums[1].textContent=entregados; if(nums[2]) nums[2].textContent=pendientes; if(nums[3]) nums[3].textContent=morosos;

  const cardPend = document.querySelector('.card-orange');
  const cardMoro = document.querySelector('.card-violet');
  if(cardPend && !cardPend.dataset.bind){ cardPend.dataset.bind='1'; cardPend.addEventListener('click', ()=>{ _filtroActivo={tipo:'pendientes'}; aplicarFiltroYRender(); }); }
  if(cardMoro && !cardMoro.dataset.bind){ cardMoro.dataset.bind='1'; cardMoro.addEventListener('click', ()=>{ _filtroActivo={tipo:'morosos'}; aplicarFiltroYRender(); }); }
}
function aplicarFiltroYRender(){
  let l = [..._listaPedidosDelDia];
  if(_filtroActivo?.tipo==='pendientes') l = l.filter(p=>p.estado==='Pendiente');
  if(_filtroActivo?.tipo==='morosos')    l = l.filter(p=>!p.pagado);
  renderizaPedidos(l);
  const bar = $('filtro-activo-bar');
  if(_filtroActivo){ bar.style.display=''; bar.querySelector('span').textContent = _filtroActivo.tipo==='pendientes'?'Filtro: Pendientes':'Filtro: Morosos'; }
  else bar.style.display='none';
}
$('btn-quitar-filtro')?.addEventListener('click', ()=>{ _filtroActivo=null; aplicarFiltroYRender(); });

// ============== 16) Imprimir tarjetas del día ==============
window.imprimirPedidos = function(){
  const filas = document.querySelectorAll("#tbody-pedidos tr");
  if(!filas.length || filas[0].children[0].textContent.includes("No hay pedidos")){ alert("No hay pedidos para imprimir."); return; }
  let html = `
    <html><head><title>Pedidos de Hoy</title><style>
    body{font-family:Arial,sans-serif}
    .pedido-tarjeta{border:2px solid #0066cc;border-radius:18px;padding:18px 30px;margin:20px auto;max-width:430px;background:#f6faff;box-shadow:0 4px 18px #005cbb15}
    .pedido-tarjeta h2{margin:0 0 6px;font-size:2em;color:#094785}
    .pedido-info{font-size:1.1em;margin:4px 0 10px}
    .pedido-observacion{color:#D2691E;font-weight:bold;font-size:1.08em;margin-top:6px}
    </style></head><body><h1 style="text-align:center">Pedidos de Hoy</h1>`;
  filas.forEach(tr=>{
    const c = tr.children; if(c.length<7) return;
    const nombre=c[0].textContent.trim(), tipo=c[1].textContent.trim(), detalles=c[2].textContent.trim(), estado=c[4].textContent.trim(), obs=c[5].textContent.trim();
    html += `<div class="pedido-tarjeta"><h2>${nombre}</h2><div class="pedido-info"><b>Tipo:</b> ${tipo}</div><div class="pedido-info"><b>Pedido:</b> <span style="font-weight:bold">${detalles.replace(/\n/g,"<br>")}</span></div><div class="pedido-info"><b>Estado:</b> ${estado}</div>${(obs && obs!=="—")?`<div class="pedido-observacion">Observación: ${obs}</div>`:""}</div>`;
  });
  html += `</body></html>`;
  const w = window.open('','','width=800,height=600'); w.document.write(html); w.document.close(); w.focus(); w.print(); setTimeout(()=>w.close(),800);
};

// ============== 17) Export Excel del día ==============
window.exportarExcelTablaHoy = function(){
  const tabla = $('tabla-hoy'); let csv=[];
  for(const row of tabla.rows){ const cols=[]; for(const cell of row.cells){ cols.push('"'+cell.innerText.replace(/"/g,'""')+'"'); } csv.push(cols.join(',')); }
  descargarCSV(csv.join("\n"), `pedidos_${$('fecha-mostrar').value||fechaStr}.csv`);
};
function descargarCSV(txt, nombre){
  const blob = new Blob([txt], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=nombre; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ============== 18) Modal Estudiante (igual) ==============
const gradosPorNivel = { "Primaria":["1er Grado","2do Grado","3er Grado","4to Grado","5to Grado","6to Grado"], "Secundaria":["1er Año","2do Año","3er Año","4to Año","5to Año"] };
const btnAgregarEst = $('btn-agregar-estudiante'), modalBg=$('modal-estudiante-bg'), modalTitulo=$('modal-estudiante-titulo'), formEst=$('form-estudiante'), msgEst=$('msg-estudiante-modal'), inputNombre=$('modal-nombre'), selectNivel=$('modal-nivel'), selectGrado=$('modal-grado'), inputSalon=$('modal-salon'), btnCerrarModal=$('btn-cerrar-modal-est');
selectNivel.onchange = function(){ selectGrado.innerHTML='<option value="">Selecciona</option>'; const n=this.value; if(n && gradosPorNivel[n]) gradosPorNivel[n].forEach(g=> selectGrado.innerHTML += `<option value="${g}">${g}</option>`); };
function cerrarModalEstudiante(){ modalBg.classList.remove('activo'); msgEst.textContent=''; }
btnAgregarEst.onclick = function(){ formEst.reset(); msgEst.textContent=''; modalTitulo.textContent='Agregar estudiante'; formEst.dataset.mode='agregar'; formEst.dataset.key=''; modalBg.classList.add('activo'); setTimeout(()=>inputNombre.focus(),180); };
btnEditarEst.onclick = function(){
  if(!window.alumnoSeleccionadoKey){ alert("Selecciona un estudiante existente para editar."); return; }
  const alum = window.listaAlumnos.find(a=>a._id===window.alumnoSeleccionadoKey); if(!alum){ alert('No se encontró el estudiante.'); return; }
  formEst.reset(); msgEst.textContent=''; modalTitulo.textContent='Editar estudiante';
  inputNombre.value=alum.Nombre||''; selectNivel.value=alum.Nivel||''; selectNivel.onchange(); selectGrado.value=alum.Grado||''; inputSalon.value=alum.Salon||'';
  formEst.dataset.mode='editar'; formEst.dataset.key=alum._id; modalBg.classList.add('activo'); setTimeout(()=>inputNombre.focus(),180);
};
btnCerrarModal.onclick = cerrarModalEstudiante; modalBg.onclick = e=>{ if(e.target===modalBg) cerrarModalEstudiante(); };
formEst.onsubmit = e=>{
  e.preventDefault();
  const nombre=inputNombre.value.trim(), nivel=selectNivel.value, grado=selectGrado.value, salon=inputSalon.value.trim();
  if(!nombre||!nivel||!grado){ msgEst.textContent='Completa todos los campos obligatorios.'; return; }
  if(formEst.dataset.mode==='editar'){
    const key=formEst.dataset.key; if(!key){ msgEst.textContent='Error al editar.'; return; }
    db.ref('Nombres/'+key).update({Nombre:nombre,Nivel:nivel,Grado:grado,Salon:salon}).then(()=>{
      msgEst.textContent='¡Estudiante actualizado!'; db.ref('Nombres').once('value', s=>{ window.listaAlumnos=[]; s.forEach(c=>{const v=c.val(); v._id=c.key; window.listaAlumnos.push(v);}); }); setTimeout(cerrarModalEstudiante,900);
    });
  }else{
    const ya = window.listaAlumnos.some(a=>a.Nombre && a.Nombre.trim().toLowerCase()===nombre.toLowerCase());
    if(ya){ msgEst.textContent='Ya existe un estudiante con ese nombre.'; return; }
    db.ref('Nombres').push({Nombre:nombre,Nivel:nivel,Grado:grado,Salon:salon}).then(()=>{
      msgEst.textContent='¡Estudiante agregado!'; db.ref('Nombres').once('value', s=>{ window.listaAlumnos=[]; s.forEach(c=>{const v=c.val(); v._id=c.key; window.listaAlumnos.push(v);}); }); setTimeout(cerrarModalEstudiante,900);
    });
  }
};

// ============== 19) Promoción semanal (igual) ==============
function formato(fecha){ const y=fecha.getFullYear(), m=pad(fecha.getMonth()+1), d=pad(fecha.getDate()); return `${y}-${m}-${d}`; }
function getLunesViernesSemana(fechaInicio){
  let f=new Date(fechaInicio); let day=f.getDay(); if(day===6) f.setDate(f.getDate()+2); else if(day===0) f.setDate(f.getDate()+1);
  day=f.getDay(); let diff = day===0 ? -6 : 1-day; let lunes=new Date(f); lunes.setDate(f.getDate()+diff); let viernes=new Date(lunes); viernes.setDate(lunes.getDate()+4); return {lunes, viernes};
}
function mostrarOcultarPromoBtn(){ $('bloque-promocion-btn').style.display = ($('tipo-pedido').value==="Almuerzo") ? '' : 'none'; $('promo-semanal-block').style.display='none'; $('msg-promocion').textContent=''; }
mostrarOcultarPromoBtn();
$('btn-promocion-semanal').addEventListener('click', function(){
  document.activeElement?.blur();
  const nombre = nombreNinoInput.value.trim();
  if(!window.alumnoSeleccionadoKey){ $('msg-promocion').textContent='Selecciona un alumno válido'; return; }
  const fSel = $('fecha-pedido').value, observaciones = $('observaciones').value.trim(), pagado = $('metodo-pago').value==="Pagado";
  if(!nombre || nombre.length<2){ $('msg-promocion').textContent='Debes elegir un nombre válido'; return; }
  if(!fSel){ $('msg-promocion').textContent='Debes elegir una fecha válida'; return; }
  let {lunes} = getLunesViernesSemana(fSel); let fechas=[], t=new Date(lunes); for(let i=0;i<5;i++){fechas.push(formato(t)); t.setDate(t.getDate()+1);}
  Promise.all(fechas.map(f=> db.ref('pedidos').orderByChild('fecha').equalTo(f).once('value').then(s=>{ let ya=false; s.forEach(c=>{const v=c.val(); if(v.nombre && v.nombre.toLowerCase()===nombre.toLowerCase() && v.tipo==="Almuerzo") ya=true;}); return {fecha:f, ya}; })))
  .then(res=>{
    const conf = res.filter(r=>r.ya); if(conf.length){ $('msg-promocion').textContent="Ya tiene pedido en: "+conf.map(r=>r.fecha).join(", ")+". Elimina esos pedidos antes."; return; }
    return Promise.all(fechas.map(f=> db.ref('Almuerzos/'+f).once('value').then(ms=>{
      const m=ms.val()||{}; const ref=db.ref('pedidos').push();
      return ref.set({id:ref.key, nombre, fecha:f, tipo:"Almuerzo", menu:m["Menú"]||'', entrada:m["Entrada"]||'', postre:m["Postre"]||'', pagado, estado:"Pendiente", observaciones, grado:window._gradoSeleccionado||'', nivel:window._nivelSeleccionado||'', salon:window._salonSeleccionado||''});
    })));
  }).then(()=>{
    $('msg-promocion').textContent="¡Promoción semanal registrada correctamente!"; $('form-pedido').reset(); $('fecha-pedido').value=fechaStr; cargarMenuPorFechaYTipo(); actualizarLabelsPorTipo(); cargarPedidos($('fecha-mostrar').value||fechaStr); setTimeout(()=>$('msg-promocion').textContent='',2800);
  });
});

// ============== 20) REPORTE POR RANGO (filtros + export) ==============
$('rep-consultar').addEventListener('click', e=>{
  e.preventDefault();
  const desde = $('rep-desde').value, hasta = $('rep-hasta').value;
  if(!desde || !hasta){ alert('Selecciona ambas fechas.'); return; }
  if(hasta < desde){ alert('"Hasta" no puede ser menor que "Desde".'); return; }
  db.ref('pedidos').orderByChild('fecha').startAt(desde).endAt(hasta).once('value').then(snap=>{
    const data = snap.val()||{}; const lista = Object.values(data);
    window.__reporteBase = lista; window.__rangoReporte = {desde, hasta};
    $('rep-filtros').style.display=''; poblarFiltrosDisponibles(lista); aplicarFiltrosReporte();
    $('rep-cards').style.display=''; $('rep-scroll').style.display='';
  });
});

// Rangos rápidos
$('btn-rango-semana').addEventListener('click', e=>{
  e.preventDefault();
  const hoy = new Date(); const day = hoy.getDay()||7; // 1..7
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (day-1));
  const viernes = new Date(lunes); viernes.setDate(lunes.getDate()+4);
  $('rep-desde').value = formato(lunes); $('rep-hasta').value = formato(viernes);
});
$('btn-rango-semana-pasada').addEventListener('click', e=>{
  e.preventDefault();
  const hoy = new Date(); const day = hoy.getDay()||7;
  const lunesPas = new Date(hoy); lunesPas.setDate(hoy.getDate() - (day-1) - 7);
  const viernesPas = new Date(lunesPas); viernesPas.setDate(lunesPas.getDate()+4);
  $('rep-desde').value = formato(lunesPas); $('rep-hasta').value = formato(viernesPas);
});
$('btn-rango-mes').addEventListener('click', e=>{
  e.preventDefault();
  const now = new Date(); const primero = new Date(now.getFullYear(), now.getMonth(), 1);
  $('rep-desde').value = formato(primero); $('rep-hasta').value = formato(now);
});

// Utils
function uniquesOrdenados(arr){ return [...new Set(arr.filter(Boolean))].sort((a,b)=> (a||'').localeCompare(b||'', 'es', {numeric:true, sensitivity:'base'})); }
function poblarFiltrosDisponibles(lista){
  const selNivel=$('rep-filtro-nivel'), selGrado=$('rep-filtro-grado');
  selNivel.innerHTML=`<option value="Todos">Todos</option>`; selGrado.innerHTML=`<option value="Todos">Todos</option>`;
  uniquesOrdenados(lista.map(x=>x.nivel)).forEach(n=> selNivel.innerHTML += `<option value="${n}">${n}</option>`);
  uniquesOrdenados(lista.map(x=>x.grado)).forEach(g=> selGrado.innerHTML += `<option value="${g}">${g}</option>`);
}
$('rep-filtro-nivel').addEventListener('change', ()=>{
  const nivel = $('rep-filtro-nivel').value, selGrado=$('rep-filtro-grado');
  selGrado.innerHTML=`<option value="Todos">Todos</option>`;
  const base = window.__reporteBase||[], lst = (nivel==='Todos')?base:base.filter(x=>(x.nivel||'')===nivel);
  uniquesOrdenados(lst.map(x=>x.grado)).forEach(g=> selGrado.innerHTML += `<option value="${g}">${g}</option>`);
  aplicarFiltrosReporte();
});
$('rep-aplicar').addEventListener('click', e=>{ e.preventDefault(); aplicarFiltrosReporte(); });
$('rep-limpiar').addEventListener('click', e=>{
  e.preventDefault();
  $('rep-filtro-tipo').value='Todos'; $('rep-filtro-pago').value='Todos'; $('rep-filtro-estado').value='Todos'; $('rep-filtro-nivel').value='Todos'; $('rep-buscar-nombre').value='';
  const sg=$('rep-filtro-grado'); sg.innerHTML=`<option value="Todos">Todos</option>`; uniquesOrdenados((window.__reporteBase||[]).map(x=>x.grado)).forEach(g=> sg.innerHTML += `<option value="${g}">${g}</option>`);
  aplicarFiltrosReporte();
});
['rep-filtro-tipo','rep-filtro-pago','rep-filtro-estado','rep-filtro-grado'].forEach(id=> $(id).addEventListener('change', aplicarFiltrosReporte));
$('rep-buscar-nombre').addEventListener('input', aplicarFiltrosReporte);

function aplicarFiltrosReporte(){
  const tipo=$('rep-filtro-tipo').value, pago=$('rep-filtro-pago').value, estado=$('rep-filtro-estado').value, nivel=$('rep-filtro-nivel').value, grado=$('rep-filtro-grado').value, buscar=$('rep-buscar-nombre').value.trim().toLowerCase();
  let lista=[...(window.__reporteBase||[])];
  if(tipo!=='Todos')   lista = lista.filter(x=>(x.tipo||'')===tipo);
  if(pago!=='Todos')   lista = lista.filter(x=> (pago==='Pagado')? !!x.pagado : !x.pagado);
  if(estado!=='Todos') lista = lista.filter(x=>(x.estado||'')===estado);
  if(nivel!=='Todos')  lista = lista.filter(x=>(x.nivel||'')===nivel);
  if(grado!=='Todos')  lista = lista.filter(x=>(x.grado||'')===grado);
  if(buscar)           lista = lista.filter(x=>(x.nombre||'').toLowerCase().includes(buscar));
  lista.sort((a,b)=> (a.fecha||'').localeCompare(b.fecha||'') || (a.nombre||'').localeCompare(b.nombre||''));
  window.__reporteFiltrado = lista;

  // Contadores
  $('rep-total').textContent = lista.length;
  $('rep-entregados').textContent = lista.filter(p=>p.estado==="Entregado").length;
  $('rep-pendientes').textContent = lista.filter(p=>p.estado==="Pendiente").length;
  $('rep-morosos').textContent = lista.filter(p=>!p.pagado).length;

  // Render tabla
  const tb = $('rep-tbody'); tb.innerHTML='';
  if(!lista.length){ tb.innerHTML=`<tr><td colspan="10" style="text-align:center;color:#999;">Sin resultados.</td></tr>`; return; }
  lista.forEach(p=>{
    tb.innerHTML += `
      <tr>
        <td>${p.fecha||'-'}</td>
        <td>${p.nombre||'-'}</td>
        <td>${p.tipo||'-'}</td>
        <td>${(p.menu||'-')}${p.entrada?' · '+p.entrada:''}${(p.postre&&p.postre!=='nullahi')?' · '+p.postre:''}</td>
        <td>${p.pagado?'Pagado':'Pendiente'}</td>
        <td>${p.estado||'-'}</td>
        <td>${p.nivel||''}</td>
        <td>${p.grado||''}</td>
        <td>${p.salon||''}</td>
        <td>${p.observaciones||''}</td>
      </tr>`;
  });
}

// Exportar Excel del reporte
$('rep-exportar-excel').addEventListener('click', e=>{
  e.preventDefault();
  const {desde,hasta} = window.__rangoReporte;
  const tabla = $('tabla-reporte'); if(!tabla || !tabla.rows.length){ alert('Primero consulta un rango.'); return; }
  let csv=[]; for(const row of tabla.rows){ const cols=[]; for(const cell of row.cells){ cols.push('"'+cell.innerText.replace(/"/g,'""')+'"'); } csv.push(cols.join(',')); }
  descargarCSV(csv.join("\n"), `reporte_${desde}_a_${hasta}_FILTRADO.csv`);
});

// Exportar PDF del reporte (abre ventana y manda a imprimir/guardar)
$('rep-exportar-pdf').addEventListener('click', e=>{
  e.preventDefault();
  const {desde,hasta} = window.__rangoReporte;
  if(!desde || !hasta){ alert('Primero consulta un rango.'); return; }
  const w = window.open('', '', 'width=900,height=700');
  const cardsHTML = $('rep-cards').outerHTML;
  const tablaHTML = $('tabla-reporte').outerHTML;
  w.document.write(`
    <html><head><title>Reporte ${desde} a ${hasta}</title><style>
      body{font-family:Arial,sans-serif;padding:18px}
      h1{text-align:center;margin:0 0 14px}
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
      .admin-card{box-shadow:none;border:1px solid #e9eef7}
      table{width:100%;border-collapse:collapse}
      th,td{padding:8px;border-bottom:1px solid #e9eef7;text-align:left;font-size:13px}
      th{background:#f7fafc}
      @media print{.no-print{display:none}}
    </style></head><body>
      <h1>Reporte de Pedidos · ${desde} a ${hasta}</h1>
      <div class="cards">${cardsHTML}</div>
      ${tablaHTML}
      <div class="no-print" style="text-align:center;margin-top:14px">
        <button onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>
    </body></html>`);
  w.document.close(); w.focus();
});
