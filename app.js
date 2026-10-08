import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const GR = ["Iniciático", "DeMolay", "Sir (Priorato de Caballería)", "Tío (Consejo Consultivo)"];
const CUERPOS = [
  "Capítulo Primax Charcas 377 (N°75004)",
  "Capítulo Antonio José de Sucre (N°75019)",
  "Capítulo Libertad Juan Cid Fernández (N°75023)",
  "Priorato Caballeros Custodios de la Independencia (N°75802)",
  "Corte Chevalier Robert de Chrown",
  "Legión de Honor",
  "Consejo Consultivo",
];
const TIPOS = {
  iniciatico: "Iniciático", demolay: "Grado DeMolay", maestre_consejero: "Maestre Consejero",
  past_maestre_consejero: "Past Maestre Consejero", filantropia: "Filantropía", sir: "Sir (Priorato de Caballería)",
  lord_chevalier: "Lord Chevalier", honorable: "Honorable (Legión de Honor)", cargo: "Puesto en la gestión",
};
const PUESTOS = [...new Set([
  "Maestre Consejero", "Primer Consejero", "Segundo Consejero", "Escriba", "Orador", "Tesorero", "Primer Diácono", "Segundo Diácono",
  "Primer Mayordomo", "Segundo Mayordomo", "Mariscal", "Capellán", "Portabandera", "Hospitalario", "Preceptor", "Organista",
  "Ilustre Caballero Comendador", "Comendador Escudero", "Comendador Paje", "Protocolista", "Prior", "Sacristán", "Centinela",
  "Gran Comendador Chevalier", "Gran Comendador Escudero", "Gran Comendador del Sur", "Gran Comendador del Occidente", "Gran Secretario", "Gran Tesorero", "Gran Capellán", "Gran Mariscal",
  "Decano", "Vice-Decano", "Secretario", "Sargento de Armas", "Maestre Consejero Departamental", "Presidente del Consejo Consultivo",
])];
let me, timer, news = [], idx = 0, registro = false;

const show = (id) => ["auth", "pend", "app"].forEach((x) => ($(x).hidden = x !== id));
const lbl = (p) => `${p.nombre}-(${p.titulo})`;
const ini = (n) => (n || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const fecha = (f, o = { day: "2-digit", month: "long", year: "numeric" }) => new Date(f + "T12:00:00").toLocaleDateString("es-BO", o);
const msg = (el, t, bad) => { el.textContent = t; el.className = bad ? "err" : "ok"; };

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e[k] = v;
    else if (k === "value") e.value = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...kids.flat().filter((x) => x != null && x !== false));
  return e;
}
const sel = (opts, value) => { const s = h("select"); opts.forEach(([v, t]) => s.append(h("option", { value: v }, t))); if (value != null) s.value = value; return s; };
const field = (t, input) => h("div", {}, h("label", {}, t), input);
const cuerposSel = (v) => sel([["", "(sin cuerpo)"], ...CUERPOS.map((c) => [c, c])], v ?? "");

const cache = new Map();
async function signed(bucket, path) {
  if (!path) return "";
  const k = bucket + "/" + path;
  if (cache.has(k)) return cache.get(k);
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
  const u = data?.signedUrl || "";
  cache.set(k, u);
  return u;
}
function avatar(p, cls = "") {
  const s = h("span", { class: "av " + cls }, ini(p.nombre));
  if (p.foto_path) signed("avatares", p.foto_path).then((u) => { if (u) { s.textContent = ""; s.style.backgroundImage = `url("${u}")`; } });
  return s;
}
async function resize(file, max) {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/jpeg", 0.82));
}

/* ---------- sesión ---------- */
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return show("auth");
  const { data: p } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!p || !p.aprobado) return show("pend");
  me = p;
  $("mav").replaceChildren(avatar(me));
  $("mt").textContent = lbl(me);
  show("app");
  go("inicio");
}
$("toggle").onclick = () => {
  registro = !registro;
  $("extra").hidden = !registro;
  $("go").textContent = registro ? "Crear cuenta" : "Entrar";
  $("toggle").textContent = registro ? "Ya tengo cuenta" : "Crear cuenta con código de invitación";
  $("msg").textContent = "";
};
$("form").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("email").value.trim(), password = $("pass").value;
  $("msg").textContent = "";
  let error;
  if (registro) {
    ({ error } = await sb.auth.signUp({ email, password, options: { data: { nombre: $("nombre").value.trim(), codigo: $("codigo").value.trim() } } }));
    if (error) { $("msg").textContent = "No se pudo crear la cuenta. Revisa tu código de invitación y que la contraseña tenga 8 o más caracteres."; return; }
  } else {
    ({ error } = await sb.auth.signInWithPassword({ email, password }));
    if (error) { $("msg").textContent = "Correo o contraseña incorrectos."; return; }
  }
  boot();
};
const salir = async () => { await sb.auth.signOut(); location.reload(); };
$("out1").onclick = salir; $("out2").onclick = salir;
$("dx").onclick = () => $("dlg").close();
$("me").onclick = () => go("perfil", me.id);

/* ---------- navegación ---------- */
function go(view, arg) {
  clearInterval(timer);
  const nav = $("nav"); nav.replaceChildren();
  const items = [["inicio", "Inicio"], ["hermanos", "Hermanos"], ["bitacora", "Bitácora"], ["consejo", "Consejo Consultivo"], ...(me.es_admin ? [["admin", "Administración"]] : [])];
  items.forEach(([v, t]) => nav.append(h("button", { onclick: () => go(v), ...(v === view ? { "aria-current": "true" } : {}) }, t)));
  const main = $("main"); main.replaceChildren();
  window.scrollTo(0, 0);
  if (view === "inicio") viewInicio(main);
  else if (view === "hermanos") viewHermanos(main);
  else if (view === "bitacora") viewBitacora(main);
  else if (view === "consejo") viewConsejo(main);
  else if (view === "perfil") viewPerfil(main, arg);
  else if (view === "admin") viewAdmin(main);
}

/* ---------- inicio: noticias y calendario ---------- */
async function imgUrl(v) {
  if (!v) return "";
  if (v.startsWith("storage:")) return signed("noticias", v.slice(8));
  return /^https:\/\//.test(v) ? v.replace(/["\\()]/g, "") : "";
}
function viewInicio(main) {
  const st = h("h3"), ss = h("p"), sbtn = h("button", { class: "btn" }, "Leer completa");
  const slideEl = h("div", { class: "slide" }, st, ss, sbtn), dots = h("div", { class: "dots" });
  const evs = h("div");
  main.append(h("section", {}, h("h2", {}, "Noticias"), slideEl, dots));
  destacadosSection(main);
  main.append(h("section", {}, h("h2", {}, "Calendario departamental"), evs));

  async function slide(i) {
    if (!news.length) { st.textContent = "Sin noticias por ahora"; ss.textContent = ""; sbtn.hidden = true; dots.replaceChildren(); return; }
    idx = (i + news.length) % news.length;
    const n = news[idx], img = await imgUrl(n.imagen_url);
    st.textContent = n.titulo; ss.textContent = n.resumen ?? ""; sbtn.hidden = false;
    slideEl.style.backgroundImage = img ? `linear-gradient(rgba(8,12,24,.72),rgba(8,12,24,.72)),url("${img}")` : "";
    sbtn.onclick = () => {
      $("dt").textContent = n.titulo; $("db").textContent = n.cuerpo ?? ""; $("dimg").replaceChildren();
      if (img) $("dimg").append(h("img", { src: img, alt: "" }));
      $("dlg").showModal();
    };
    dots.replaceChildren(...news.map((_, j) => h("button", { "aria-label": `Noticia ${j + 1}`, ...(j === idx ? { "aria-current": "true" } : {}), onclick: () => { slide(j); auto(); } })));
  }
  function auto() {
    clearInterval(timer);
    if (news.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => slide(idx + 1), 6000);
  }
  sb.from("noticias").select("*").order("created_at", { ascending: false }).then(({ data }) => { news = data ?? []; slide(0); auto(); });
  const hoy = new Date().toISOString().slice(0, 10);
  sb.from("eventos").select("*").gte("fecha", hoy).order("fecha").then(({ data }) => {
    if (!data?.length) { evs.textContent = "No hay actividades próximas."; return; }
    data.forEach((e) => evs.append(h("div", { class: "ev" + (e.departamental ? " dep" : "") },
      h("b", {}, fecha(e.fecha, { day: "2-digit", month: "short" })),
      h("span", {}, e.titulo, h("span", { class: "tag" }, e.departamental ? "Departamental" : (e.lugar ?? ""))))));
  });
}

/* ---------- hermanos ---------- */
async function viewHermanos(main) {
  const filtro = sel([["", "Todos los cuerpos"], ...CUERPOS.map((c) => [c, c])]), grid = h("div", { class: "cards" });
  main.append(h("section", {}, h("h2", {}, "Hermanos"), field("Filtrar por cuerpo", filtro), grid));
  const { data } = await sb.from("profiles").select("id,nombre,titulo,cuerpo,foto_path,grado").eq("aprobado", true).order("nombre");
  const pintar = () => {
    grid.replaceChildren();
    (data ?? []).filter((p) => !filtro.value || p.cuerpo === filtro.value).forEach((p) =>
      grid.append(h("button", { class: "card", onclick: () => go("perfil", p.id) }, avatar(p), h("span", {}, h("b", {}, lbl(p)), h("br"), h("small", {}, p.cuerpo ?? GR[p.grado])))));
    if (!grid.children.length) grid.textContent = "No hay hermanos para mostrar.";
  };
  filtro.onchange = pintar; pintar();
}

/* ---------- perfil y hoja de vida ---------- */
async function viewPerfil(main, id) {
  const [{ data: p }, { data: hitos }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", id).single(),
    sb.from("hitos").select("*").eq("perfil_id", id).order("fecha", { nullsFirst: false }),
  ]);
  if (!p) { main.textContent = "Perfil no disponible."; return; }
  const esMio = p.id === me.id;
  main.append(h("div", { class: "prof" }, avatar(p, "big"), h("div", {}, h("h2", {}, lbl(p)), h("p", { class: "mute" }, GR[p.grado] + (p.cuerpo ? " · " + p.cuerpo : "")))));
  if (p.presentacion) main.append(h("p", {}, p.presentacion));
  const dest = h("p", { class: "mute" }); main.append(dest);
  Promise.all([sb.from("destacados").select("id", { count: "exact", head: true }).eq("perfil_id", id), sb.from("pines").select("gestion").eq("perfil_id", id)]).then(([{ count }, { data: pn }]) => {
    const t = []; if (count) t.push(`Destacado ${count} ${count === 1 ? "vez" : "veces"}`); (pn ?? []).forEach((x) => t.push(`🏅 Pin de la gestión ${x.gestion}`)); dest.textContent = t.join(" · ");
  });
  const tl = h("div", { class: "tl" });
  (hitos ?? []).forEach((x) => tl.append(h("div", {}, h("b", {}, x.tipo === "cargo" && x.detalle ? x.detalle : (TIPOS[x.tipo] ?? x.tipo)), h("span", {}, [x.tipo === "cargo" ? "Puesto" : null, x.gestion, x.fecha ? fecha(x.fecha) : "", x.tipo === "cargo" ? "" : x.detalle].filter(Boolean).join(" · ")),
    me.es_admin ? h("button", { class: "link", onclick: async () => { await sb.from("hitos").delete().eq("id", x.id); go("perfil", id); } }, "Quitar") : null)));
  main.append(h("section", {}, h("h2", {}, "Hoja de vida DeMolay"), hitos?.length ? tl : h("p", { class: "mute" }, "Aún no hay títulos ni cargos registrados.")));
  if (!esMio) return;
  const txt = h("textarea", { maxlength: 600, rows: 4 }), file = h("input", { type: "file", accept: "image/*" }), st = h("p");
  txt.value = p.presentacion ?? "";
  main.append(h("section", {}, h("h2", {}, "Editar mi perfil"), field("Presentación (máximo 600 caracteres)", txt), field("Foto de perfil", file),
    h("button", { class: "btn", onclick: async () => {
      let path = null;
      try {
        if (file.files[0]) {
          path = `${me.id}/${Date.now()}.jpg`;
          const { error } = await sb.storage.from("avatares").upload(path, await resize(file.files[0], 480), { contentType: "image/jpeg" });
          if (error) throw error;
        }
        const { error } = await sb.rpc("actualizar_mi_perfil", { p_presentacion: txt.value, p_foto: path });
        if (error) throw error;
        if (path) { if (me.foto_path) await sb.storage.from("avatares").remove([me.foto_path]); me.foto_path = path; $("mav").replaceChildren(avatar(me)); }
        msg(st, "Guardado."); go("perfil", me.id);
      } catch (e) { msg(st, "No se pudo guardar. Intenta de nuevo.", true); }
    } }, "Guardar"), st));
}

/* ---------- administración ---------- */
async function viewAdmin(main) {
  const miembros = h("div"), codigos = h("div"), hojaBox = h("div");
  main.append(h("section", {}, h("h2", {}, "Miembros"), miembros), h("section", {}, h("h2", {}, "Hoja de vida"), hojaBox),
    h("section", {}, h("h2", {}, "Códigos de invitación"), codigos), nuevaNoticia(), nuevoEvento(), nuevaBitacora(), nuevoDestacado(), pinGestion());

  const { data: ms } = await sb.from("profiles").select("*").order("aprobado").order("created_at", { ascending: false });
  (ms ?? []).forEach((p) => {
    const g = sel(GR.map((t, i) => [i, t]), p.grado), t = h("input", { value: p.titulo }), c = cuerposSel(p.cuerpo), st = h("p");
    const guardar = (aprobar) => async () => {
      const { error } = await sb.from("profiles").update({ grado: +g.value, titulo: t.value.trim() || "Iniciático", cuerpo: c.value || null, aprobado: aprobar ? true : p.aprobado }).eq("id", p.id);
      msg(st, error ? "Error al guardar." : "Guardado.", !!error); if (!error && aprobar) viewAdminRefresh();
    };
    miembros.append(h("div", { class: "card static" }, h("b", {}, p.nombre + (p.aprobado ? "" : " (pendiente)")),
      h("div", { class: "row" }, field("Grado", g), field("Título", t), field("Cuerpo", c)),
      h("button", { class: "btn", onclick: guardar(!p.aprobado) }, p.aprobado ? "Guardar" : "Aprobar"),
      p.id !== me.id ? h("button", { class: "link", onclick: async () => { if (confirm("¿Quitar a " + p.nombre + "?")) { await sb.from("profiles").delete().eq("id", p.id); viewAdminRefresh(); } } }, "Quitar") : null, st));
  });

  const quien = sel((ms ?? []).filter((p) => p.aprobado).map((p) => [p.id, lbl(p)])), tipo = sel(Object.entries(TIPOS)),
    det = h("input", { list: "puestos", placeholder: "Puesto (elige o escribe) o filantropía" }), ges = h("input", { placeholder: "Ej.: 2026-I" }), fe = h("input", { type: "date" }), st2 = h("p");
  hojaBox.append(h("div", { class: "row" }, field("Hermano", quien), field("Título o cargo", tipo), field("Puesto o detalle", det), field("Gestión", ges), field("Fecha", fe)),
    h("datalist", { id: "puestos" }, ...PUESTOS.map((p) => h("option", { value: p }))),
    h("button", { class: "btn", onclick: async () => {
      const { error } = await sb.from("hitos").insert({ perfil_id: quien.value, tipo: tipo.value, detalle: det.value.trim() || null, gestion: ges.value.trim() || null, fecha: fe.value || null });
      msg(st2, error ? "Error al guardar." : "Agregado a la hoja de vida.", !!error); if (!error) det.value = "";
    } }, "Agregar"), st2);

  const lista = h("div"), st3 = h("p");
  const cargar = async () => { const { data } = await sb.from("codigos").select("*").eq("usado", false); lista.replaceChildren(...(data ?? []).map((c) => h("p", {}, h("b", {}, c.codigo)))); if (!data?.length) lista.textContent = "No hay códigos sin usar."; };
  codigos.append(h("button", { class: "btn", onclick: async () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", cod = Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => a[n % a.length]).join("");
    const { error } = await sb.from("codigos").insert({ codigo: cod });
    msg(st3, error ? "No se pudo crear." : "Código creado: " + cod, !!error); cargar();
  } }, "Crear código nuevo"), st3, h("p", { class: "mute" }, "Códigos sin usar (cada uno sirve para un solo registro):"), lista);
  cargar();
}
const viewAdminRefresh = () => go("admin");

function nuevaNoticia() {
  const t = h("input"), r = h("input"), c = h("textarea", { rows: 4 }), f = h("input", { type: "file", accept: "image/*" }), g = sel(GR.slice(0, 3).map((x, i) => [i, x])), st = h("p");
  return h("section", {}, h("h2", {}, "Nueva noticia"), field("Título", t), field("Resumen (lo que se ve al deslizar)", r), field("Texto completo", c), field("Foto de fondo (opcional)", f), field("¿Desde qué grado se ve?", g),
    h("button", { class: "btn", onclick: async () => {
      if (!t.value.trim()) return msg(st, "Escribe un título.", true);
      let path = null;
      if (f.files[0]) {
        path = `n${Date.now()}.jpg`;
        const { error } = await sb.storage.from("noticias").upload(path, await resize(f.files[0], 1280), { contentType: "image/jpeg" });
        if (error) return msg(st, "No se pudo subir la foto.", true);
      }
      const { error } = await sb.from("noticias").insert({ titulo: t.value.trim(), resumen: r.value.trim() || null, cuerpo: c.value.trim() || null, imagen_url: path ? "storage:" + path : null, min_grado: +g.value });
      msg(st, error ? "Error al publicar." : "Noticia publicada.", !!error);
      if (!error) { t.value = r.value = c.value = f.value = ""; }
    } }, "Publicar noticia"), st);
}
function nuevoEvento() {
  const t = h("input"), d = h("input", { type: "date" }), l = h("input"), dep = h("input", { type: "checkbox" }), g = sel(GR.slice(0, 3).map((x, i) => [i, x])), st = h("p");
  dep.style.width = "auto";
  return h("section", {}, h("h2", {}, "Nueva actividad"), field("Nombre", t), field("Fecha", d), field("Lugar o cuerpo organizador", l),
    h("label", {}, dep, " Es una actividad departamental (sale resaltada)"), field("¿Desde qué grado se ve?", g),
    h("button", { class: "btn", onclick: async () => {
      if (!t.value.trim() || !d.value) return msg(st, "Escribe el nombre y la fecha.", true);
      const { error } = await sb.from("eventos").insert({ titulo: t.value.trim(), fecha: d.value, lugar: l.value.trim() || null, departamental: dep.checked, min_grado: +g.value });
      msg(st, error ? "Error al guardar." : "Actividad agregada.", !!error); if (!error) { t.value = l.value = ""; }
    } }, "Agregar actividad"), st);
}

/* ---------- etapa 3: destacados, bitácora, consejo consultivo ---------- */
const semestre = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() < 6 ? "I" : "II"}`;
const rangoSem = (g) => { const [y, n] = g.split("-"); return n === "I" ? [`${y}-01-01`, `${y}-06-30`] : [`${y}-07-01`, `${y}-12-31`]; };
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };

async function destacadosSection(main) {
  const box = h("div", { class: "cards" }), rank = h("p", { class: "mute" }), pins = h("p", { class: "mute" });
  main.append(h("section", {}, h("h2", {}, "Destacados del mes"), box, rank, pins));
  const [{ data }, { data: pn }] = await Promise.all([
    sb.from("destacados").select("perfil_id,mes,motivo,profiles(nombre,titulo,foto_path)"),
    sb.from("pines").select("gestion,profiles(nombre)").order("gestion", { ascending: false }),
  ]);
  const rows = data ?? [], [d0, d1] = rangoSem(semestre()), cuenta = {};
  rows.filter((r) => r.mes >= d0 && r.mes <= d1).forEach((r) => { cuenta[r.perfil_id] = (cuenta[r.perfil_id] || 0) + 1; });
  const delMes = rows.filter((r) => r.mes === mesActual() && r.profiles);
  if (!delMes.length) box.textContent = "Todavía no hay destacados este mes.";
  delMes.forEach((r) => box.append(h("button", { class: "card", onclick: () => go("perfil", r.perfil_id) }, avatar(r.profiles),
    h("span", {}, h("b", {}, lbl(r.profiles)), h("br"), h("small", {}, r.motivo ?? "")))));
  const top = Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${rows.find((r) => r.perfil_id === id)?.profiles?.nombre} (${n})`);
  if (top.length) rank.textContent = `Más destacados de la gestión ${semestre()}: ` + top.join(", ");
  if (pn?.length) pins.textContent = "🏅 Pines de gestión: " + pn.map((p) => `${p.profiles?.nombre} · ${p.gestion}`).join(" | ");
}

async function viewBitacora(main) {
  const lista = h("div");
  main.append(h("section", {}, h("h2", {}, "Bitácora"), lista));
  const { data } = await sb.from("bitacora").select("*").order("fecha", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (!data?.length) { lista.textContent = "Aún no hay actividades registradas."; return; }
  data.forEach((b) => {
    const ph = h("div", { class: "ph" });
    if (b.imagen) signed("bitacora", b.imagen).then((u) => { if (u) ph.style.backgroundImage = `url("${u}")`; });
    lista.append(h("article", { class: "bit" }, ph, h("div", { class: "in" }, h("h3", {}, `${b.gestion} · ${b.actividad}`), ...(b.testimonios ?? []).map((t) => h("blockquote", {}, t)))));
  });
}

async function viewConsejo(main) {
  const esTio = me.grado >= 3 || me.es_admin;
  const tios = h("div", { class: "cards" }), mis = h("div"), st = h("p");
  const asunto = h("input", { maxlength: 120 }), texto = h("textarea", { rows: 4, maxlength: 2000 });
  main.append(h("section", {}, h("h2", {}, "Consejo Consultivo"), h("p", { class: "mute" }, "Pregunta o conversa con los tíos de cualquier tema. Tu mensaje es privado: solo lo ven los tíos del Consejo Consultivo."), tios),
    h("section", {}, h("h2", {}, "Escribirles"), field("Asunto", asunto), field("Mensaje", texto),
      h("button", { class: "btn", onclick: async () => {
        if (!asunto.value.trim() || !texto.value.trim()) return msg(st, "Escribe el asunto y el mensaje.", true);
        const { error } = await sb.from("consultas").insert({ asunto: asunto.value.trim(), mensaje: texto.value.trim() });
        if (error) return msg(st, "No se pudo enviar. Intenta de nuevo.", true);
        asunto.value = texto.value = ""; msg(st, "Mensaje enviado."); cargarMis();
      } }, "Enviar"), st),
    h("section", {}, h("h2", {}, "Mis mensajes"), mis));
  sb.from("profiles").select("id,nombre,titulo,cuerpo,foto_path,grado").eq("aprobado", true).eq("grado", 3).order("nombre").then(({ data }) => {
    if (!data?.length) { tios.textContent = "Aún no hay tíos registrados en la página."; return; }
    data.forEach((p) => tios.append(h("button", { class: "card", onclick: () => go("perfil", p.id) }, avatar(p), h("span", {}, h("b", {}, lbl(p))))));
  });
  const caja = (c, extra) => h("div", { class: "card static consulta" }, h("b", {}, c.asunto), h("p", {}, c.mensaje),
    c.respuesta ? h("div", { class: "resp" }, h("b", {}, "Respuesta"), h("p", {}, c.respuesta)) : h("p", { class: "mute" }, "Esperando respuesta."), extra);
  async function cargarMis() {
    const { data } = await sb.from("consultas").select("*").eq("de", me.id).order("creado", { ascending: false });
    mis.replaceChildren(...(data?.length ? data.map((c) => caja(c)) : [h("p", { class: "mute" }, "Aún no has enviado mensajes.")]));
  }
  cargarMis();
  if (!esTio) return;
  const bandeja = h("div");
  main.append(h("section", {}, h("h2", {}, "Bandeja de los tíos"), bandeja));
  const { data: pend } = await sb.from("consultas").select("*").is("respuesta", null).order("creado");
  if (!pend?.length) { bandeja.textContent = "No hay mensajes sin responder."; return; }
  const { data: quienes } = await sb.from("profiles").select("id,nombre,titulo").in("id", [...new Set(pend.map((c) => c.de))]);
  pend.forEach((c) => {
    const q = (quienes ?? []).find((x) => x.id === c.de), r = h("textarea", { rows: 3, maxlength: 2000 }), s2 = h("p");
    bandeja.append(h("div", { class: "card static consulta" }, h("small", {}, "De: " + (q ? lbl(q) : "—")), h("b", {}, c.asunto), h("p", {}, c.mensaje), field("Tu respuesta", r),
      h("button", { class: "btn", onclick: async () => {
        if (!r.value.trim()) return msg(s2, "Escribe la respuesta.", true);
        const { error } = await sb.rpc("responder_consulta", { p_id: c.id, p_respuesta: r.value.trim() });
        if (error) return msg(s2, "No se pudo enviar.", true); go("consejo");
      } }, "Responder"), s2));
  });
}

function nuevaBitacora() {
  const g = h("input", { placeholder: "Ej.: Gestión 2026-I" }), a = h("input", { placeholder: "Nombre de la actividad" }), d = h("input", { type: "date" }),
    f = h("input", { type: "file", accept: "image/*" }), t = [1, 2, 3].map(() => h("textarea", { rows: 2, maxlength: 400 })), st = h("p");
  return h("section", {}, h("h2", {}, "Nueva entrada de bitácora"), field("Gestión", g), field("Actividad", a), field("Fecha", d), field("Foto", f),
    field("Testimonio 1", t[0]), field("Testimonio 2 (opcional)", t[1]), field("Testimonio 3 (opcional)", t[2]),
    h("button", { class: "btn", onclick: async () => {
      if (!g.value.trim() || !a.value.trim()) return msg(st, "Escribe la gestión y la actividad.", true);
      const tests = t.map((x) => x.value.trim()).filter(Boolean);
      if (!tests.length) return msg(st, "Escribe al menos un testimonio.", true);
      let path = null;
      if (f.files[0]) {
        path = `b${Date.now()}.jpg`;
        const { error } = await sb.storage.from("bitacora").upload(path, await resize(f.files[0], 1280), { contentType: "image/jpeg" });
        if (error) return msg(st, "No se pudo subir la foto.", true);
      }
      const { error } = await sb.from("bitacora").insert({ gestion: g.value.trim(), actividad: a.value.trim(), fecha: d.value || null, imagen: path, testimonios: tests });
      msg(st, error ? "Error al guardar." : "Entrada agregada a la bitácora.", !!error);
      if (!error) { a.value = f.value = ""; t.forEach((x) => (x.value = "")); }
    } }, "Guardar en la bitácora"), st);
}

function pinGestion() {
  const ges = h("input", { value: semestre() }), lista = h("div"), st = h("p");
  const cargar = async () => {
    const [a, b] = rangoSem(ges.value.trim() || semestre());
    const { data } = await sb.from("destacados").select("perfil_id,mes,profiles(nombre,titulo)").gte("mes", a).lte("mes", b);
    const cuenta = {};
    (data ?? []).forEach((r) => { cuenta[r.perfil_id] = cuenta[r.perfil_id] || { n: 0, p: r.profiles }; cuenta[r.perfil_id].n++; });
    const orden = Object.entries(cuenta).sort((x, y) => y[1].n - x[1].n);
    lista.replaceChildren(...(orden.length ? orden.map(([id, v]) => h("div", { class: "ev" }, h("b", {}, String(v.n)), h("span", {}, v.p ? lbl(v.p) : "—"),
      h("button", { class: "btn alt", onclick: async () => { const { error } = await sb.from("pines").insert({ perfil_id: id, gestion: ges.value.trim() }); msg(st, error ? "No se pudo otorgar (¿ya tiene ese pin?)." : "Pin otorgado.", !!error); } }, "Dar pin")))
      : [h("p", { class: "mute" }, "No hay destacados en esa gestión.")]));
  };
  ges.onchange = cargar; cargar();
  return h("section", {}, h("h2", {}, "Pin de la gestión"), h("p", { class: "mute" }, "Gestiones: 2026-I (enero a junio) y 2026-II (julio a diciembre). Al final de la gestión, da el pin al hermano con más apariciones."), field("Gestión", ges), lista, st);
}

function nuevoDestacado() {
  const quien = h("select"), mes = h("input", { type: "month" }), mot = h("input", { placeholder: "Por qué se destaca (opcional)", maxlength: 160 }), st = h("p");
  mes.value = mesActual().slice(0, 7);
  sb.from("profiles").select("id,nombre,titulo").eq("aprobado", true).order("nombre").then(({ data }) => (data ?? []).forEach((p) => quien.append(h("option", { value: p.id }, lbl(p)))));
  return h("section", {}, h("h2", {}, "Destacar a un hermano"), h("div", { class: "row" }, field("Hermano", quien), field("Mes", mes), field("Motivo", mot)),
    h("button", { class: "btn", onclick: async () => {
      if (!mes.value) return msg(st, "Elige el mes.", true);
      const { error } = await sb.from("destacados").insert({ perfil_id: quien.value, mes: mes.value + "-01", motivo: mot.value.trim() || null });
      msg(st, error ? "Error al guardar." : "Hermano destacado.", !!error); if (!error) mot.value = "";
    } }, "Destacar"), st);
}

boot();
