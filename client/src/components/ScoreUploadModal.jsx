import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { computeRound } from '../stableford';

// Score screenshot → LLM extracts strokes → user tweaks → confirm.

const SERVER_URL = import.meta.env.VITE_SERVER_URL
    || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

const MAX_IMAGES = 6;

export default function ScoreUploadModal({ course, tournamentId, roundId, title, onConfirm, onClose }) {
    const { idToken, player } = useAuth();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [extraction, setExtraction] = useState(null);
    const [strokes, setStrokes] = useState(() => {
        const o = {};
        for (let h = 1; h <= 18; h++) o[h] = '';
        return o;
    });
    const [teeId, setTeeId] = useState(() => {
        const tees = (course?.tees || []).filter(t => !t.closed);
        return tees[0]?.id || '';
    });

    // Refs to each hole input so we can auto-focus the next one on entry.
    const inputRefs = useRef({});

    const playerHcp = typeof player?.hcp === 'number' ? player.hcp : 54;

    const selectedTee = useMemo(
        () => course?.tees?.find(t => t.id === teeId) || null,
        [course, teeId]
    );

    const preview = useMemo(() => {
        const numericStrokes = {};
        for (let h = 1; h <= 18; h++) {
            const v = parseInt(strokes[h], 10);
            if (!isNaN(v) && v > 0) numericStrokes[h] = v;
        }
        return computeRound({ strokes: numericStrokes, course, tee: selectedTee, playerHcp });
    }, [strokes, course, selectedTee, playerHcp]);

    const allHolesFilled = useMemo(() => {
        for (let h = 1; h <= 18; h++) {
            const v = parseInt(strokes[h], 10);
            if (isNaN(v) || v <= 0) return false;
        }
        return true;
    }, [strokes]);

    const handleFiles = (fileList) => {
        const files = Array.from(fileList || []).slice(0, MAX_IMAGES - images.length);
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
                if (!match) return;
                const [, mediaType, data] = match;
                setImages(prev => [...prev, { name: file.name, dataUrl, mediaType, data }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

    const runExtraction = async () => {
        setLoading(true);
        setError(null);
        setExtraction(null);
        try {
            const res = await fetch(`${SERVER_URL}/api/extract-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    tournamentId,
                    roundId,
                    images: images.map(({ mediaType, data }) => ({ mediaType, data })),
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);

            setExtraction(payload);
            const next = {};
            for (let h = 1; h <= 18; h++) {
                const v = payload.strokes?.[h] ?? payload.strokes?.[String(h)];
                next[h] = v == null ? '' : String(v);
            }
            setStrokes(next);
            if (payload.teeColor && course?.tees) {
                const match = course.tees.find(t =>
                    t.color === payload.teeColor
                    && (!payload.gender || t.gender === payload.gender)
                    && !t.closed
                );
                if (match) setTeeId(match.id);
            }
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStrokeChange = (h, raw) => {
        const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
        setStrokes(prev => ({ ...prev, [h]: digits }));
        // Auto-advance to next hole when the user types a single digit that
        // can't be extended to a valid score (i.e. anything >= 2, since you
        // can't score a 10+ without a leading 1). Players can still go back
        // to fix with shift-tab/click.
        if (digits.length === 1 && parseInt(digits, 10) >= 2 && h < 18) {
            const next = inputRefs.current[h + 1];
            if (next) setTimeout(() => next.focus(), 0);
        }
        if (digits.length === 2 && h < 18) {
            const next = inputRefs.current[h + 1];
            if (next) setTimeout(() => next.focus(), 0);
        }
    };

    const handleSubmit = () => {
        if (!selectedTee) { setError('Pick a tee first'); return; }
        const numericStrokes = {};
        let anyEntered = false;
        for (let h = 1; h <= 18; h++) {
            const v = parseInt(strokes[h], 10);
            if (!isNaN(v) && v > 0) {
                numericStrokes[h] = v;
                anyEntered = true;
            }
        }
        if (!anyEntered) { setError('Enter strokes for at least one hole'); return; }
        onConfirm({ strokes: numericStrokes, teeId: selectedTee.id });
    };

    const confidenceColor = (c) => {
        if (c == null) return '#64748b';
        if (c >= 0.85) return '#22c55e';
        if (c >= 0.6) return '#f59e0b';
        return '#ef4444';
    };

    const holes = course?.holes || [];
    const frontNine = holes.slice(0, 9);
    const backNine = holes.slice(9, 18);

    // "Weiß · Men" — no CR/Slope bloat in the label anymore
    const teeOptions = (course?.tees || [])
        .filter(t => !t.closed)
        .map(t => ({
            id: t.id,
            label: `${t.label} · ${t.gender === 'ladies' ? 'Ladies' : 'Men'}`,
        }));

    return (
        <div className="modal-scrim" onClick={onClose}>
            <div
                className="modal-dialog upload-modal"
                onClick={e => e.stopPropagation()}
            >
                <button
                    className="upload-modal__close"
                    onClick={onClose}
                    aria-label="Close"
                    title="Close"
                >✕</button>

                <h2 className="upload-modal__title">📤 Upload Score</h2>
                {title && <div className="upload-modal__subtitle">{title}</div>}

                {/* Tee + Screenshots — side by side on wide screens */}
                <div className="upload-modal__twocol">
                    <div className="field">
                        <label>Tee</label>
                        <select value={teeId} onChange={e => setTeeId(e.target.value)}>
                            {teeOptions.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                        <div className="u-muted" style={{ fontSize: 'var(--fz-xs)' }}>
                            Your HCP: <strong>{playerHcp}</strong>
                        </div>
                    </div>

                    <div className="field">
                        <label>Screenshots ({images.length}/{MAX_IMAGES})</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={images.length >= MAX_IMAGES || loading}
                            onChange={e => handleFiles(e.target.files)}
                        />
                        {images.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                {images.map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: 60, height: 80, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-sunken)' }}>
                                        <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            style={{
                                                position: 'absolute', top: 2, right: 2,
                                                background: 'rgba(0,0,0,0.8)', color: 'white',
                                                border: 'none', borderRadius: '50%',
                                                width: 20, height: 20, cursor: 'pointer',
                                                fontSize: '0.75rem', lineHeight: 1,
                                            }}
                                            title="Remove"
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={runExtraction}
                    disabled={images.length === 0 || loading}
                    className="btn btn--violet btn--block"
                    style={{ marginBottom: 'var(--s-4)' }}
                >
                    {loading ? '⏳ Reading scorecard…' : extraction ? '↻ Re-extract from images' : '🔍 Extract strokes from images'}
                </button>

                {error && (
                    <div className="card pill--danger" style={{ padding: '0.75rem 1rem', marginBottom: 'var(--s-3)' }}>
                        ⚠️ {error}
                    </div>
                )}

                {extraction && (
                    <div
                        className="card card--sunken"
                        style={{
                            padding: '0.6rem 0.9rem', marginBottom: 'var(--s-4)',
                            borderLeft: `4px solid ${confidenceColor(extraction.confidence)}`,
                        }}
                    >
                        <div style={{ fontSize: 'var(--fz-sm)', fontWeight: 700, color: confidenceColor(extraction.confidence) }}>
                            Extraction confidence: {Math.round((extraction.confidence || 0) * 100)}%
                        </div>
                        {extraction.rationale && (
                            <div className="u-muted" style={{ fontSize: 'var(--fz-xs)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                                {extraction.rationale}
                            </div>
                        )}
                    </div>
                )}

                {/* Hole grid */}
                <div className="hole-grid">
                    <div className="hole-grid__label">Strokes per hole</div>
                    <HoleGrid holes={frontNine} strokes={strokes} onChange={handleStrokeChange} preview={preview} inputRefs={inputRefs} />
                    <HoleGrid holes={backNine} strokes={strokes} onChange={handleStrokeChange} preview={preview} inputRefs={inputRefs} />
                </div>

                {/* Totals — netto centered + huge, brutto smaller below in parens */}
                <div className="upload-modal__totals">
                    <div className="netto-label">Netto</div>
                    <div className="netto-value">{preview.netto}</div>
                    <div className="brutto-note">
                        (Brutto <strong>{preview.brutto}</strong>)
                    </div>
                </div>

                <div className="upload-modal__actions">
                    <button
                        onClick={handleSubmit}
                        className={`btn ${allHolesFilled ? 'btn--submit-ready' : 'btn--primary'}`}
                    >
                        ✓ Submit scores
                    </button>
                    <button onClick={onClose} className="btn btn--ghost">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function HoleGrid({ holes, strokes, onChange, preview, inputRefs }) {
    return (
        <div style={{ overflowX: 'auto', marginBottom: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr style={{ color: 'var(--text-3)' }}>
                        <th className="t-left" style={{ textAlign: 'left', padding: '0.25rem' }}>Hole</th>
                        {holes.map(h => (
                            <th key={h.number} style={{ padding: '0.25rem', minWidth: 40 }}>{h.number}</th>
                        ))}
                    </tr>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        <td style={{ padding: '0.15rem' }}>Par</td>
                        {holes.map(h => (
                            <td key={h.number} style={{ textAlign: 'center', padding: '0.15rem' }}>
                                {h.par}
                            </td>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ padding: '0.25rem', fontWeight: 'bold' }}>Strokes</td>
                        {holes.map(h => (
                            <td key={h.number} style={{ padding: '0.15rem' }}>
                                <input
                                    ref={el => { inputRefs.current[h.number] = el; }}
                                    value={strokes[h.number]}
                                    onChange={e => onChange(h.number, e.target.value)}
                                    inputMode="numeric"
                                />
                            </td>
                        ))}
                    </tr>
                    <tr style={{ color: 'var(--accent-amber-soft)', fontSize: '0.7rem' }}>
                        <td style={{ padding: '0.15rem' }}>Pts</td>
                        {holes.map(h => (
                            <td key={h.number} style={{ textAlign: 'center', padding: '0.15rem' }}>
                                {preview.nettoPerHole?.[h.number] ?? 0}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
