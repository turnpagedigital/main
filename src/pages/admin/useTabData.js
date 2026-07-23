import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* useTabData — the shared load/save/dirty lifecycle for standard admin tabs.

   Before this hook, ~14 tabs each carried an identical copy of:
     data/original/phase/error/lastSavedAt state, a JSON.stringify dirty
     compare, an onDirtyChange effect, a load-on-mount effect, and
     near-identical load()/save() functions.

   Usage (DealsTab):
     const {
       data: deals, setData: setDeals,
       phase, error, dirty, lastSavedAt, load, save,
     } = useTabData({
       endpoint: "/api/admin/deals",
       parse:     body => ({ deals: (body.data.deals || []).map(sanitize) }),
       serialize: data => ({ deals: data.deals }),
       onDirtyChange,
     });

   Contract (matches the existing tab behavior exactly):
   - load(): GET endpoint with credentials. 401 → stays quiet (login screen
     is handled by Admin.jsx). Other failures → phase "error" + message.
     parse(body) maps the response to the working copy.
   - save(): METHOD (default PUT) with JSON serialize(data). On success,
     reloads from the server (single source of truth) and stamps
     lastSavedAt. On failure → error message, phase back to "ready".
   - dirty: deep-compare working copy vs last-loaded copy; reported upward
     through onDirtyChange automatically.

   Tabs with genuinely different flows (Posts/Briefings per-item saves,
   Assets rename cascade, Routes preview-then-apply, PageBuilder) stay
   bespoke on purpose — don't force them onto this hook. */
export function useTabData({ endpoint, parse, serialize, method = "PUT", onDirtyChange }) {
  const [data, setData]           = useState(null);
  const [original, setOriginal]   = useState(null);
  const [phase, setPhase]         = useState("loading"); // loading | ready | saving | error
  const [error, setError]         = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [conflict, setConflict]   = useState(false); // save refused: newer version on server
  const lastLoadRef = useRef(0);

  // Keep the latest callbacks/data without retriggering load/save identity.
  // Synced in an effect (post-render) per react-hooks/refs; save/load only
  // read these in event handlers and async continuations, never in render.
  const parseRef = useRef(parse);
  const serializeRef = useRef(serialize);
  const dataRef = useRef(data);
  useEffect(() => {
    parseRef.current = parse;
    serializeRef.current = serialize;
    dataRef.current = data;
  });

  const dirty = useMemo(() => {
    if (data === null || original === null) return false;
    return JSON.stringify(data) !== JSON.stringify(original);
  }, [data, original]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = useCallback(async () => {
    setPhase("loading"); setError("");
    try {
      const r = await fetch(endpoint, { credentials: "include" });
      if (r.status === 401) return;
      // A non-JSON body (usually the SPA's index.html or a Cloudflare error
      // page) means the request never reached a working API route. Surface
      // the HTTP status — it tells us which: 200 = routing/SPA fallback,
      // 5xx = the function crashed, 403 = blocked before the function.
      const body = await r.json().catch(() => {
        throw new Error(`The server returned an unexpected response (HTTP ${r.status}) — a deploy may still be rolling out. Wait a minute and reload.`);
      });
      if (!r.ok || !body.ok) throw new Error(body.error || `HTTP ${r.status}`);
      const fresh = parseRef.current(body);
      setData(fresh);
      setOriginal(JSON.parse(JSON.stringify(fresh)));
      setPhase("ready");
      setConflict(false);
      lastLoadRef.current = Date.now();
    } catch (e) { setError(e.message); setPhase("error"); }
  }, [endpoint]);

  const save = useCallback(async () => {
    const current = dataRef.current;
    if (current === null) return;
    setPhase("saving"); setError("");
    try {
      const r = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(serializeRef.current(current)),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) {
        if (r.status === 409) setConflict(true); // stale-tab guard refused the save
        throw new Error(body.error || "Save failed");
      }
      await load();
      setLastSavedAt(new Date());
    } catch (e) { setError(e.message); setPhase("ready"); }
  }, [endpoint, method, load]);

  useEffect(() => { load(); }, [load]);

  // Auto-resync: when the user returns to the tab with no unsaved edits,
  // silently refetch so a save from another door (another tab, or a git push)
  // can't leave this tab stale. Throttled to once per 15s.
  const dirtyRef = useRef(dirty);
  const phaseRef = useRef(phase);
  useEffect(() => { dirtyRef.current = dirty; phaseRef.current = phase; });
  useEffect(() => {
    const maybeReload = () => {
      if (document.visibilityState !== "visible") return;
      if (dirtyRef.current || phaseRef.current === "saving" || phaseRef.current === "loading") return;
      if (Date.now() - lastLoadRef.current < 15000) return;
      load();
    };
    window.addEventListener("focus", maybeReload);
    document.addEventListener("visibilitychange", maybeReload);
    return () => {
      window.removeEventListener("focus", maybeReload);
      document.removeEventListener("visibilitychange", maybeReload);
    };
  }, [load]);

  return { data, setData, phase, error, dirty, lastSavedAt, load, save, conflict };
}
