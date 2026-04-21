// Load .env for local dev (ignored in Docker where env is provided directly).
// Pin the path to this file's directory so it works regardless of cwd.
// `override: true` so the file always wins — we hit a gotcha where a stale
// empty ANTHROPIC_API_KEY in the Windows user env silently suppressed our
// real key in .env (dotenv's default is to respect pre-existing env vars).
require('dotenv').config({
    path: require('path').join(__dirname, '.env'),
    override: true,
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const game = require('./game');
const { socketAuthMiddleware, verifyToken } = require('./auth');
const { extractScore } = require('./scoreExtraction');

// DATA_DIR: where data.json and archive/ live. On fly.io this points at the
// mounted volume (/data). Locally it defaults to the server/ folder so dev
// behaviour is unchanged.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

const app = express();
app.use(cors());
// Score extraction sends 1–6 screenshots as base64; raise the limit well
// above the 2 MB we needed for team logos. Phones produce ~500 KB-2 MB PNGs.
app.use(express.json({ limit: '30mb' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Tablet/mobile-friendly keepalive settings:
    // tablets going to sleep can take 30-60s to reconnect, default 20s timeout is too aggressive.
    pingInterval: 25000,
    pingTimeout: 60000,
});

// Authenticate every socket connection via Google ID token (if provided).
// Anonymous connections are allowed but socket.user stays null, so any
// auth-required handler will reject them.
io.use(socketAuthMiddleware);

// API Routes
app.get('/api/state', (req, res) => {
    res.json(game.getGameState());
});

// Note: /api/set-course and /api/reset-game used to live here as unauthenticated
// REST endpoints. They've moved to authenticated socket events (setCourse,
// resetGame) so only admins can mutate game-wide state.

// ── Score extraction via Claude vision ──────────────────────────────────────
// POST /api/extract-score
//   Authorization: Bearer <googleIdToken>
//   Body: { tournamentId, roundId, images: [{mediaType, data}] }
//   Returns the extracted { brutto, netto, confidence, rationale } WITHOUT
//   committing. The client confirms and then posts via socket submitScore.
//
// We auth via HTTP Bearer here because the file payload is too big for a
// socket.io emit to be comfortable, and because HTTP gives us proper error
// codes + retry semantics from the frontend.

const extractRateLimit = new Map(); // sub -> [timestamps]
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10; // 10 extractions per minute per user

function checkExtractRate(sub) {
    const now = Date.now();
    const arr = (extractRateLimit.get(sub) || []).filter(t => now - t < RATE_WINDOW_MS);
    if (arr.length >= RATE_MAX) return false;
    arr.push(now);
    extractRateLimit.set(sub, arr);
    return true;
}

app.post('/api/extract-score', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ error: 'Missing bearer token' });

        let user;
        try {
            user = await verifyToken(token);
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Must be approved player (or admin) to extract.
        const player = game.getPlayer(user.sub);
        const approved = !!(player && (player.approved || user.isAdmin));
        if (!approved) return res.status(403).json({ error: 'Not approved' });

        if (!checkExtractRate(user.sub)) {
            return res.status(429).json({ error: 'Rate limit exceeded, try again in a minute' });
        }

        const { tournamentId, roundId, images } = req.body || {};

        // Validate tournament/round to give helpful context to the model.
        const tournament = game.getTournament(tournamentId);
        if (!tournament || tournament.status !== 'active') {
            return res.status(400).json({ error: 'Tournament not found or not active' });
        }
        const round = tournament.rounds.find(r => r.id === roundId);
        if (!round) return res.status(400).json({ error: 'Round not found' });
        if (round.status !== 'open' && !user.isAdmin) {
            return res.status(400).json({ error: 'Round is closed for uploads' });
        }

        const courseObj = game.COURSES[round.courseId];
        const playerHcp = typeof player?.hcp === 'number' ? player.hcp : null;

        console.log(`[extract] ${user.email} uploading ${images?.length || 0} image(s) for ${tournament.title} / ${courseObj?.name}`);
        const result = await extractScore({
            images: images || [],
            playerHcp,
            courseName: courseObj?.name || null,
            par: courseObj?.par || null,
        });

        res.json(result);
    } catch (e) {
        const status = e.status || 500;
        console.error('[extract] error:', e.message);
        res.status(status).json({ error: e.message });
    }
});

app.get('/api/archives', (req, res) => {
    if (!fs.existsSync(ARCHIVE_DIR)) {
        return res.json([]);
    }

    const files = fs.readdirSync(ARCHIVE_DIR)
        .filter(f => (f.startsWith('round-') || f.match(/^[a-z]+-\d{4}-/)) && f.endsWith('.json'))
        .map(f => {
            try {
                const filePath = path.join(ARCHIVE_DIR, f);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (content.metadata && content.summary) {
                    return {
                        filename: f,
                        metadata: content.metadata,
                        summary: content.summary
                    };
                }
                return null;
            } catch (error) {
                console.error(`Error reading archive ${f}:`, error);
                return null;
            }
        })
        .filter(item => item !== null)
        .sort((a, b) => new Date(b.metadata.archivedAt) - new Date(a.metadata.archivedAt));

    res.json(files);
});

app.get('/api/archives/:filename', (req, res) => {
    // Guard against path traversal: only allow plain filenames
    const filename = req.params.filename;
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(ARCHIVE_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archive not found' });
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(content);
});

// ── Serve built client (production) ────────────────────────────────────────
// The Dockerfile copies the client build to /app/client/dist, which is one
// level up from this file (/app/server/index.js → /app/client/dist).
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    // SPA fallback: any non-API route returns index.html so React Router / state works
    app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
            return next();
        }
        res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
}

// Push a fresh authUpdate to every live socket that belongs to `sub`.
// Used when the GM flips approval for a user who's currently connected.
function pushAuthUpdateTo(sub) {
    const me = game.getPlayer(sub);
    if (!me) return;
    for (const s of io.of('/').sockets.values()) {
        if (s.user && s.user.sub === sub) {
            s.emit('authUpdate', {
                sub: s.user.sub,
                email: s.user.email,
                isAdmin: s.user.isAdmin,
                approved: !!me.approved,
                hasProfile: me.hcp !== null,
                player: me,
            });
        }
    }
}

// Permission helpers — every write handler checks these before mutating state.
const requireAuth = (socket) => !!socket.user;
const requireAdmin = (socket) => !!(socket.user && socket.user.isAdmin);
const requireApproved = (socket) => {
    if (!socket.user) return false;
    const player = game.getPlayer(socket.user.sub);
    return !!(player && (player.approved || socket.user.isAdmin));
};

io.on('connection', (socket) => {
    const who = socket.user ? `${socket.user.email}${socket.user.isAdmin ? ' [admin]' : ''}` : 'anonymous';
    console.log(`Socket connected (${who}):`, socket.id);

    // If authenticated, ensure a player record exists (upsert). This is what
    // creates the initial "pending approval" player on first sign-in.
    if (socket.user) {
        game.upsertPlayerOnSignIn(socket.user);
    }

    // Send initial state (also fires on every reconnect).
    // Include `me` so the client knows who they are + their approval status.
    const sendState = () => {
        socket.emit('stateUpdate', game.getGameState());
        if (socket.user) {
            const me = game.getPlayer(socket.user.sub);
            socket.emit('authUpdate', {
                sub: socket.user.sub,
                email: socket.user.email,
                isAdmin: socket.user.isAdmin,
                approved: !!(me && me.approved),
                hasProfile: !!(me && me.hcp !== null),
                player: me,
            });
        } else {
            socket.emit('authUpdate', null);
        }
    };
    sendState();

    socket.on('requestState', sendState);

    // ── Scramble actions (approved players or admin) ─────────────────────
    // These are tablet-oriented interactions. Once a team is chosen on a
    // shared tablet, we don't gate individual score entries per-user —
    // the team identity is carried by the tablet, not the user.
    // We do gate updateTeam/updateScore behind approval so a random
    // signed-in user can't write scores.

    socket.on('updateTeam', ({ teamId, name, logo }) => {
        if (!requireApproved(socket)) return;
        console.log(`Update Team: ${teamId} -> ${name} by ${socket.user.email}`);
        if (game.updateTeam(teamId, name, logo)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('updateScore', ({ teamId, holeNumber, score }) => {
        if (!requireApproved(socket)) return;
        console.log(`Score update: T${teamId} H${holeNumber} -> ${score} by ${socket.user.email}`);
        if (game.updateScore(teamId, holeNumber, score)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    // ── Admin-only (Game Master) ─────────────────────────────────────────

    socket.on('setTeamCount', (count) => {
        if (!requireAdmin(socket)) return;
        console.log(`Set team count: ${count} by ${socket.user.email}`);
        if (game.setTeamCount(count)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('setPlayerApproval', ({ sub, approved }) => {
        if (!requireAdmin(socket)) return;
        console.log(`Set approval ${sub} -> ${approved} by ${socket.user.email}`);
        if (game.setPlayerApproval(sub, approved)) {
            io.emit('stateUpdate', game.getGameState());
            // Push a fresh authUpdate to the target user's sockets so their
            // UI flips (Join Game unlocks / locks) without requiring a reload.
            pushAuthUpdateTo(sub);
        }
    });

    socket.on('deletePlayer', (sub) => {
        if (!requireAdmin(socket)) return;
        console.log(`Delete player ${sub} by ${socket.user.email}`);
        if (game.deletePlayer(sub)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('resetGame', () => {
        if (!requireAdmin(socket)) return;
        console.log('Reset Game requested by', socket.user.email);
        const newState = game.resetGame();
        io.emit('stateUpdate', newState);
        io.emit('notification', { message: '🔄 Game has been RESET!', type: 'warning' });
    });

    socket.on('setCourse', (courseId) => {
        if (!requireAdmin(socket)) return;
        console.log(`Set course: ${courseId} by ${socket.user.email}`);
        if (game.setCourse(courseId)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('updateScrambleMeta', ({ title, rules }) => {
        if (!requireAdmin(socket)) return;
        game.updateScrambleMeta({ title, rules });
        io.emit('stateUpdate', game.getGameState());
    });

    // ── Tournament: admin-only structural operations ─────────────────────

    socket.on('createTournament', ({ title, rules } = {}) => {
        if (!requireAdmin(socket)) return;
        const t = game.createTournament({ title, rules });
        console.log(`Tournament created: ${t.title} (${t.id}) by ${socket.user.email}`);
        io.emit('stateUpdate', game.getGameState());
    });

    socket.on('updateTournament', ({ id, patch } = {}) => {
        if (!requireAdmin(socket)) return;
        if (game.updateTournament(id, patch || {})) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('deleteTournament', (id) => {
        if (!requireAdmin(socket)) return;
        if (game.deleteTournament(id)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('addRound', ({ tournamentId, courseId, date } = {}) => {
        if (!requireAdmin(socket)) return;
        if (game.addRound(tournamentId, { courseId, date })) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('removeRound', ({ tournamentId, roundId } = {}) => {
        if (!requireAdmin(socket)) return;
        if (game.removeRound(tournamentId, roundId)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('setRoundStatus', ({ tournamentId, roundId, status } = {}) => {
        if (!requireAdmin(socket)) return;
        if (game.setRoundStatus(tournamentId, roundId, status)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    // ── Tournament: scoring ──────────────────────────────────────────────
    // Admin can set any player's score. Players can submit their own score,
    // but only while the round is open and the tournament active.

    socket.on('setScore', ({ tournamentId, roundId, playerSub, brutto, netto, strokes, teeId } = {}) => {
        if (!requireAdmin(socket)) return;
        if (game.setScore(tournamentId, roundId, playerSub, { brutto, netto, strokes, teeId }, socket.user.email)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('clearScore', ({ tournamentId, roundId, playerSub } = {}) => {
        if (!requireAdmin(socket)) return;
        if (game.clearScore(tournamentId, roundId, playerSub)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('submitScore', ({ tournamentId, roundId, brutto, netto, strokes, teeId } = {}) => {
        if (!requireApproved(socket)) return;
        const t = game.getTournament(tournamentId);
        if (!t || t.status !== 'active') return;
        const r = t.rounds.find(r => r.id === roundId);
        if (!r || r.status !== 'open') return;
        if (game.setScore(tournamentId, roundId, socket.user.sub, { brutto, netto, strokes, teeId }, socket.user.email)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    // ── Self-service (authenticated user editing own profile) ────────────

    socket.on('updatePlayer', ({ sub, name, logo, hcp }) => {
        if (!requireAuth(socket)) return;
        // Users can only edit their own profile; admins can edit HCP for anyone.
        const targetSub = sub || socket.user.sub;
        const isSelf = targetSub === socket.user.sub;
        if (!isSelf && !socket.user.isAdmin) return;

        // Non-admin: refuse to accept approval-toggling via this endpoint.
        // (Separate setPlayerApproval handler handles that.)
        console.log(`Update player ${targetSub} by ${socket.user.email}${isSelf ? ' (self)' : ''}`);
        if (game.updatePlayer(targetSub, { name, logo, hcp })) {
            io.emit('stateUpdate', game.getGameState());
            // If the user just edited themselves, re-send authUpdate so
            // `hasProfile` / `player` refresh on their socket immediately.
            if (isSelf) {
                const me = game.getPlayer(socket.user.sub);
                socket.emit('authUpdate', {
                    sub: socket.user.sub,
                    email: socket.user.email,
                    isAdmin: socket.user.isAdmin,
                    approved: !!(me && me.approved),
                    hasProfile: !!(me && me.hcp !== null),
                    player: me,
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected (${who}):`, socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
