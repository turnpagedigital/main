(function () {
  "use strict";

  /* Prospects — triage list for candidate cases surfaced by scan_prospects.py.

     Data: api/prospects (live GitHub state; static prospects.json fallback).
     Rows carry the docket-style toolkit: ▲▼ votes (bias the next scan), a
     note (carried into the Track form's scan guidance), snooze (hidden until
     a date), and hide. Track opens a modal prefilled from the prospect and
     creates the case via the EXISTING /api/admin/cases endpoint (same admin
     session cookie), then marks the prospect tracked via PUT api/prospects.

     External file on purpose — the stacked CSPs on /intel/* silently kill
     inline scripts in production. */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  var THEMES = {};   // slug → {name, emoji} (hydrated from themes.json)
  var SHOW_THEME_EMOJIS = true;

  function themeOf(slug) {
    return THEMES[slug] || { name: slug || "untagged", emoji: "📰" };
  }

  // Monochrome outline pill — white bg / black outline+text, inverted in dark.
  function themePill(slug) {
    var t = themeOf(slug);
    return '<span class="ud-pill ud-pill-theme">' + (SHOW_THEME_EMOJIS && t.emoji ? t.emoji + " " : "") + esc(t.name) + "</span>";
  }

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[Number(m[2]) - 1] + " " + Number(m[3]);
  }

  var ITEMS = [];
  var TAB = "new";         // new | snoozed | hidden | dismissed | tracked | all
  var activeThemes = {};   // theme slug → bool (default all on)
  var cursorId = null;     // keyboard cursor, tracked by prospect id

  function themeOn(slug) { return activeThemes[slug] !== false; }

  function themeSlugs() {
    var set = {};
    ITEMS.forEach(function (i) { if (i.theme) set[i.theme] = true; });
    Object.keys(THEMES).forEach(function (s) { set[s] = true; });
    return Object.keys(set);
  }

  function findItem(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  function isSnoozed(i) {
    return !!(i.snooze_until && i.snooze_until > new Date().toISOString());
  }
  function isBuried(i) {
    return !!i.hidden || isSnoozed(i);
  }

  // Snoozed and Hidden are their own surfaces (an item can sit in both).
  function matchesTab(i, tab) {
    var status = i.status || "new";
    if (tab === "all") return true;
    if (tab === "new") return status === "new" && !isBuried(i);
    if (tab === "snoozed") return status === "new" && isSnoozed(i);
    if (tab === "hidden") return status === "new" && !!i.hidden;
    return status === tab;
  }

  function themePass(i) {
    return !i.theme || themeOn(i.theme);
  }

  function visible() {
    return ITEMS.filter(function (i) {
      return i && i.id && matchesTab(i, TAB) && themePass(i);
    });
  }

  function tabCount(tab) {
    return ITEMS.filter(function (i) {
      return i && i.id && matchesTab(i, tab) && themePass(i);
    }).length;
  }

  // ── Shared save (partial PUT — note, snooze, hide, vote, status) ──────────
  function saveFields(id, fields) {
    return fetch("api/prospects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ id: id }, fields)),
    }).then(function (r) {
      if (r.status === 429) throw new Error("rate-limited — wait a minute and retry");
      return r.json().catch(function () { throw new Error("non-JSON response (" + r.status + ") — retry in a minute"); });
    }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "save failed");
      var it = findItem(id);
      if (it) {
        Object.keys(fields).forEach(function (k) {
          if (k === "id") return;
          if (fields[k] === "" || fields[k] === 0 || fields[k] === false) delete it[k];
          else it[k] = fields[k];
        });
        if (fields.status !== undefined) it.status = fields.status;
        if (fields.tracked_slug) it.tracked_slug = fields.tracked_slug;
      }
      return true;
    });
  }

  function setStatus(id, status, btn, extra) {
    if (btn) { btn.disabled = true; if (!btn.classList.contains("pr-ico")) btn.textContent = "…"; }
    var fields = { status: status };
    if (extra && extra.tracked_slug) fields.tracked_slug = extra.tracked_slug;
    return saveFields(id, fields).then(function () {
      render();
      return true;
    }).catch(function (e) {
      if (btn) { btn.disabled = false; if (!btn.classList.contains("pr-ico")) btn.textContent = status === "dismissed" ? "Dismiss" : "Restore"; }
      alert("Could not save: " + e.message);
      return false;
    });
  }

  // ── Row tools (docket-style icons) ────────────────────────────────────────
  var SVG_UP = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
  var SVG_DN = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>';
  var SVG_NOTE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var SVG_SNZ = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var SVG_SHARE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
  var SVG_TRASH = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3-3h8a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1z"/></svg>';
  var SVG_EYE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

  function toolsHtml(i) {
    var up = i.vote === 1;
    var dn = i.vote === -1;
    var snz = isSnoozed(i);
    var snzTitle = snz ? "Snoozed until " + new Date(i.snooze_until).toLocaleString() + " — click to change" : "Snooze — resurface later";
    return (
      '<span class="pr-tools">' +
        '<button type="button" class="pr-ico' + (up ? " pr-vote-up-on" : "") + '" data-vote="1" data-id="' + esc(i.id) + '" title="More like this — biases the next scan">' + SVG_UP + "</button>" +
        '<button type="button" class="pr-ico' + (dn ? " pr-vote-dn-on" : "") + '" data-vote="-1" data-id="' + esc(i.id) + '" title="Less like this — biases the next scan">' + SVG_DN + "</button>" +
        '<button type="button" class="pr-ico' + (snz ? " pr-snz-on" : "") + '" data-snooze="' + esc(i.id) + '" title="' + esc(snzTitle) + '">' + SVG_SNZ + "</button>" +
        '<button type="button" class="pr-ico' + (i.hidden ? " pr-hide-on" : "") + '" data-hide="' + esc(i.id) + '" title="' + (i.hidden ? "Unhide" : "Hide from the triage list") + '">' + SVG_EYE + "</button>" +
        '<button type="button" class="pr-ico pr-ico-trash" data-status="dismissed" data-id="' + esc(i.id) + '" title="Dismiss — buries for good">' + SVG_TRASH + "</button>" +
        '<button type="button" class="pr-ico' + ((i.note || "").trim() ? " pr-note-on" : "") + '" data-note="' + esc(i.id) + '" title="' + ((i.note || "").trim() ? "Edit note" : "Add a note") + '">' + SVG_NOTE + "</button>" +
        '<button type="button" class="pr-ico" data-social="' + esc(i.id) + '" title="Draft social post — one-time briefing + LinkedIn / X drafts">' + SVG_SHARE + "</button>" +
      "</span>"
    );
  }

  // Tab-aware: never repeat the tab's own name as a chip on every row.
  function actionCell(i) {
    var status = i.status || "new";
    var bits = [];
    if (status === "new") {
      if (isSnoozed(i) && TAB !== "hidden") {
        bits.push('<span class="pr-status-chip">Wakes ' + esc(fmtDate(i.snooze_until)) + "</span>");
      }
      if (i.hidden && TAB === "all") {
        bits.push('<span class="pr-status-chip">Hidden</span>');
      }
      bits.push(toolsHtml(i));
    } else if (status === "dismissed") {
      if (TAB === "all") bits.push('<span class="pr-status-chip">Dismissed</span>');
    } else {
      if (TAB === "all" || !i.tracked_slug) bits.push('<span class="pr-status-chip tracked">Tracked</span>');
    }
    return '<div class="pr-act-row">' + bits.join("") + "</div>";
  }

  // The Track column: the row's one primary action, per triage status.
  function ctaCell(i) {
    var status = i.status || "new";
    if (status === "new") {
      return '<button type="button" class="pr-btn pr-btn-track" data-track="' + esc(i.id) + '">Track</button>';
    }
    if (status === "dismissed") {
      return '<button type="button" class="pr-btn" data-status="new" data-id="' + esc(i.id) + '">Restore</button>';
    }
    return i.tracked_slug
      ? '<a class="pr-btn" href="docket.html#case=' + encodeURIComponent(i.tracked_slug) + '">Open docket</a>'
      : "";
  }

  var TAB_LABELS = { new: "New", snoozed: "Snoozed", hidden: "Hidden", dismissed: "Dismissed", tracked: "Tracked", all: "All" };
  var EMPTY_TEXT = {
    new: "Nothing to triage — the daily theme scans surface candidate cases here.",
    snoozed: "Nothing snoozed — Z on a row parks it here until its wake date.",
    hidden: "Nothing hidden — H on a row tucks it away here.",
  };

  function render() {
    var tbody = document.getElementById("pr-tbody");
    var countEl = document.getElementById("ud-count");
    var list = visible();
    if (countEl) {
      var newCount = tabCount("new");
      countEl.textContent = list.length + " prospect" + (list.length === 1 ? "" : "s") +
        (TAB === "all" ? "" : " · " + TAB) + " — " + newCount + " awaiting triage";
    }
    renderStatusPanel();
    var triageTh = document.getElementById("pr-th-triage");
    if (triageTh) {
      var lbl = triageTh.querySelector(".ud-th-label");
      var n = tabCount(TAB);
      if (lbl) lbl.textContent = "Triage \u00b7 " + TAB_LABELS[TAB] +
        (TAB === "all" || !n ? "" : " (" + n + ")");
      triageTh.classList.toggle("ud-th-on", TAB !== "new");
    }
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="ud-empty">' +
        (EMPTY_TEXT[TAB] || "Nothing here.") +
        "</td></tr>";
      return;
    }
    tbody.innerHTML = list.map(function (i) {
      var meta = [i.parties && i.parties !== i.case_name ? i.parties : "", i.court, i.case_number]
        .filter(Boolean).join(" · ");
      var src = i.source_url
        ? '<div class="pr-src"><a href="' + esc(i.source_url) + '" target="_blank" rel="noopener">' +
          esc(i.source_name || "source") + (i.date ? " · " + esc(fmtDate(i.date)) : "") + " ↗</a></div>"
        : "";
      var note = (i.note || "").trim()
        ? '<div class="pr-note-view">“' + esc(i.note.trim().slice(0, 300)) + (i.note.trim().length > 300 ? "…" : "") + "”</div>"
        : "";
      return (
        '<tr id="pr-' + esc(i.id) + '" data-pid="' + esc(i.id) + '"' + (i.id === cursorId ? ' class="pr-row-cursor"' : "") + ">" +
          '<td class="ud-date">' + esc(fmtDate(i.first_seen)) + "</td>" +
          "<td>" + themePill(i.theme) + "</td>" +
          "<td>" +
            '<div class="pr-name">' + esc(i.case_name) + "</div>" +
            (meta ? '<div class="pr-meta">' + esc(meta) + "</div>" : "") +
            (i.why ? '<div class="pr-why">' + esc(i.why) + "</div>" : "") +
            note + src +
          "</td>" +
          '<td class="pr-actions">' + actionCell(i) + "</td>" +
          '<td class="pr-track-cell">' + ctaCell(i) + "</td>" +
        "</tr>"
      );
    }).join("");

    tbody.querySelectorAll("[data-status]").forEach(function (b) {
      b.addEventListener("click", function () {
        setStatus(b.getAttribute("data-id"), b.getAttribute("data-status"), b);
      });
    });
    tbody.querySelectorAll("[data-track]").forEach(function (b) {
      b.addEventListener("click", function () {
        openTrackModal(b.getAttribute("data-track"));
      });
    });
    tbody.querySelectorAll("[data-social]").forEach(function (b) {
      b.addEventListener("click", function () {
        openSocialModal(b.getAttribute("data-social"));
      });
    });
    tbody.querySelectorAll("[data-vote]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id");
        var v = Number(b.getAttribute("data-vote"));
        var it = findItem(id);
        var next = it && it.vote === v ? 0 : v;   // click again to clear
        saveFields(id, { vote: next }).then(render).catch(function (e) { alert("Vote failed: " + e.message); });
      });
    });
    tbody.querySelectorAll("[data-note]").forEach(function (b) {
      b.addEventListener("click", function () { openNoteModal(b.getAttribute("data-note")); });
    });
    tbody.querySelectorAll("[data-snooze]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        openSnoozeMenu(b.getAttribute("data-snooze"), b);
      });
    });
    tbody.querySelectorAll("[data-hide]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-hide");
        var it = findItem(id);
        saveFields(id, { hidden: !(it && it.hidden) }).then(render).catch(function (e) { alert("Hide failed: " + e.message); });
      });
    });
    // Click anywhere on a row selects it for keyboard actions.
    tbody.querySelectorAll("[data-pid]").forEach(function (tr) {
      tr.addEventListener("click", function () {
        setCursor(tr.getAttribute("data-pid"), false);
      });
    });
  }

  // ── Keyboard navigation (same conventions as the docket/news pages) ───────
  function setCursor(id, scroll) {
    cursorId = id;
    document.querySelectorAll("#pr-tbody .pr-row-cursor").forEach(function (r) {
      r.classList.remove("pr-row-cursor");
    });
    var row = id ? document.getElementById("pr-" + id) : null;
    if (row) {
      row.classList.add("pr-row-cursor");
      if (scroll) row.scrollIntoView({ block: "nearest" });
    }
  }

  function cursorItem() {
    return cursorId ? findItem(cursorId) : null;
  }

  function moveCursor(delta) {
    var list = visible();
    if (!list.length) return;
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === cursorId) { idx = i; break; }
    idx = idx === -1 ? (delta > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, idx + delta));
    setCursor(list[idx].id, true);
  }

  function typingInField(ev) {
    var t = ev.target;
    var tag = t && t.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
  }

  function modalIsOpen() {
    var note = document.getElementById("ud-note-overlay");
    return !!modalEl || (note && note.style.display !== "none") || !!snoozeMenuEl;
  }

  function wireKeys() {
    document.addEventListener("keydown", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (typingInField(ev) || modalIsOpen()) return;
      var k = ev.key;
      if (k === "ArrowDown" || k === "j") { ev.preventDefault(); moveCursor(1); return; }
      if (k === "ArrowUp" || k === "k") { ev.preventDefault(); moveCursor(-1); return; }
      var it = cursorItem();
      if (!it) return;
      var status = it.status || "new";
      if ((k === "Enter" || k === "t" || k === "T") && status === "new") {
        ev.preventDefault();
        openTrackModal(it.id);
      } else if (k === "x" || k === "X") {
        ev.preventDefault();
        if (status === "new") setStatus(it.id, "dismissed", null);
        else if (status === "dismissed") setStatus(it.id, "new", null);
      } else if ((k === "n" || k === "N") && status === "new") {
        ev.preventDefault();
        openNoteModal(it.id);
      } else if ((k === "z" || k === "Z") && status === "new") {
        ev.preventDefault();
        var zb = document.querySelector('#pr-' + it.id + ' [data-snooze]');
        if (zb) openSnoozeMenu(it.id, zb);
      } else if ((k === "h" || k === "H") && status === "new") {
        ev.preventDefault();
        saveFields(it.id, { hidden: !it.hidden }).then(render).catch(function (e) { alert("Hide failed: " + e.message); });
      } else if (k === "r" || k === "R") {
        ev.preventDefault();
        if (it.source_url) window.open(it.source_url, "_blank", "noopener");
      }
    });
  }

  // ── Note modal (docket pattern) ───────────────────────────────────────────
  var activeNoteId = null;

  function openNoteModal(id) {
    var i = findItem(id);
    if (!i) return;
    activeNoteId = id;
    var title = document.getElementById("ud-note-title");
    var meta = document.getElementById("ud-note-meta");
    var text = document.getElementById("ud-note-text");
    var status = document.getElementById("ud-note-status");
    if (title) title.textContent = i.case_name;
    if (meta) meta.textContent = [i.court, i.case_number, (i.why || "").slice(0, 140)].filter(Boolean).join(" · ");
    if (text) text.value = i.note || "";
    if (status) status.textContent = "";
    var overlay = document.getElementById("ud-note-overlay");
    if (overlay) overlay.style.display = "flex";
    if (text) text.focus();
  }

  function closeNoteModal() {
    activeNoteId = null;
    var overlay = document.getElementById("ud-note-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function saveNoteFromModal(deleteNote) {
    if (!activeNoteId) return;
    var id = activeNoteId;
    var text = document.getElementById("ud-note-text");
    var status = document.getElementById("ud-note-status");
    var val = deleteNote ? "" : (text ? text.value : "");
    if (status) status.textContent = "Saving…";
    saveFields(id, { note: val }).then(function () {
      closeNoteModal();
      render();
    }).catch(function (e) {
      if (status) status.textContent = "Save failed: " + e.message;
    });
  }

  // ── Social post drafting (one-off — does NOT create a tracked case) ───────
  var activeSocialId = null;

  function sEl(id) { return document.getElementById(id); }

  function openSocialModal(id) {
    var i = findItem(id);
    if (!i) return;
    activeSocialId = id;
    var overlay = sEl("pr-social-overlay");
    if (!overlay) return;
    var title = sEl("pr-social-title");
    if (title) title.textContent = "Draft social post — " + i.case_name;
    overlay.style.display = "flex";
    generateSocial(i);
  }

  function closeSocialModal() {
    activeSocialId = null;
    var overlay = sEl("pr-social-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function updateSocialCount(taId, countId, max) {
    var ta = sEl(taId), c = sEl(countId);
    if (!ta || !c) return;
    var n = ta.value.length;
    c.textContent = n + (max ? " / " + max : "") + " chars";
    c.classList.toggle("over", !!max && n > max);
  }

  function generateSocial(i) {
    var st = sEl("pr-social-status");
    var loading = sEl("pr-social-loading");
    var content = sEl("pr-social-content");
    var regen = sEl("pr-social-regen");
    if (loading) loading.style.display = "flex";
    if (content) content.style.display = "none";
    if (regen) regen.style.display = "none";
    if (st) { st.textContent = ""; st.className = "pr-modal-status"; }
    var prospect = {
      case_name: i.case_name, parties: i.parties, court: i.court,
      case_number: i.case_number, why: i.why, theme: i.theme,
      source_url: i.source_url, source_name: i.source_name, date: i.date,
    };
    fetch("api/social-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect: prospect }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "generation failed");
      sEl("pr-social-briefing").value = j.briefing || "";
      sEl("pr-social-li").value = j.linkedin || "";
      sEl("pr-social-x").value = j.x || "";
      updateSocialCount("pr-social-li", "pr-social-li-count", 0);
      updateSocialCount("pr-social-x", "pr-social-x-count", 280);
      if (loading) loading.style.display = "none";
      if (content) content.style.display = "";
      if (regen) regen.style.display = "";
      if (st) { st.textContent = "Draft only — this prospect stays untracked and awaiting triage."; st.className = "pr-modal-status"; }
    }).catch(function (e) {
      if (loading) loading.style.display = "none";
      if (regen) regen.style.display = "";
      if (st) { st.textContent = "Couldn’t draft: " + e.message; st.className = "pr-modal-status err"; }
    });
  }

  function copyText(text, btn) {
    function done() {
      if (!btn) return;
      var orig = btn.getAttribute("data-label") || btn.textContent;
      btn.setAttribute("data-label", orig);
      btn.textContent = "Copied";
      btn.classList.add("done");
      setTimeout(function () { btn.textContent = orig; btn.classList.remove("done"); }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {}
  }

  // ── Snooze menu (docket presets) ──────────────────────────────────────────
  var snoozeMenuEl = null;

  function snoozeOptions() {
    var now = new Date();
    function at(d, h) { var x = new Date(d); x.setHours(h, 0, 0, 0); return x; }
    var opts = [];
    opts.push({ label: "Tomorrow morning (9 AM)", when: at(new Date(now.getTime() + 86400e3), 9) });
    opts.push({ label: "In 3 days (9 AM)", when: at(new Date(now.getTime() + 3 * 86400e3), 9) });
    opts.push({ label: "Next week (9 AM)", when: at(new Date(now.getTime() + 7 * 86400e3), 9) });
    opts.push({ label: "In 2 weeks (9 AM)", when: at(new Date(now.getTime() + 14 * 86400e3), 9) });
    return opts;
  }

  function closeSnoozeMenu() {
    if (snoozeMenuEl && snoozeMenuEl.parentNode) snoozeMenuEl.parentNode.removeChild(snoozeMenuEl);
    snoozeMenuEl = null;
  }

  function openSnoozeMenu(id, anchor) {
    closeSnoozeMenu();
    var i = findItem(id);
    if (!i) return;
    var menu = document.createElement("div");
    menu.className = "ud-th-menu";
    snoozeOptions().forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ud-th-menu-item";
      b.textContent = o.label;
      b.addEventListener("click", function () {
        closeSnoozeMenu();
        saveFields(id, { snooze_until: o.when.toISOString() }).then(render)
          .catch(function (e) { alert("Snooze failed: " + e.message); });
      });
      menu.appendChild(b);
    });
    if (isSnoozed(i)) {
      var clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ud-th-menu-item";
      clear.textContent = "Wake now (clear snooze)";
      clear.addEventListener("click", function () {
        closeSnoozeMenu();
        saveFields(id, { snooze_until: "" }).then(render)
          .catch(function (e) { alert("Wake failed: " + e.message); });
      });
      menu.appendChild(clear);
    }
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 4) + "px";
    menu.style.left = Math.max(8, Math.min(r.left + window.scrollX - 80, window.innerWidth - 210)) + "px";
    snoozeMenuEl = menu;
  }

  // ── Theme filter dropdown ─────────────────────────────────────────────────
  function renderThemePanel() {
    var btn = document.getElementById("pr-theme-btn");
    var panel = document.getElementById("pr-theme-panel");
    if (!btn || !panel) return;
    var slugs = themeSlugs();
    var on = slugs.filter(themeOn).length;
    btn.innerHTML = (on === slugs.length ? "Themes: All" : "Themes: " + on + "/" + slugs.length) +
      ' <span class="ud-dd-caret">▾</span>';
    panel.innerHTML =
      '<div class="ud-dd-head">' +
        '<button type="button" class="ud-dd-quick" data-act="all">Select all</button>' +
        '<button type="button" class="ud-dd-quick" data-act="none">Deselect all</button>' +
      "</div>" +
      slugs.map(function (s) {
        return '<label class="ud-dd-row"><input type="checkbox" data-slug="' + esc(s) + '"' +
          (themeOn(s) ? " checked" : "") + ">" + themePill(s) + "</label>";
      }).join("");
    panel.querySelectorAll(".ud-dd-quick").forEach(function (q) {
      q.addEventListener("click", function () {
        var val = q.getAttribute("data-act") === "all";
        slugs.forEach(function (s) { activeThemes[s] = val; });
        renderThemePanel();
        render();
      });
    });
    panel.querySelectorAll("[data-slug]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        activeThemes[cb.getAttribute("data-slug")] = cb.checked;
        renderThemePanel();
        render();
      });
    });
  }

  // ── Track modal — promotes via the existing /api/admin/cases endpoint ─────
  var modalEl = null;

  function closeModal() {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    modalEl = null;
  }

  function slugify(name) {
    return String(name || "").toLowerCase()
      .replace(/['’.]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function docketIdFrom(url) {
    var m = /courtlistener\.com\/docket\/(\d+)/.exec(url || "");
    return m ? m[1] : (/^\d{4,}$/.test((url || "").trim()) ? (url || "").trim() : "");
  }

  function field(label, id, value, opts) {
    opts = opts || {};
    return '<label' + (opts.wide ? ' class="pr-wide"' : "") + '>' + label +
      (opts.hint ? ' <span class="pr-hint">' + opts.hint + "</span>" : "") +
      '<input type="text" id="' + id + '" value="' + esc(value || "") + '"' +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") + "></label>";
  }

  function openTrackModal(id) {
    var p = findItem(id);
    if (!p) return;
    closeModal();

    var themeChecks = themeSlugs().map(function (s) {
      var t = themeOf(s);
      return '<label><input type="checkbox" data-topic="' + esc(s) + '"' +
        (s === p.theme ? " checked" : "") + "> " + t.emoji + " " + esc(t.name) + "</label>";
    }).join("");

    // The reader's own note leads the scan guidance; the scanner's "why" follows.
    var guidance = [(p.note || "").trim(), (p.why || "").trim()].filter(Boolean).join(" — ");

    var wrap = document.createElement("div");
    wrap.className = "pr-overlay";
    wrap.innerHTML =
      '<div class="pr-box">' +
        "<h2>Track this case</h2>" +
        '<div class="sub">Creates a tracked case (same as Admin → Intelligence → Cases): the docket syncs on the next hourly run, the case joins the unified docket/calendar, and it gets its own daily briefing when it moves. A CourtListener docket is required for live syncing — paste the docket URL if you have it, switch to a claims-agent source, or pick <strong>Web search only</strong> to follow it on news coverage alone (no docket, no CourtListener quota).</div>' +
        '<div class="pr-grid">' +
          field("Display name", "tk-name", p.case_name, { wide: true }) +
          field("Slug", "tk-slug", slugify(p.case_name), { hint: "(kebab-case id)" }) +
          '<label>Docket source' +
            '<select id="tk-type"><option value="courtlistener">CourtListener docket</option>' +
              '<option value="claims_agent">Claims agent (administrator)</option>' +
              '<option value="watch">Web search only (no docket)</option></select>' +
          "</label>" +
          field("Parties", "tk-parties", p.parties || p.case_name, { wide: true }) +
          '<label class="pr-wide">CourtListener docket URL or ID' +
            '<span class="pr-cl-row">' +
              '<input type="text" id="tk-docket" value="' + esc(p.docket_url || "") + '" placeholder="https://www.courtlistener.com/docket/12345678/…">' +
              '<button type="button" class="pr-btn" id="tk-cl-find">Find</button>' +
            "</span>" +
            '<span class="pr-cl-status" id="tk-cl-status"></span>' +
            '<span id="tk-cl-results"></span>' +
          "</label>" +
          field("Court", "tk-court", p.court) +
          field("Case number", "tk-number", p.case_number) +
          field("Judge", "tk-judge", "") +
          field("Claims-agent URL", "tk-claims", "", { placeholder: "only for claims-agent source" }) +
          '<label class="pr-wide">Themes<div class="pr-topics">' + themeChecks + "</div></label>" +
          '<label class="pr-wide">Scan guidance <span class="pr-hint">(steers the news scan for this case — prefilled from your note)</span>' +
            '<textarea id="tk-guidance" rows="2">' + esc(guidance) + "</textarea></label>" +
        "</div>" +
        '<div class="pr-modal-actions">' +
          '<div class="pr-modal-status" id="tk-status"></div>' +
          '<button type="button" class="pr-btn" id="tk-cancel">Cancel</button>' +
          '<button type="button" class="pr-btn pr-btn-track" id="tk-create">Create &amp; track</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    modalEl = wrap;

    var $ = function (fid) { return wrap.querySelector("#" + fid); };
    $("tk-name").addEventListener("input", function () {
      $("tk-slug").value = slugify($("tk-name").value);
    });
    // Dim the fields that don't apply to the chosen source, so the three tracks
    // read as genuinely different rather than one form with optional bits.
    function syncSourceFields() {
      var v = $("tk-type").value;
      var clRow = $("tk-docket") && $("tk-docket").closest("label");
      var caIn = $("tk-claims");
      var caRow = caIn && caIn.closest("label");
      function dim(el, off) {
        if (!el) return;
        el.style.opacity = off ? "0.42" : "";
        el.style.pointerEvents = off ? "none" : "";
      }
      dim(clRow, v !== "courtlistener");
      dim(caRow, v !== "claims_agent");
    }
    $("tk-type").addEventListener("change", syncSourceFields);
    syncSourceFields();

    $("tk-cancel").addEventListener("click", closeModal);
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap) closeModal();
    });

    // ── CourtListener docket finder — search by case number + name, pick a
    //    result to fill the URL; a detail lookup then fills judge/court/number.
    function clStatus(msg, isErr) {
      var el = $("tk-cl-status");
      if (!el) return;
      el.textContent = msg || "";
      el.style.color = isErr ? "#C84141" : "";
    }

    function fillFromDetail(docketId) {
      fetchJson("/api/admin/courtlistener-lookup?docket_id=" + encodeURIComponent(docketId))
        .then(function (d) {
          if (!d || !d.ok) return;
          if (d.judge && !$("tk-judge").value.trim()) $("tk-judge").value = d.judge;
          if (d.court && !$("tk-court").value.trim()) $("tk-court").value = d.court;
          if (d.docket_number && !$("tk-number").value.trim()) $("tk-number").value = d.docket_number;
        }).catch(function () {});
    }

    function pickResult(r) {
      $("tk-docket").value = r.docket_url || ("https://www.courtlistener.com/docket/" + r.docket_id + "/-/");
      if (r.court && !$("tk-court").value.trim()) $("tk-court").value = r.court;
      if (r.docket_number && !$("tk-number").value.trim()) $("tk-number").value = r.docket_number;
      $("tk-cl-results").innerHTML = "";
      clStatus("Docket selected — pulling judge/court details…");
      fillFromDetail(r.docket_id);
      setTimeout(function () { clStatus(""); }, 2500);
    }

    function renderClResults(results) {
      var box = $("tk-cl-results");
      if (!box) return;
      if (!results.length) {
        box.innerHTML = "";
        clStatus("No dockets found — refine the search or paste the URL manually.", true);
        return;
      }
      box.innerHTML = results.map(function (r, idx) {
        var bits = [r.court, r.docket_number, r.date_filed ? "filed " + r.date_filed : ""].filter(Boolean).join(" · ");
        return '<button type="button" class="pr-cl-result" data-cl="' + idx + '">' +
          "<strong>" + esc(r.case_name || "(unnamed docket)") + "</strong>" +
          (bits ? '<span class="pr-cl-bits">' + esc(bits) + "</span>" : "") +
        "</button>";
      }).join("");
      box.querySelectorAll("[data-cl]").forEach(function (b) {
        b.addEventListener("click", function () {
          pickResult(results[Number(b.getAttribute("data-cl"))]);
        });
      });
    }

    function clSearch() {
      var q = [$("tk-number").value.trim(), $("tk-name").value.trim()].filter(Boolean).join(" ").trim();
      if (!q) {
        clStatus("Enter a case number or name first.", true);
        return;
      }
      clStatus("Searching CourtListener…");
      $("tk-cl-results").innerHTML = "";
      fetchJson("/api/admin/courtlistener-lookup?q=" + encodeURIComponent(q))
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.error) || "search failed");
          // One clean hit: fill it straight in; several: let Andrew pick.
          if ((d.results || []).length === 1) {
            clStatus("Found one match — filled in.");
            pickResult(d.results[0]);
          } else {
            clStatus((d.results || []).length ? "Pick the right docket:" : "");
            renderClResults(d.results || []);
          }
        })
        .catch(function (e) {
          var msg = /Unexpected token|JSON/.test(e.message)
            ? "Lookup unavailable right now — paste the docket URL manually."
            : e.message;
          clStatus(msg, true);
        });
    }

    $("tk-cl-find").addEventListener("click", clSearch);
    // Auto-populate on open when we have something to search with and no URL yet.
    if (!$("tk-docket").value.trim() && ($("tk-number").value.trim() || $("tk-name").value.trim())) {
      clSearch();
    }

    $("tk-create").addEventListener("click", function () {
      var status = $("tk-status");
      var type = $("tk-type").value;
      var topics = [];
      wrap.querySelectorAll("[data-topic]").forEach(function (cb) {
        if (cb.checked) topics.push(cb.getAttribute("data-topic"));
      });
      var docketUrlRaw = $("tk-docket").value.trim();
      var docketId = docketIdFrom(docketUrlRaw);
      var payload = {
        slug: slugify($("tk-slug").value),
        display_name: $("tk-name").value.trim(),
        type: "case",
        status: "active",
        sync: "active",
        topics: topics,
        case: {
          parties: $("tk-parties").value.trim(),
          court: $("tk-court").value.trim(),
          case_number: $("tk-number").value.trim(),
          judge: $("tk-judge").value.trim(),
        },
        docket_source: type === "watch"
          ? { type: "watch", docket_id: null, url: "", awaiting_sync: false }
          : {
              type: type,
              docket_id: docketId || null,
              url: docketId ? (docketUrlRaw.indexOf("http") === 0 ? docketUrlRaw : "https://www.courtlistener.com/docket/" + docketId + "/-/") : "",
            },
        claims_administrator: $("tk-claims").value.trim()
          ? { name: "", url: $("tk-claims").value.trim(), key_dates_url: "" }
          : null,
        scan_guidance: $("tk-guidance").value.trim(),
      };

      // Mirror /api/admin/cases validation so failures are instant + local.
      var err = null;
      if (!payload.slug) err = "A slug is required.";
      else if (!payload.display_name) err = "A display name is required.";
      else if (!topics.length) err = "Tag at least one theme.";
      else if (type !== "watch" && !payload.case.parties) err = "Parties are required.";
      else if (type === "courtlistener" && !docketId) err = "Paste the CourtListener docket URL (or ID) — or switch to the claims-agent or web-search source.";
      else if (type === "courtlistener" && (!payload.case.court || !payload.case.case_number || !payload.case.judge)) err = "Court, case number, and judge are required for a CourtListener docket.";
      else if (type === "claims_agent" && !payload.claims_administrator) err = "A claims-agent URL is required for that source type.";
      // Nothing steers a web-search case except its guidance, so that is the
      // one field this track insists on.
      else if (type === "watch" && !payload.scan_guidance) err = "Scan guidance is required for a web-search case — it is what the search runs on.";
      if (err) {
        status.className = "pr-modal-status err";
        status.textContent = err;
        return;
      }

      var btn = $("tk-create");
      btn.disabled = true;
      status.className = "pr-modal-status";
      status.textContent = "Creating case…";
      fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "case create failed");
        status.textContent = "Case created — marking prospect tracked…";
        return setStatus(p.id, "tracked", null, { tracked_slug: payload.slug }).then(function () {
          status.className = "pr-modal-status okk";
          status.innerHTML = "Tracked. The docket syncs on the next hourly run — " +
            '<a href="docket.html#case=' + encodeURIComponent(payload.slug) + '">open its docket</a>.';
          btn.style.display = "none";
          $("tk-cancel").textContent = "Done";
        });
      }).catch(function (e) {
        btn.disabled = false;
        status.className = "pr-modal-status err";
        status.textContent = e.message;
      });
    });
  }

  // ── Triage header filter — the desktop control (the #pr-show select
  // stays wired below as the mobile card-view control; both drive TAB). ────
  var triageMenuEl = null;

  function closeTriageMenu() {
    if (triageMenuEl && triageMenuEl.parentNode) triageMenuEl.parentNode.removeChild(triageMenuEl);
    triageMenuEl = null;
  }

  function openTriageMenu(th) {
    closeTriageMenu();
    var menu = document.createElement("div");
    menu.className = "ud-th-menu";
    menu.innerHTML = ["new", "snoozed", "hidden", "dismissed", "tracked", "all"].map(function (v) {
      var n = tabCount(v);
      return '<button type="button" class="ud-th-menu-item' + (TAB === v ? " ud-th-menu-on" : "") +
        '" data-tab="' + v + '">' + TAB_LABELS[v] + (v === "all" || !n ? "" : " (" + n + ")") + "</button>";
    }).join("");
    document.body.appendChild(menu);
    var rect = th.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 4) + "px";
    menu.style.left = Math.max(8, rect.right + window.scrollX - menu.offsetWidth) + "px";
    menu.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-tab]");
      if (!b) return;
      TAB = b.getAttribute("data-tab");
      closeTriageMenu();
      render();
    });
    triageMenuEl = menu;
  }

  function wireTriageHeader() {
    var th = document.getElementById("pr-th-triage");
    if (!th) return;
    th.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (triageMenuEl) { closeTriageMenu(); return; }
      openTriageMenu(th);
    });
    document.addEventListener("click", function (ev) {
      if (!triageMenuEl) return;
      if (triageMenuEl.contains(ev.target) || th.contains(ev.target)) return;
      closeTriageMenu();
    });
  }

  // ── Tabs + boot ───────────────────────────────────────────────────────────
  function wireTabs() {
    wireStatusDropdown();
    renderStatusPanel();
  }

  function renderStatusPanel() {
    var btn = document.getElementById("pr-status-btn");
    var panel = document.getElementById("pr-status-panel");
    if (!btn || !panel) return;
    var n = tabCount(TAB);
    btn.innerHTML = "Status: " + esc(TAB_LABELS[TAB] || "New") +
      (TAB === "all" || !n ? "" : " (" + n + ")") + ' <span class="ud-dd-caret">▾</span>';
    panel.innerHTML = ["new", "snoozed", "hidden", "dismissed", "tracked", "all"].map(function (t) {
      var c = tabCount(t);
      return '<button type="button" class="ud-dd-row pr-status-row' + (t === TAB ? " on" : "") +
        '" data-status-pick="' + t + '">' + esc(TAB_LABELS[t]) +
        (t === "all" || !c ? "" : " (" + c + ")") + "</button>";
    }).join("");
    panel.querySelectorAll("[data-status-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        TAB = b.getAttribute("data-status-pick");
        panel.style.display = "none";
        render();
      });
    });
  }

  function wireStatusDropdown() {
    var btn = document.getElementById("pr-status-btn");
    var panel = document.getElementById("pr-status-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") renderStatusPanel();
    });
    document.addEventListener("click", function (ev) {
      if (panel.style.display === "none") return;
      if (ev.target && !ev.target.isConnected) return;
      if (panel.contains(ev.target) || btn.contains(ev.target)) return;
      panel.style.display = "none";
    });
  }

  function wireDropdown() {
    var btn = document.getElementById("pr-theme-btn");
    var panel = document.getElementById("pr-theme-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") renderThemePanel();
    });
    document.addEventListener("click", function (ev) {
      if (panel.style.display === "none") return;
      if (ev.target && !ev.target.isConnected) return;
      if (panel.contains(ev.target) || btn.contains(ev.target)) return;
      panel.style.display = "none";
    });
  }

  function applyHash() {
    var m = /track=([a-f0-9]{10})/.exec(location.hash || "");
    if (m) openTrackModal(m[1]);
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireTabs();
    wireTriageHeader();
    wireDropdown();
    wireKeys();
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { closeModal(); closeNoteModal(); closeSocialModal(); closeSnoozeMenu(); }
    });
    document.addEventListener("click", function (ev) {
      if (snoozeMenuEl && !snoozeMenuEl.contains(ev.target) && !ev.target.closest("[data-snooze]")) {
        closeSnoozeMenu();
      }
    });
    var noteOverlay = document.getElementById("ud-note-overlay");
    if (noteOverlay) {
      noteOverlay.addEventListener("click", function (ev) {
        if (ev.target === noteOverlay) closeNoteModal();
      });
    }
    var noteSave = document.getElementById("ud-note-save");
    if (noteSave) noteSave.addEventListener("click", function () { saveNoteFromModal(false); });
    var noteDelete = document.getElementById("ud-note-delete");
    if (noteDelete) noteDelete.addEventListener("click", function () { saveNoteFromModal(true); });
    var noteCancel = document.getElementById("ud-note-cancel");
    if (noteCancel) noteCancel.addEventListener("click", closeNoteModal);

    var socialOverlay = document.getElementById("pr-social-overlay");
    if (socialOverlay) {
      socialOverlay.addEventListener("click", function (ev) {
        if (ev.target === socialOverlay) { closeSocialModal(); return; }
        var cp = ev.target.closest && ev.target.closest(".pr-copy");
        if (cp) {
          var ta = document.getElementById(cp.getAttribute("data-copy"));
          if (ta) copyText(ta.value, cp);
        }
      });
    }
    var socialClose = document.getElementById("pr-social-close");
    if (socialClose) socialClose.addEventListener("click", closeSocialModal);
    var socialRegen = document.getElementById("pr-social-regen");
    if (socialRegen) socialRegen.addEventListener("click", function () {
      var it = findItem(activeSocialId);
      if (it) generateSocial(it);
    });
    var liTa = document.getElementById("pr-social-li");
    if (liTa) liTa.addEventListener("input", function () { updateSocialCount("pr-social-li", "pr-social-li-count", 0); });
    var xTa = document.getElementById("pr-social-x");
    if (xTa) xTa.addEventListener("input", function () { updateSocialCount("pr-social-x", "pr-social-x-count", 280); });

    fetchJson("themes.json").then(function (d) {
      SHOW_THEME_EMOJIS = !d || d.show_emojis !== false;
      ((d && d.themes) || []).forEach(function (t) {
        if (!t || !t.slug) return;
        THEMES[t.slug] = { name: t.display_name || t.slug, emoji: t.emoji || "📰" };
      });
      render();
    }).catch(function () {});

    fetchJson("api/prospects")
      .then(function (p) {
        if (!p || !p.ok) throw new Error("api unavailable");
        return p.items || [];
      })
      .catch(function () {
        return fetchJson("prospects.json")
          .then(function (f) { return (f && f.items) || []; })
          .catch(function () { return []; });
      })
      .then(function (items) {
        ITEMS = items;
        var meta = document.getElementById("ud-meta");
        if (meta && ITEMS.length) {
          var newCount = ITEMS.filter(function (i) { return (i.status || "new") === "new" && !isBuried(i); }).length;
          meta.textContent = newCount + " candidate case" + (newCount === 1 ? "" : "s") + " awaiting triage.";
        }
        render();
        renderThemePanel();
        applyHash();
      });
  });
})();
