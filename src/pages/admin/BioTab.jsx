import React, { useState, useRef } from "react";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";
import { inputStyle, btnStyle, btnPrimaryStyle, iconBtnStyle, formatTime, CenteredMessage, ErrorBanner } from "./shared.jsx";
import { useTabData } from "./useTabData.js";
import { detectPlatform, PLATFORMS } from "../../components/SocialLinks.jsx";
import AssetPicker from "../../components/admin/AssetPicker.jsx";

function sanitizeBio(d) {
  return {
    tagline_before: typeof d.tagline_before === "string" ? d.tagline_before : "A",
    tagline_accent: typeof d.tagline_accent === "string" ? d.tagline_accent : "singular force",
    tagline_after:  typeof d.tagline_after  === "string" ? d.tagline_after  : "",
    paragraphs:     Array.isArray(d.paragraphs) ? d.paragraphs.filter(p => typeof p === "string") : [],
    social_links:   Array.isArray(d.social_links)
      ? d.social_links.filter(s => s && typeof s === "object").map(s => ({
          url: typeof s.url === "string" ? s.url : "",
        }))
      : [],
    media_logos:    Array.isArray(d.media_logos)
      ? d.media_logos.filter(l => l && typeof l === "object").map(l => ({
          name: typeof l.name === "string" ? l.name : "",
          url:  typeof l.url  === "string" ? l.url  : "",
        }))
      : [],
  };
}

export default function BioTab({ onDirtyChange }) {
  const {
    data: bio, setData: setBio,
    phase, error, dirty, lastSavedAt, load, save,
  } = useTabData({
    endpoint: "/api/admin/bio",
    parse: body => sanitizeBio(body.data),
    serialize: bio => ({ bio }),
    onDirtyChange,
  });

  if (phase === "loading") return <CenteredMessage>Loading bio…</CenteredMessage>;
  if (phase === "error" && bio === null) return (
    <CenteredMessage>
      <p style={{ color: "#c44", marginBottom: "1rem" }}>{error}</p>
      <button onClick={load} style={btnStyle}>Retry</button>
    </CenteredMessage>
  );
  if (!bio) return null;

  return <BioSectionInner
    bio={bio}
    onChangeBio={(field, value) => setBio(b => ({ ...b, [field]: value }))}
    onSave={save}
    dirty={dirty}
    isSaving={phase === "saving"}
    error={error}
    lastSavedAt={lastSavedAt}
  />;
}

/* ── CropTool ───────────────────────────────────────────────────────────────
   A simple drag-to-pan + zoom-slider crop widget.
   - src: data URL of the image to crop
   - circular: if true, the crop viewport is shown as a circle (for avatars)
   - onApply(base64png): called with the cropped PNG as base64 (no data: prefix)
   - onCancel(): called when user clicks Cancel
*/
const CROP_SIZE   = 280;   // viewport display px
const OUTPUT_SIZE = 400;   // exported image px

function CropTool({ src, circular, onApply, onCancel }) {
  const imgRef  = useRef(null);
  const [zoom,   setZoomState] = useState(1);
  const [offset, setOffset]    = useState({ x: 0, y: 0 }); // img top-left in container
  const dragRef = useRef(null); // { startX, startY, origX, origY }

  // After image loads, centre it in the viewport
  function handleLoad() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const h = CROP_SIZE * img.naturalHeight / img.naturalWidth;
    setOffset({ x: 0, y: (CROP_SIZE - h) / 2 });
    setZoomState(1);
  }

  // Zoom while keeping the viewport centre anchored to the same image pixel
  function handleZoom(newZoom) {
    const ratio = newZoom / zoom;
    setOffset(prev => ({
      x: CROP_SIZE / 2 - (CROP_SIZE / 2 - prev.x) * ratio,
      y: CROP_SIZE / 2 - (CROP_SIZE / 2 - prev.y) * ratio,
    }));
    setZoomState(newZoom);
  }

  // Pointer-capture drag (works for mouse + touch, stays captured outside element)
  function handlePointerDown(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }
  function handlePointerUp(e) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function handleApply() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const displayW = CROP_SIZE * zoom;           // px wide the img is drawn
    const scale    = nw / displayW;              // natural px per display px

    // Crop window top-left in display-image coords
    const cropDX = -offset.x;
    const cropDY = -offset.y;

    // Clamp to image bounds
    const srcX = Math.max(0, cropDX * scale);
    const srcY = Math.max(0, cropDY * scale);
    const srcW = Math.min(CROP_SIZE * scale, nw - srcX);
    const srcH = Math.min(CROP_SIZE * scale, nh - srcY);

    const canvas = document.createElement("canvas");
    canvas.width  = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");

    if (circular) {
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onApply(canvas.toDataURL("image/png").split(",")[1]);
  }

  return (
    <div>
      {/* Viewport */}
      <div
        style={{
          width: CROP_SIZE, height: CROP_SIZE,
          overflow: "hidden", position: "relative",
          cursor: "move",
          background: "#888",
          borderRadius: circular ? "50%" : 0,
          border: `2px solid ${LINE}`,
          touchAction: "none",
          flexShrink: 0,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          onLoad={handleLoad}
          draggable={false}
          style={{
            position: "absolute",
            width: `${zoom * 100}%`,
            height: "auto",
            left: offset.x,
            top: offset.y,
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        {/* Guide overlay */}
        {!circular && (
          <div style={{
            position: "absolute", inset: 0,
            border: "1px dashed rgba(255,255,255,0.5)",
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Zoom */}
      <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.72rem", color: INK_60, fontWeight: 600, flexShrink: 0 }}>Zoom</span>
        <input
          type="range" min={1} max={4} step={0.01} value={zoom}
          onChange={e => handleZoom(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: NEON, cursor: "pointer" }}
        />
        <span style={{ fontSize: "0.72rem", color: INK_60, minWidth: "2.5rem" }}>{zoom.toFixed(2)}×</span>
      </div>

      <p style={{ fontSize: "0.72rem", color: INK_60, margin: "0.3rem 0 0.6rem" }}>
        Drag to reposition · scroll slider to zoom
      </p>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={handleApply} style={btnPrimaryStyle}>Apply Crop</button>
        <button type="button" onClick={onCancel} style={btnStyle}>Cancel</button>
      </div>
    </div>
  );
}

function BioSectionInner({ bio, onChangeBio, onSave, dirty, isSaving, error, lastSavedAt }) {
  const paragraphs = bio.paragraphs || [];

  // ── Profile photo upload + crop state ──────────────────────────────────────
  // phases: idle | cropping | cropped | uploading | done | error
  const [photoRaw,       setPhotoRaw]       = useState(null);  // raw data URL → shown in CropTool
  const [photoCropped,   setPhotoCropped]   = useState(null);  // base64 PNG from CropTool
  const [photoPhase,     setPhotoPhase]     = useState("idle");
  const [photoError,     setPhotoError]     = useState("");
  const [photoCacheBust, setPhotoCacheBust] = useState("");

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setPhotoError("Image must be under 10 MB."); return; }
    setPhotoError("");
    const reader = new FileReader();
    reader.onload = ev => { setPhotoRaw(ev.target.result); setPhotoPhase("cropping"); };
    reader.readAsDataURL(file);
    e.target.value = "";   // reset so same file can be re-selected
  }

  async function handlePhotoUpload() {
    if (!photoCropped) return;
    setPhotoPhase("uploading");
    setPhotoError("");
    try {
      const r = await fetch("/api/admin/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: photoCropped, mime_type: "image/png" }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setPhotoPhase("done");
      setPhotoCropped(null);
      setPhotoRaw(null);
      setPhotoCacheBust(`?v=${Date.now()}`);
    } catch (e) {
      setPhotoError(e.message);
      setPhotoPhase("error");
    }
  }

  // ── Avatar upload + crop state ───────────────────────────────────────────
  // The avatar is a separate circular crop used in social post cards
  const [avatarRaw,       setAvatarRaw]       = useState(null);
  const [avatarCropped,   setAvatarCropped]   = useState(null);
  const [avatarPhase,     setAvatarPhase]     = useState("idle");
  const [avatarError,     setAvatarError]     = useState("");
  const [avatarCacheBust, setAvatarCacheBust] = useState("");

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setAvatarError("Image must be under 10 MB."); return; }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = ev => { setAvatarRaw(ev.target.result); setAvatarPhase("cropping"); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleAvatarUpload() {
    if (!avatarCropped) return;
    setAvatarPhase("uploading");
    setAvatarError("");
    try {
      const r = await fetch("/api/admin/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: avatarCropped, mime_type: "image/png" }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.ok) throw new Error(body.error || "Upload failed");
      setAvatarPhase("done");
      setAvatarCropped(null);
      setAvatarRaw(null);
      setAvatarCacheBust(`?v=${Date.now()}`);
    } catch (e) {
      setAvatarError(e.message);
      setAvatarPhase("error");
    }
  }

  function updateParagraph(i, val) {
    const next = [...paragraphs];
    next[i] = val;
    onChangeBio("paragraphs", next);
  }
  function moveParagraph(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= paragraphs.length) return;
    const next = [...paragraphs];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeBio("paragraphs", next);
  }
  function deleteParagraph(i) {
    if (!confirm("Delete this paragraph?")) return;
    onChangeBio("paragraphs", paragraphs.filter((_, idx) => idx !== i));
  }
  function addParagraph() {
    onChangeBio("paragraphs", [...paragraphs, ""]);
  }

  // ── Social link helpers ─────────────────────────────────────────────────
  const socialLinks = Array.isArray(bio.social_links) ? bio.social_links : [];

  function updateSocialLink(i, val) {
    const next = socialLinks.map((s, idx) => idx === i ? { url: val } : s);
    onChangeBio("social_links", next);
  }
  function moveSocialLink(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= socialLinks.length) return;
    const next = [...socialLinks];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeBio("social_links", next);
  }
  function deleteSocialLink(i) {
    onChangeBio("social_links", socialLinks.filter((_, idx) => idx !== i));
  }
  function addSocialLink() {
    onChangeBio("social_links", [...socialLinks, { url: "" }]);
  }

  // ── Media logo helpers ──────────────────────────────────────────────────
  const logos = Array.isArray(bio.media_logos) ? bio.media_logos : [];

  function updateLogo(i, field, val) {
    const next = logos.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    onChangeBio("media_logos", next);
  }
  function moveLogo(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= logos.length) return;
    const next = [...logos];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeBio("media_logos", next);
  }
  function deleteLogo(i) {
    if (!confirm("Remove this logo?")) return;
    onChangeBio("media_logos", logos.filter((_, idx) => idx !== i));
  }
  function addLogo() {
    onChangeBio("media_logos", [...logos, { name: "", url: "" }]);
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 0" }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        marginBottom: "1rem", paddingBottom: "1rem",
        borderBottom: `2px solid ${LINE}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Bio — Andrew Glantz
        </div>
        <div style={{ flex: 1, fontSize: "0.85rem", color: INK_60 }}>
          {isSaving && "Saving…"}
          {!isSaving && dirty && "Unsaved changes"}
          {!isSaving && !dirty && lastSavedAt && `Saved ${formatTime(lastSavedAt)}`}
          {!isSaving && !dirty && !lastSavedAt && "Up to date"}
        </div>
        <button onClick={onSave} disabled={!dirty || isSaving} style={{
          ...btnPrimaryStyle,
          opacity: (!dirty || isSaving) ? 0.5 : 1,
          cursor: (!dirty || isSaving) ? "default" : "pointer",
        }}>
          {isSaving ? "Saving…" : "Save Bio"}
        </button>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      {/* ── Profile Photo ─────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.8rem" }}>
          Profile Photo
        </div>

        {photoPhase === "cropping" ? (
          /* ── Crop step ── */
          <div>
            <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.7rem" }}>
              Drag to reposition · use the slider to zoom · click <strong>Apply Crop</strong> when ready.
            </p>
            <CropTool
              src={photoRaw}
              circular={false}
              onApply={b64 => { setPhotoCropped(b64); setPhotoPhase("cropped"); }}
              onCancel={() => { setPhotoRaw(null); setPhotoPhase("idle"); }}
            />
          </div>
        ) : (
          /* ── Idle / cropped / uploading / done ── */
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* Current photo */}
            <div>
              <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.4rem", fontWeight: 600 }}>Current</p>
              <img
                src={`/andrew.png${photoCacheBust}`}
                alt="Andrew Glantz"
                style={{ width: 90, height: 112, objectFit: "cover", border: `1px solid ${LINE}`, filter: "grayscale(100%)", display: "block" }}
              />
            </div>

            {/* Upload controls */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {photoCropped ? (
                <div style={{ marginBottom: "0.65rem" }}>
                  <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.3rem", fontWeight: 600 }}>
                    Cropped preview
                  </p>
                  <img
                    src={`data:image/png;base64,${photoCropped}`}
                    alt="cropped preview"
                    style={{ width: 90, height: 90, objectFit: "cover", border: `1px solid ${LINE}`, display: "block" }}
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoPhase("cropping"); }}
                    style={{ ...btnStyle, fontSize: "0.75rem", padding: "0.25rem 0.6rem", marginTop: "0.4rem" }}
                  >
                    Re-crop
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.5rem" }}>
                  Replace with a new photo — JPEG, PNG, or WebP, max 10 MB:
                </p>
              )}

              {!photoCropped && (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.65rem", fontFamily: FONT }}
                />
              )}

              {photoError && (
                <p style={{ color: "#c44", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{photoError}</p>
              )}
              {photoPhase === "done" && (
                <p style={{ color: "#2a7a2a", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                  ✓ Uploaded — live on the site in ~1–2 min.
                </p>
              )}

              {photoCropped && (
                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={photoPhase === "uploading"}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: photoPhase === "uploading" ? 0.5 : 1,
                    cursor: photoPhase === "uploading" ? "default" : "pointer",
                  }}
                >
                  {photoPhase === "uploading" ? "Uploading…" : "Upload Photo"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Avatar (circular crop — used in social post cards) ────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
          Avatar <span style={{ fontWeight: 400, color: INK_60 }}>(circle crop)</span>
        </div>
        <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.8rem" }}>
          This cropped headshot appears in the social post cards on the Press page.
          Upload a separate tightly-cropped face photo, or re-use the profile photo.
        </p>

        {avatarPhase === "cropping" ? (
          <div>
            <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.7rem" }}>
              Centre your face in the circle · drag to reposition · zoom in as needed.
            </p>
            <CropTool
              src={avatarRaw}
              circular={true}
              onApply={b64 => { setAvatarCropped(b64); setAvatarPhase("cropped"); }}
              onCancel={() => { setAvatarRaw(null); setAvatarPhase("idle"); }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* Current avatar */}
            <div>
              <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.4rem", fontWeight: 600 }}>Current</p>
              <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `1px solid ${LINE}`, background: "#eee" }}>
                <img
                  src={`/andrew-avatar.png${avatarCacheBust}`}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <p style={{ fontSize: "0.65rem", color: INK_60, marginTop: "0.3rem", maxWidth: 72 }}>
                (blank until first upload)
              </p>
            </div>

            {/* Upload controls */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {avatarCropped ? (
                /* ── Post-crop: preview + action buttons side-by-side ── */
                <div>
                  <p style={{ fontSize: "0.72rem", color: INK_60, marginBottom: "0.4rem", fontWeight: 600 }}>
                    Cropped preview
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `1px solid ${LINE}`, flexShrink: 0 }}>
                      <img
                        src={`data:image/png;base64,${avatarCropped}`}
                        alt="avatar preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarPhase === "uploading"}
                        style={{
                          ...btnPrimaryStyle,
                          opacity: avatarPhase === "uploading" ? 0.5 : 1,
                          cursor: avatarPhase === "uploading" ? "default" : "pointer",
                        }}
                      >
                        {avatarPhase === "uploading" ? "Uploading…" : "Upload Avatar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarPhase("cropping")}
                        style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.3rem 0.7rem" }}
                      >
                        Re-crop
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Idle: file picker ── */
                <div>
                  <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.5rem" }}>
                    Upload a photo — JPEG, PNG, or WebP, max 10 MB:
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.65rem", fontFamily: FONT }}
                  />
                </div>
              )}

              {avatarError && (
                <p style={{ color: "#c44", fontSize: "0.82rem", marginTop: "0.5rem" }}>{avatarError}</p>
              )}
              {avatarPhase === "done" && (
                <p style={{ color: "#2a7a2a", fontSize: "0.82rem", marginTop: "0.5rem" }}>
                  ✓ Avatar uploaded — live in ~1–2 min.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Social Links ──────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.3rem" }}>
          Social Profiles
        </div>
        <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.9rem" }}>
          Paste a profile URL — the platform icon is detected automatically and shown on the site next to your name.
          Supported: LinkedIn, X, Instagram, Facebook, YouTube, GitHub, Threads.
        </p>

        {socialLinks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {socialLinks.map((link, i) => {
              const platform = detectPlatform(link.url);
              const cfg = PLATFORMS[platform] || PLATFORMS.link;
              return (
                <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>

                  {/* Icon preview */}
                  <div style={{
                    width: 36, height: 36, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#F4F5F7", border: `1px solid ${LINE}`,
                    color: link.url ? cfg.color : "#ccc",
                  }}>
                    <span style={{ display: "inline-flex", width: 18, height: 18 }}>
                      {cfg.icon}
                    </span>
                  </div>

                  {/* Platform label */}
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 700, color: link.url ? INK : INK_60,
                    width: 76, flexShrink: 0,
                  }}>
                    {link.url ? cfg.label : "—"}
                  </span>

                  {/* URL input */}
                  <input
                    type="url"
                    value={link.url}
                    onChange={e => updateSocialLink(i, e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                    style={{ ...inputStyle, marginTop: 0, flex: 1 }}
                  />

                  {/* Reorder + delete */}
                  <button onClick={() => moveSocialLink(i, -1)} disabled={i === 0}                       style={iconBtnStyle(i === 0)}                       aria-label="Move up" title="Move up">↑</button>
                  <button onClick={() => moveSocialLink(i, 1)}  disabled={i === socialLinks.length - 1}  style={iconBtnStyle(i === socialLinks.length - 1)}  aria-label="Move down" title="Move down">↓</button>
                  <button onClick={() => deleteSocialLink(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }} aria-label="Remove" title="Remove">×</button>
                </div>
              );
            })}
          </div>
        )}

        {socialLinks.length === 0 && (
          <p style={{ fontSize: "0.82rem", color: INK_60, fontStyle: "italic", marginBottom: "0.75rem" }}>
            No social links yet.
          </p>
        )}

        <button onClick={addSocialLink} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.55rem 1rem", fontWeight: 700,
        }}>
          + Add social link
        </button>
      </div>

      {/* Tagline */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.8rem" }}>
          Tagline
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem 1rem" }} className="bio-tagline-grid">
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Before accent
            <input
              type="text"
              value={bio.tagline_before || ""}
              onChange={e => onChangeBio("tagline_before", e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600 }}>
            Accent (neon italic on page)
            <input
              type="text"
              value={bio.tagline_accent || ""}
              onChange={e => onChangeBio("tagline_accent", e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", fontSize: "0.78rem", color: INK_60, fontWeight: 600, gridColumn: "1 / -1" }}>
            After accent
            <textarea
              value={bio.tagline_after || ""}
              onChange={e => onChangeBio("tagline_after", e.target.value)}
              rows={2}
              style={inputStyle}
            />
          </label>
        </div>
        <p style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: INK_60 }}>
          Preview: <em>{bio.tagline_before} <strong style={{ color: NEON }}>{bio.tagline_accent}</strong> {bio.tagline_after}</em>
        </p>
      </div>

      {/* Paragraphs */}
      <p style={{ fontSize: "0.8rem", color: INK_60, marginBottom: "0.75rem" }}>
        Bio paragraphs ({paragraphs.length}) — rendered in order on the home page.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2.5rem" }}>
        {paragraphs.map((para, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: INK_60 }}>
                Paragraph {i + 1}
              </div>
              <button onClick={() => moveParagraph(i, -1)} disabled={i === 0}                    style={iconBtnStyle(i === 0)}                    aria-label="Move up" title="Move up">↑</button>
              <button onClick={() => moveParagraph(i, 1)}  disabled={i === paragraphs.length - 1} style={iconBtnStyle(i === paragraphs.length - 1)} aria-label="Move down" title="Move down">↓</button>
              <button onClick={() => deleteParagraph(i)}   style={{ ...iconBtnStyle(false), color: "#c44" }}             aria-label="Delete" title="Delete">×</button>
            </div>
            <textarea
              value={para}
              onChange={e => updateParagraph(i, e.target.value)}
              rows={4}
              placeholder="Enter paragraph text…"
              style={inputStyle}
            />
          </div>
        ))}
        {paragraphs.length === 0 && (
          <div style={{ padding: "2rem", background: "#fff", border: `1px dashed ${LINE}`, color: INK_60, textAlign: "center" }}>
            No paragraphs yet.
          </div>
        )}
        <button onClick={addParagraph} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "1rem", fontWeight: 700,
        }}>
          + Add paragraph
        </button>
      </div>

      {/* ── "As Seen In" Logos ─────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "1.2rem", marginBottom: "2.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: INK_60, marginBottom: "0.35rem" }}>
          "As Seen In" Logos
        </div>
        <p style={{ fontSize: "0.78rem", color: INK_60, marginBottom: "0.9rem" }}>
          Logos appear as grayscale images in the Team section. Paste any public image URL or use the Pick button to select from the library. Name is used for accessibility only.
        </p>

        {logos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "0.75rem" }}>
            {logos.map((logo, i) => (
              <LogoRow
                key={i}
                logo={logo}
                index={i}
                total={logos.length}
                onUpdateName={val => updateLogo(i, "name", val)}
                onUpdateUrl={val => updateLogo(i, "url", val)}
                onMoveUp={() => moveLogo(i, -1)}
                onMoveDown={() => moveLogo(i, 1)}
                onDelete={() => deleteLogo(i)}
              />
            ))}
          </div>
        )}

        {logos.length === 0 && (
          <p style={{ fontSize: "0.82rem", color: INK_60, fontStyle: "italic", marginBottom: "0.75rem" }}>
            No logos yet — add one below.
          </p>
        )}

        <button onClick={addLogo} style={{
          ...btnStyle,
          background: "transparent", border: `1px dashed ${LINE}`,
          color: INK, padding: "0.55rem 1rem", fontWeight: 700,
        }}>
          + Add logo
        </button>
      </div>

      <style>{`
        @media (max-width: 540px) {
          .bio-tagline-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── LogoRow — one "As Seen In" logo with AssetPicker ────────────────────── */
function LogoRow({ logo, index, total, onUpdateName, onUpdateUrl, onMoveUp, onMoveDown, onDelete }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      {/* Live preview */}
      <div style={{
        width: 64, height: 40, flexShrink: 0,
        background: "#F4F5F7", border: `1px solid ${LINE}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {logo.url ? (
          <img
            src={logo.url}
            alt={logo.name || "preview"}
            style={{ maxWidth: 60, maxHeight: 36, objectFit: "contain", filter: "grayscale(1)", opacity: 0.55 }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <span style={{ fontSize: "0.62rem", color: INK_60 }}>no url</span>
        )}
      </div>

      {/* Name */}
      <input
        type="text"
        value={logo.name}
        onChange={e => onUpdateName(e.target.value)}
        placeholder="Name (e.g. Bloomberg)"
        style={{ ...inputStyle, marginTop: 0, width: 150, flexShrink: 0 }}
      />

      {/* URL */}
      <input
        type="text"
        value={logo.url}
        onChange={e => onUpdateUrl(e.target.value)}
        placeholder="https://… or pick →"
        style={{ ...inputStyle, marginTop: 0, flex: 1, minWidth: 160 }}
      />

      {/* Pick button */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        style={{ ...btnStyle, fontSize: "0.78rem", padding: "0.45rem 0.75rem", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        Pick
      </button>

      {/* Clear */}
      {logo.url && (
        <button
          type="button"
          onClick={() => onUpdateUrl("")}
          style={{ ...iconBtnStyle(false) }}
          title="Clear URL"
        >×</button>
      )}

      {/* Reorder + delete */}
      <button onClick={onMoveUp}   disabled={index === 0}         style={iconBtnStyle(index === 0)}         aria-label="Move up" title="Move up">↑</button>
      <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtnStyle(index === total - 1)} aria-label="Move down" title="Move down">↓</button>
      <button onClick={onDelete}   style={{ ...iconBtnStyle(false), color: "#c44" }} aria-label="Remove" title="Remove">×</button>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => { onUpdateUrl(url); if (!logo.name) { const n = url.split("/").pop().replace(/\.[^.]+$/, ""); onUpdateName(n); } setPickerOpen(false); }}
        defaultType="logo"
        defaultCompany={logo.name || null}
        acceptTypes={["logo", "image"]}
        title="Pick a media logo"
      />
    </div>
  );
}
