/* ==========================================================
   CONFIG
========================================================== */

// Kunci khusus undangan Shania & Bayu supaya daftar tamu tidak tercampur dengan admin lain
const STORAGE_KEY = "wedding_guest_list_bayu";

// Alamat undangan yang dikirim ke tamu. Ganti kalau undangan ada di alamat lain,
// contoh: "https://undangan-agus-wenna.vercel.app/"
const BASE_URL = window.location.origin + "/index.html";


/* ==========================================================
   HELPER
========================================================== */

const $ = s => document.querySelector(s);

const state = { search: "", group: "all", channel: "wa" };

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}

function getGuestList() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
}

function saveGuestList(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let toastTimer;
function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// 0812xxx / 812xxx / +62812xxx -> 62812xxx. Salah format -> null
function normalizePhone(raw) {
    let n = raw.replace(/\D/g, "");
    if (!n) return "";
    if (n.startsWith("0")) n = "62" + n.slice(1);
    else if (n.startsWith("8")) n = "62" + n;
    return n.length >= 10 && n.length <= 15 ? n : null;
}

// @user / user / https://instagram.com/user -> user. Salah format -> null
function normalizeInsta(raw) {
    let u = raw.trim();
    if (!u) return "";
    u = u.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(u) ? u : null;
}

function formatDate(ts) {
    return new Date(ts).toLocaleString("id-ID", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
}

function isToday(ts) {
    return new Date(ts).toDateString() === new Date().toDateString();
}


/* ==========================================================
   PESAN WHATSAPP
========================================================== */

function buildMessage(name) {
    return `Kepada Yth.
Bapak/Ibu/Saudara/i ${name}

Dengan penuh rasa bahagia, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam acara pernikahan kami:

Shania & Bayu

Besar harapan kami atas kehadiran dan doa restu Bapak/Ibu/Saudara/i untuk mengiringi awal perjalanan baru kami.

Informasi lengkap mengenai acara dapat dilihat melalui tautan berikut:

${BASE_URL}

Merupakan kebahagiaan bagi kami dapat berbagi momen istimewa ini bersama Anda.

Terima kasih atas perhatian dan doa restunya. \u{1F90D}`;
}

function openWhatsApp(guest) {
    const text = encodeURIComponent(buildMessage(guest.name));
    const url = guest.phone
        ? `https://wa.me/${guest.phone}?text=${text}`
        : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
}

// Instagram tidak mendukung isi pesan otomatis, jadi dibuat lembar 2 langkah:
// 1) salin pesan  2) buka DM. Link dibuka lewat tombol sendiri supaya tidak diblokir browser.
let igMessage = "";

function openInstagram(guest) {
    igMessage = buildMessage(guest.name);

    $("#igMsg").textContent = igMessage;
    $("#igTo").textContent = guest.instagram ? `Untuk ${guest.name} (@${guest.instagram})` : `Untuk ${guest.name}`;
    $("#igOpen").href = guest.instagram
        ? `https://ig.me/m/${guest.instagram}`
        : "https://www.instagram.com/direct/inbox/";
    $("#igShare").hidden = !navigator.share;

    const copyBtn = $("#igCopy");
    copyBtn.classList.remove("done");
    copyBtn.textContent = "1. Salin pesan";
    $("#igSheet").hidden = false;

    // coba salin otomatis; kalau diblokir browser, tombol di atas tetap bisa dipakai
    copyText(igMessage).then(markCopied).catch(() => {});
}

function markCopied() {
    const copyBtn = $("#igCopy");
    copyBtn.classList.add("done");
    copyBtn.textContent = "\u2713 Pesan tersalin";
}

function closeInstagram() { $("#igSheet").hidden = true; }

$("#igCopy").addEventListener("click", () => {
    copyText(igMessage).then(() => { markCopied(); toast("Pesan disalin"); })
        .catch(() => toast("Gagal menyalin, tekan lama pada teks pesan lalu salin"));
});
$("#igShare").addEventListener("click", () => {
    navigator.share({ text: igMessage }).catch(() => {});
});
$("#igClose").addEventListener("click", closeInstagram);
$("#igSheet").addEventListener("click", e => { if (e.target.id === "igSheet") closeInstagram(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeInstagram(); });

function openInvite(guest) {
    if (guest.channel === "ig") openInstagram(guest);
    else openWhatsApp(guest);
}

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        const t = document.createElement("textarea");
        t.value = text;
        t.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(t);
        t.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        t.remove();
        ok ? resolve() : reject();
    });
}


/* ==========================================================
   FORM
========================================================== */

const form = $("#inviteForm");
const nameInput = $("#guestName");
const groupInput = $("#guestGroup");
const phoneInput = $("#guestPhone");

function updatePreview() {
    const name = nameInput.value.trim() || "Nama Tamu";
    $("#preview").textContent = buildMessage(name);
}
nameInput.addEventListener("input", updatePreview);
updatePreview();

[nameInput, groupInput, phoneInput].forEach(el =>
    el.addEventListener("input", () => el.classList.remove("invalid")));

const igInput = $("#guestIg");

function setChannel(ch) {
    state.channel = ch;
    document.querySelectorAll(".seg").forEach(b => {
        const on = b.dataset.channel === ch;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", on);
    });
    $("#fieldPhone").hidden = ch !== "wa";
    $("#fieldIg").hidden = ch !== "ig";
    $("#sendWA").classList.toggle("ig", ch === "ig");
    $("#sendLabel").textContent = ch === "ig" ? "Salin pesan & buka Instagram" : "Kirim via WhatsApp";
}
document.querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => setChannel(b.dataset.channel)));

igInput.addEventListener("input", () => igInput.classList.remove("invalid"));

form.addEventListener("submit", e => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const group = groupInput.value.trim();
    const channel = state.channel;
    const phone = channel === "wa" ? normalizePhone(phoneInput.value) : "";
    const instagram = channel === "ig" ? normalizeInsta(igInput.value) : "";

    if (!name) { nameInput.classList.add("invalid"); nameInput.focus(); toast("Nama tamu wajib diisi"); return; }
    if (!group) { groupInput.classList.add("invalid"); groupInput.focus(); toast("Kelompok wajib diisi"); return; }
    if (phone === null) { phoneInput.classList.add("invalid"); phoneInput.focus(); toast("Nomor WhatsApp tidak valid"); return; }
    if (instagram === null) { igInput.classList.add("invalid"); igInput.focus(); toast("Username Instagram tidak valid"); return; }

    const guest = {
        id: Date.now(),
        name,
        group,
        channel,
        phone,
        instagram,
        status: "sent",
        sent: 1,
        created_at: new Date().toLocaleString()
    };

    const guests = getGuestList();
    guests.push(guest);
    saveGuestList(guests);

    openInvite(guest);

    // kelompok dibiarkan terisi supaya cepat kalau mengundang satu kelompok berturut-turut
    nameInput.value = "";
    phoneInput.value = "";
    igInput.value = "";
    updatePreview();
    nameInput.focus();

    render();
    if (channel === "wa") toast("Undangan dicatat");
});


/* ==========================================================
   DAFTAR TAMU
========================================================== */

function render() {
    const guests = getGuestList();

    // kelompok unik + jumlah
    const groups = {};
    guests.forEach(g => { groups[g.group] = (groups[g.group] || 0) + 1; });
    const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, "id"));

    if (state.group !== "all" && !groups[state.group]) state.group = "all";

    // statistik
    $("#statTotal").textContent = guests.length;
    $("#statGroup").textContent = groupNames.length;
    $("#statToday").textContent = guests.filter(g => isToday(g.id)).length;

    // saran kelompok di form
    $("#groupOptions").innerHTML = groupNames.map(g => `<option value="${escapeHtml(g)}">`).join("");
    $("#quickGroups").innerHTML = groupNames.slice(0, 6)
        .map(g => `<button type="button" data-group="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join("");

    // chip filter
    $("#chips").innerHTML = groupNames.length
        ? [`<button type="button" class="chip ${state.group === "all" ? "on" : ""}" data-filter="all">Semua<b>${guests.length}</b></button>`]
            .concat(groupNames.map(g =>
                `<button type="button" class="chip ${state.group === g ? "on" : ""}" data-filter="${escapeHtml(g)}">${escapeHtml(g)}<b>${groups[g]}</b></button>`))
            .join("")
        : "";

    // daftar
    const q = state.search.toLowerCase();
    const shown = guests
        .filter(g => state.group === "all" || g.group === state.group)
        .filter(g => !q || g.name.toLowerCase().includes(q) || g.group.toLowerCase().includes(q))
        .sort((a, b) => b.id - a.id);

    const list = $("#guestList");

    if (guests.length === 0) {
        list.innerHTML = `<div class="empty"><span class="big">&hearts;</span>Belum ada undangan dikirim.<br>Isi formulir di samping untuk mulai.</div>`;
        return;
    }
    if (shown.length === 0) {
        list.innerHTML = `<div class="empty">Tidak ada tamu yang cocok.</div>`;
        return;
    }

    list.innerHTML = shown.map(g => `
        <div class="guest">
            <div class="avatar">${escapeHtml(g.name.charAt(0).toUpperCase())}</div>
            <div class="info">
                <h3>${escapeHtml(g.name)}</h3>
                <div class="meta">
                    <span class="tag">${escapeHtml(g.group)}</span>
                    <span class="via ${g.channel === "ig" ? "ig" : ""}">${g.channel === "ig" ? "Instagram" : "WhatsApp"}</span>
                    <span>${formatDate(g.id)}</span>
                    ${(g.sent || 1) > 1 ? `<span>dikirim ${g.sent}x</span>` : ""}
                </div>
            </div>
            <div class="actions">
                <button type="button" class="icon-btn ${g.channel === "ig" ? "ig" : "wa"}" data-action="resend" data-id="${g.id}" title="Kirim ulang" aria-label="Kirim ulang ke ${escapeHtml(g.name)}">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
                </button>
                <button type="button" class="icon-btn" data-action="copy" data-id="${g.id}" title="Salin pesan" aria-label="Salin pesan untuk ${escapeHtml(g.name)}">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                </button>
                <button type="button" class="icon-btn del" data-action="delete" data-id="${g.id}" title="Hapus" aria-label="Hapus ${escapeHtml(g.name)}">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/></svg>
                </button>
            </div>
        </div>`).join("");
}


/* ==========================================================
   AKSI (kirim ulang, salin, hapus, filter)
========================================================== */

document.addEventListener("click", e => {
    const quick = e.target.closest("[data-group]");
    if (quick) { groupInput.value = quick.dataset.group; groupInput.classList.remove("invalid"); nameInput.focus(); return; }

    const chip = e.target.closest("[data-filter]");
    if (chip) { state.group = chip.dataset.filter; render(); return; }

    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const guests = getGuestList();
    const guest = guests.find(g => g.id === id);
    if (!guest) return;

    if (btn.dataset.action === "resend") {
        guest.sent = (guest.sent || 1) + 1;
        saveGuestList(guests);
        openInvite(guest);
        render();
    }

    if (btn.dataset.action === "copy") {
        copyText(buildMessage(guest.name))
            .then(() => toast("Pesan disalin"))
            .catch(() => toast("Gagal menyalin"));
    }

    if (btn.dataset.action === "delete") {
        if (!confirm(`Hapus ${guest.name} dari daftar?`)) return;
        saveGuestList(guests.filter(g => g.id !== id));
        render();
        toast("Tamu dihapus");
    }
});

$("#search").addEventListener("input", e => { state.search = e.target.value.trim(); render(); });

$("#resetData").addEventListener("click", () => {
    if (getGuestList().length === 0) { toast("Daftar sudah kosong"); return; }
    if (!confirm("Hapus semua data undangan?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.group = "all";
    render();
    toast("Semua data dihapus");
});


/* ==========================================================
   INIT
========================================================== */

render();
