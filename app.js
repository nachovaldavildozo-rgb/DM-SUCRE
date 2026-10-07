import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const GR = ["Iniciático", "DeMolay", "Caballero del Priorato"];
const show = (id) => ["auth", "pend", "app"].forEach((x) => ($(x).hidden = x !== id));
let news = [], idx = 0, timer, registro = false;

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return show("auth");
  const { data: p } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!p || !p.aprobado) return show("pend");
  $("me").textContent = `${p.nombre}-(${p.titulo}) · ${GR[p.grado] ?? ""}`;
  show("app");
  await Promise.all([loadNews(), loadEvents()]);
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

function slide(i) {
  if (!news.length) { $("st").textContent = "Sin noticias por ahora"; $("ss").textContent = ""; $("sb").hidden = true; $("dots").replaceChildren(); return; }
  idx = (i + news.length) % news.length;
  const n = news[idx], el = $("slide");
  $("st").textContent = n.titulo; $("ss").textContent = n.resumen ?? "";
  const img = /^https:\/\//.test(n.imagen_url ?? "") ? n.imagen_url.replace(/["\\()]/g, "") : "";
  el.style.backgroundImage = img ? `linear-gradient(rgba(8,12,24,.72),rgba(8,12,24,.72)),url("${img}")` : "";
  $("sb").hidden = false;
  $("sb").onclick = () => {
    $("dt").textContent = n.titulo; $("db").textContent = n.cuerpo ?? "";
    $("dimg").replaceChildren();
    if (img) { const im = document.createElement("img"); im.src = img; im.alt = ""; $("dimg").append(im); }
    $("dlg").showModal();
  };
  const dots = $("dots"); dots.replaceChildren();
  news.forEach((_, j) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `Noticia ${j + 1}`);
    if (j === idx) b.setAttribute("aria-current", "true");
    b.onclick = () => { slide(j); auto(); };
    dots.append(b);
  });
}
function auto() {
  clearInterval(timer);
  if (news.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => slide(idx + 1), 6000);
}
$("dx").onclick = () => $("dlg").close();

async function loadNews() {
  const { data } = await sb.from("noticias").select("*").order("created_at", { ascending: false });
  news = data ?? []; slide(0); auto();
}
async function loadEvents() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await sb.from("eventos").select("*").gte("fecha", hoy).order("fecha");
  const box = $("evs"); box.replaceChildren();
  if (!data?.length) { box.textContent = "No hay actividades próximas."; return; }
  data.forEach((e) => {
    const d = new Date(e.fecha + "T12:00:00");
    const row = document.createElement("div"); row.className = "ev" + (e.departamental ? " dep" : "");
    const b = document.createElement("b"); b.textContent = d.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
    const s = document.createElement("span"); s.textContent = e.titulo;
    const t = document.createElement("span"); t.className = "tag"; t.textContent = e.departamental ? "Departamental" : (e.lugar ?? "");
    s.append(t); row.append(b, s); box.append(row);
  });
}
boot();
