const fs = require('fs');
const path = require('path');
const stableford = require('./stableford');

// DATA_DIR: location of data.json and archive/. On fly.io this is /data
// (mounted volume). Locally defaults to this server/ folder.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Team presets by count. Colors are kept stable across sizes so Team 1 is always red,
// Team 2 always blue, etc. — simplifies muscle memory across rounds.
const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const VALID_TEAM_COUNTS = [2, 3, 4];
const DEFAULT_TEAM_COUNT = 3;

function buildTeams(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        logo: null,
        color: TEAM_COLORS[i],
        scores: {},
        currentHole: 1,
    }));
}

const INITIAL_TEAMS = buildTeams(DEFAULT_TEAM_COUNT);

// ── Course definitions ──────────────────────────────────────────────────────
// Each course has:
//   - par (total men+ladies par; always identical for these three courses)
//   - tees[]: playable tee options, each with CR + Slope for either men or ladies
//   - holes[]: per-hole par + stroke index (separate SI for men vs ladies)
//
// Stroke indexes come from the 2024 Golfresort Haugschlag + Monachus scorecards.
// Tee ids are `<color>-<gender>` because Monachus has yellow/blue/red for BOTH
// men and ladies (with different CR/Slope), so plain colors aren't unique.
//
// The `image` fields are kept for backwards compat with the scramble MainView.

const COURSES = {
    waldviertel: {
        id: 'waldviertel',
        name: 'Course Waldviertel',
        par: 72,
        tees: [
            { id: 'white-men',    label: 'Weiß',    color: 'white',  gender: 'men',    cr: 73.1, slope: 128 },
            { id: 'yellow-men',   label: 'Gelb',    color: 'yellow', gender: 'men',    cr: 71.7, slope: 124 },
            { id: 'blue-men',     label: 'Blau',    color: 'blue',   gender: 'men',    cr: 69.6, slope: 120 },
            { id: 'black-ladies', label: 'Schwarz', color: 'black',  gender: 'ladies', cr: 75.9, slope: 132 },
            { id: 'red-ladies',   label: 'Rot',     color: 'red',    gender: 'ladies', cr: 73.7, slope: 125 },
            { id: 'orange-ladies',label: 'Orange',  color: 'orange', gender: 'ladies', cr: 71.9, slope: 121 },
        ],
        holes: [
            { number: 1,  par: 4, siMen: 3,  siLadies: 9,  image: '/images/waldviertel/hole1.jpg' },
            { number: 2,  par: 5, siMen: 5,  siLadies: 3,  image: '/images/waldviertel/hole2.jpg' },
            { number: 3,  par: 4, siMen: 7,  siLadies: 5,  image: '/images/waldviertel/hole3.jpg' },
            { number: 4,  par: 3, siMen: 13, siLadies: 13, image: '/images/waldviertel/hole4.jpg' },
            { number: 5,  par: 4, siMen: 11, siLadies: 11, image: '/images/waldviertel/hole5.jpg' },
            { number: 6,  par: 4, siMen: 9,  siLadies: 7,  image: '/images/waldviertel/hole6.jpg' },
            { number: 7,  par: 5, siMen: 1,  siLadies: 1,  image: '/images/waldviertel/hole7.jpg' },
            { number: 8,  par: 3, siMen: 17, siLadies: 17, image: '/images/waldviertel/hole8.jpg' },
            { number: 9,  par: 4, siMen: 15, siLadies: 15, image: '/images/waldviertel/hole9.jpg' },
            { number: 10, par: 5, siMen: 12, siLadies: 14, image: '/images/waldviertel/hole10.jpg' },
            { number: 11, par: 4, siMen: 10, siLadies: 10, image: '/images/waldviertel/hole11.jpg' },
            { number: 12, par: 4, siMen: 4,  siLadies: 2,  image: '/images/waldviertel/hole12.jpg' },
            { number: 13, par: 3, siMen: 18, siLadies: 18, image: '/images/waldviertel/hole13.jpg' },
            { number: 14, par: 5, siMen: 8,  siLadies: 4,  image: '/images/waldviertel/hole14.jpg' },
            { number: 15, par: 4, siMen: 6,  siLadies: 6,  image: '/images/waldviertel/hole15.jpg' },
            { number: 16, par: 4, siMen: 14, siLadies: 12, image: '/images/waldviertel/hole16.jpg' },
            { number: 17, par: 4, siMen: 2,  siLadies: 8,  image: '/images/waldviertel/hole17.jpg' },
            { number: 18, par: 3, siMen: 16, siLadies: 16, image: '/images/waldviertel/hole18.jpg' },
        ],
    },
    haugschlag: {
        id: 'haugschlag',
        name: 'Course Haugschlag',
        par: 72,
        tees: [
            { id: 'white-men',    label: 'Weiß',    color: 'white',  gender: 'men',    cr: 72.5, slope: 122 },
            { id: 'yellow-men',   label: 'Gelb',    color: 'yellow', gender: 'men',    cr: 71.1, slope: 121 },
            { id: 'blue-men',     label: 'Blau',    color: 'blue',   gender: 'men',    cr: 69.5, slope: 117 },
            { id: 'black-ladies', label: 'Schwarz', color: 'black',  gender: 'ladies', cr: 74.7, slope: 125 },
            { id: 'red-ladies',   label: 'Rot',     color: 'red',    gender: 'ladies', cr: 72.7, slope: 121 },
            { id: 'orange-ladies',label: 'Orange',  color: 'orange', gender: 'ladies', cr: 70.7, slope: 118 },
        ],
        holes: [
            { number: 1,  par: 4, siMen: 11, siLadies: 13, image: '/images/haugschlag/hole1.jpg' },
            { number: 2,  par: 4, siMen: 1,  siLadies: 1,  image: '/images/haugschlag/hole2.jpg' },
            { number: 3,  par: 4, siMen: 9,  siLadies: 11, image: '/images/haugschlag/hole3.jpg' },
            { number: 4,  par: 3, siMen: 13, siLadies: 17, image: '/images/haugschlag/hole4.jpg' },
            { number: 5,  par: 4, siMen: 15, siLadies: 9,  image: '/images/haugschlag/hole5.jpg' },
            { number: 6,  par: 5, siMen: 5,  siLadies: 3,  image: '/images/haugschlag/hole6.jpg' },
            { number: 7,  par: 4, siMen: 3,  siLadies: 7,  image: '/images/haugschlag/hole7.jpg' },
            { number: 8,  par: 3, siMen: 17, siLadies: 15, image: '/images/haugschlag/hole8.jpg' },
            { number: 9,  par: 5, siMen: 7,  siLadies: 5,  image: '/images/haugschlag/hole9.jpg' },
            { number: 10, par: 4, siMen: 10, siLadies: 10, image: '/images/haugschlag/hole10.jpg' },
            { number: 11, par: 4, siMen: 8,  siLadies: 4,  image: '/images/haugschlag/hole11.jpg' },
            { number: 12, par: 4, siMen: 16, siLadies: 14, image: '/images/haugschlag/hole12.jpg' },
            { number: 13, par: 5, siMen: 14, siLadies: 12, image: '/images/haugschlag/hole13.jpg' },
            { number: 14, par: 4, siMen: 2,  siLadies: 2,  image: '/images/haugschlag/hole14.jpg' },
            { number: 15, par: 5, siMen: 6,  siLadies: 6,  image: '/images/haugschlag/hole15.jpg' },
            { number: 16, par: 3, siMen: 12, siLadies: 16, image: '/images/haugschlag/hole16.jpg' },
            { number: 17, par: 4, siMen: 4,  siLadies: 8,  image: '/images/haugschlag/hole17.jpg' },
            { number: 18, par: 3, siMen: 18, siLadies: 18, image: '/images/haugschlag/hole18.jpg' },
        ],
    },
    monachus: {
        id: 'monachus',
        name: 'Course Monachus',
        par: 73,
        tees: [
            // Black is a super-tournament tee — rated but closed for normal play.
            { id: 'black-men',    label: 'Schwarz (closed)', color: 'black',  gender: 'men',    cr: 76.1, slope: 142, closed: true },
            { id: 'white-men',    label: 'Weiß',   color: 'white',  gender: 'men',    cr: 74.2, slope: 137 },
            { id: 'yellow-men',   label: 'Gelb',   color: 'yellow', gender: 'men',    cr: 72.7, slope: 134 },
            { id: 'blue-men',     label: 'Blau',   color: 'blue',   gender: 'men',    cr: 70.9, slope: 129 },
            { id: 'red-men',      label: 'Rot',    color: 'red',    gender: 'men',    cr: 69.9, slope: 125 },
            { id: 'yellow-ladies',label: 'Gelb',   color: 'yellow', gender: 'ladies', cr: 79.5, slope: 147 },
            { id: 'blue-ladies',  label: 'Blau',   color: 'blue',   gender: 'ladies', cr: 77.4, slope: 142 },
            { id: 'red-ladies',   label: 'Rot',    color: 'red',    gender: 'ladies', cr: 75.7, slope: 138 },
        ],
        // SI for men and ladies identical on Monachus per scorecard.
        holes: [
            { number: 1,  par: 4, siMen: 10, siLadies: 10, image: '/images/monachus/hole1.jpg' },
            { number: 2,  par: 5, siMen: 6,  siLadies: 6,  image: '/images/monachus/hole2.jpg' },
            { number: 3,  par: 3, siMen: 16, siLadies: 16, image: '/images/monachus/hole3.jpg' },
            { number: 4,  par: 5, siMen: 14, siLadies: 14, image: '/images/monachus/hole4.jpg' },
            { number: 5,  par: 4, siMen: 2,  siLadies: 2,  image: '/images/monachus/hole5.jpg' },
            { number: 6,  par: 4, siMen: 18, siLadies: 18, image: '/images/monachus/hole6.jpg' },
            { number: 7,  par: 4, siMen: 8,  siLadies: 8,  image: '/images/monachus/hole7.jpg' },
            { number: 8,  par: 3, siMen: 4,  siLadies: 4,  image: '/images/monachus/hole8.jpg' },
            { number: 9,  par: 4, siMen: 12, siLadies: 12, image: '/images/monachus/hole9.jpg' },
            { number: 10, par: 3, siMen: 9,  siLadies: 9,  image: '/images/monachus/hole10.jpg' },
            { number: 11, par: 4, siMen: 5,  siLadies: 5,  image: '/images/monachus/hole11.jpg' },
            { number: 12, par: 5, siMen: 17, siLadies: 17, image: '/images/monachus/hole12.jpg' },
            { number: 13, par: 5, siMen: 1,  siLadies: 1,  image: '/images/monachus/hole13.jpg' },
            { number: 14, par: 4, siMen: 7,  siLadies: 7,  image: '/images/monachus/hole14.jpg' },
            { number: 15, par: 4, siMen: 15, siLadies: 15, image: '/images/monachus/hole15.jpg' },
            { number: 16, par: 3, siMen: 13, siLadies: 13, image: '/images/monachus/hole16.jpg' },
            { number: 17, par: 4, siMen: 3,  siLadies: 3,  image: '/images/monachus/hole17.jpg' },
            { number: 18, par: 5, siMen: 11, siLadies: 11, image: '/images/monachus/hole18.jpg' },
        ],
    },
};

let gameState = {
    teams: INITIAL_TEAMS,
    course: COURSES.waldviertel,
    players: [], // persistent roster across rounds (for HCP tournament)
    tournaments: [], // HCP stableford tournaments (multi-round)
    scrambleMeta: { title: 'Scramble', rules: '' }, // title + rules for the scramble
    log: []
};

// Load state from file if exists
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const loadedState = JSON.parse(data);

        // Normalize state: strip any legacy wheel/challenge/item fields, keep what we need
        gameState = {
            teams: (loadedState.teams || INITIAL_TEAMS).map(t => ({
                id: t.id,
                name: t.name,
                logo: t.logo || null,
                color: t.color,
                scores: t.scores || {},
                currentHole: t.currentHole || Math.max(1, Object.keys(t.scores || {}).length + 1)
            })),
            course: loadedState.course,
            // Players are keyed by Google `sub`. Drop any legacy records
            // (from pre-auth versions) that don't have a sub.
            players: Array.isArray(loadedState.players)
                ? loadedState.players.filter(p => p.sub).map(p => ({
                    sub: p.sub,
                    email: p.email || null,
                    name: p.name || 'Player',
                    logo: p.logo || null,
                    hcp: typeof p.hcp === 'number' ? p.hcp : null,
                    approved: !!p.approved,
                    createdAt: p.createdAt || new Date().toISOString(),
                    updatedAt: p.updatedAt || new Date().toISOString(),
                }))
                : [],
            tournaments: Array.isArray(loadedState.tournaments)
                ? loadedState.tournaments.map(normalizeTournament).filter(Boolean)
                : [],
            scrambleMeta: {
                title: loadedState.scrambleMeta?.title || 'Scramble',
                rules: loadedState.scrambleMeta?.rules || '',
            },
            log: Array.isArray(loadedState.log) ? loadedState.log : []
        };

        // Refresh course data from static definition (so par/hcp updates propagate)
        if (gameState.course && gameState.course.id && COURSES[gameState.course.id]) {
            console.log(`Refreshing data for course: ${gameState.course.name}`);
            gameState.course = COURSES[gameState.course.id];
        } else {
            gameState.course = COURSES.waldviertel;
        }

        saveState();
    } catch (e) {
        console.error("Failed to load data file", e);
    }
}

function saveState() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(gameState, null, 2));
}

function getGameState() {
    // Expose COURSES as a plain dict so the client can render tee pickers
    // and compute live stableford previews without a round-trip.
    return { ...gameState, courses: COURSES };
}

function setCourse(courseId) {
    if (COURSES[courseId]) {
        gameState.course = COURSES[courseId];
        gameState.log.push(`Course changed to ${gameState.course.name}`);
        saveState();
        return true;
    }
    return false;
}

function hasAnyScores() {
    return gameState.teams.some(t => Object.keys(t.scores || {}).length > 0);
}

function setTeamCount(count) {
    const n = parseInt(count);
    if (!VALID_TEAM_COUNTS.includes(n)) return false;
    if (hasAnyScores()) return false; // locked during active round
    if (n === gameState.teams.length) return true; // no-op

    // Preserve existing teams' names/logos up to min(old, new); fill the rest with defaults
    const existing = gameState.teams;
    gameState.teams = Array.from({ length: n }, (_, i) => {
        const prev = existing[i];
        return {
            id: i + 1,
            name: prev?.name || `Team ${i + 1}`,
            logo: prev?.logo || null,
            color: TEAM_COLORS[i],
            scores: {},
            currentHole: 1,
        };
    });
    gameState.log.push(`Team count changed to ${n}`);
    saveState();
    return true;
}

function updateTeam(id, name, logo) {
    const team = gameState.teams.find(t => t.id === parseInt(id));
    if (team) {
        if (name) team.name = name;
        if (logo) team.logo = logo;
        saveState();
        return true;
    }
    return false;
}

function updateScore(teamId, holeNumber, score) {
    const team = gameState.teams.find(t => t.id === parseInt(teamId));
    if (team) {
        team.scores[holeNumber] = parseInt(score);
        // Auto-advance to next hole
        if (holeNumber === team.currentHole && holeNumber < 18) {
            team.currentHole = holeNumber + 1;
        }
        saveState();
        return true;
    }
    return false;
}

// ── Players (HCP tournament roster, auth'd via Google) ───────────────────────
// Players are independent of teams and persist across rounds (including
// resetGame). Every player record is keyed by their Google `sub` (user ID),
// so the same person can open the app on phone + tablet and see one profile.
//
// Lifecycle:
//   1. User signs in with Google → `upsertPlayerOnSignIn` creates a stub
//      record (approved=false, hcp=null) on first visit.
//   2. User fills in HCP in the Player Profile screen → `updatePlayer`.
//   3. Game Master flips approved=true → `setPlayerApproval`.
//   4. Approved players can join a scramble team.

function clampHcp(hcp) {
    const n = parseFloat(hcp);
    if (isNaN(n)) return null;
    if (n < 0) return 0;
    if (n > 54) return 54;
    return Math.round(n * 10) / 10; // 1 decimal
}

function getPlayer(sub) {
    return gameState.players.find(p => p.sub === sub) || null;
}

function upsertPlayerOnSignIn(googleUser) {
    // googleUser = { sub, email, name, picture }
    let player = getPlayer(googleUser.sub);
    const now = new Date().toISOString();
    if (!player) {
        player = {
            sub: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name || googleUser.email,
            logo: googleUser.picture || null,
            hcp: null,
            approved: false,
            createdAt: now,
            updatedAt: now,
        };
        gameState.players.push(player);
        gameState.log.push(`Player signed in for the first time: ${player.email}`);
        saveState();
    } else {
        // Keep email in sync (users can theoretically change their primary
        // Google email, and it's useful for the admin to see the real one).
        // Don't overwrite name/logo — user may have customized them.
        if (player.email !== googleUser.email) {
            player.email = googleUser.email;
            player.updatedAt = now;
            saveState();
        }
    }
    return player;
}

function updatePlayer(sub, { name, logo, hcp }) {
    const player = getPlayer(sub);
    if (!player) return null;
    if (typeof name === 'string' && name.trim()) player.name = name.trim();
    if (logo !== undefined) player.logo = logo || null;
    const hcpChanged = hcp !== undefined && hcp !== null && hcp !== '';
    if (hcpChanged) {
        const clamped = clampHcp(hcp);
        if (clamped !== null) player.hcp = clamped;
    }
    player.updatedAt = new Date().toISOString();

    // Recompute all stored tournament results for this player so netto scores
    // reflect the updated HCP without requiring a new upload.
    if (hcpChanged) {
        for (const t of gameState.tournaments) {
            for (const r of t.rounds) {
                const result = r.results[sub];
                if (!result || !result.strokes || !result.teeId) continue;
                const course = COURSES[r.courseId];
                if (!course) continue;
                const tee = course.tees.find(te => te.id === result.teeId);
                if (!tee) continue;
                const { brutto, netto, courseHandicap, bruttoPerHole, nettoPerHole } =
                    stableford.computeRound({ strokes: result.strokes, course, tee, playerHcp: player.hcp });
                result.brutto = brutto;
                result.netto = netto;
                result.courseHandicap = courseHandicap;
                result.bruttoPerHole = bruttoPerHole;
                result.nettoPerHole = nettoPerHole;
                result.playerHcp = player.hcp;
            }
        }
    }

    saveState();
    return player;
}

function setPlayerApproval(sub, approved) {
    const player = getPlayer(sub);
    if (!player) return null;
    player.approved = !!approved;
    player.updatedAt = new Date().toISOString();
    gameState.log.push(`Player ${player.email} ${approved ? 'approved' : 'unapproved'}`);
    saveState();
    return player;
}

function deletePlayer(sub) {
    const before = gameState.players.length;
    gameState.players = gameState.players.filter(p => p.sub !== sub);
    if (gameState.players.length !== before) {
        saveState();
        return true;
    }
    return false;
}

// ── Tournaments (HCP stableford, multi-round) ───────────────────────────────
// A tournament has a title, rules text, and a list of rounds. Each round
// plays on one of the defined courses on a given date and collects a pair
// of stableford scores per player: brutto (HCP 0) and netto (player HCP).
// Both are integers in points where higher = better. Relative-to-leader
// ranking and totals are computed client-side on top of this raw data.

function genId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTournament(t) {
    if (!t || typeof t !== 'object') return null;
    return {
        id: t.id || genId('tnmt'),
        title: t.title || 'Tournament',
        rules: t.rules || '',
        status: t.status === 'completed' ? 'completed' : 'active',
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString(),
        rounds: Array.isArray(t.rounds)
            ? t.rounds.map(r => ({
                id: r.id || genId('rnd'),
                courseId: COURSES[r.courseId] ? r.courseId : 'waldviertel',
                date: r.date || new Date().toISOString().slice(0, 10),
                status: r.status === 'closed' ? 'closed' : 'open',
                results: r.results && typeof r.results === 'object' ? r.results : {},
            }))
            : [],
    };
}

function getTournament(id) {
    return gameState.tournaments.find(t => t.id === id) || null;
}

function createTournament({ title, rules }) {
    const t = normalizeTournament({ title: title || 'New Tournament', rules: rules || '' });
    gameState.tournaments.push(t);
    gameState.log.push(`Tournament "${t.title}" created`);
    saveState();
    return t;
}

function updateTournament(id, patch) {
    const t = getTournament(id);
    if (!t) return null;
    if (typeof patch.title === 'string' && patch.title.trim()) t.title = patch.title.trim();
    if (typeof patch.rules === 'string') t.rules = patch.rules;
    if (patch.status === 'active' || patch.status === 'completed') t.status = patch.status;
    t.updatedAt = new Date().toISOString();
    saveState();
    return t;
}

function deleteTournament(id) {
    const before = gameState.tournaments.length;
    gameState.tournaments = gameState.tournaments.filter(t => t.id !== id);
    if (gameState.tournaments.length !== before) {
        gameState.log.push(`Tournament ${id} deleted`);
        saveState();
        return true;
    }
    return false;
}

function addRound(tournamentId, { courseId, date }) {
    const t = getTournament(tournamentId);
    if (!t) return null;
    if (!COURSES[courseId]) return null;
    const round = {
        id: genId('rnd'),
        courseId,
        date: date || new Date().toISOString().slice(0, 10),
        status: 'open',
        results: {},
    };
    t.rounds.push(round);
    t.updatedAt = new Date().toISOString();
    saveState();
    return round;
}

function removeRound(tournamentId, roundId) {
    const t = getTournament(tournamentId);
    if (!t) return false;
    const before = t.rounds.length;
    t.rounds = t.rounds.filter(r => r.id !== roundId);
    if (t.rounds.length !== before) {
        t.updatedAt = new Date().toISOString();
        saveState();
        return true;
    }
    return false;
}

function setRoundStatus(tournamentId, roundId, status) {
    const t = getTournament(tournamentId);
    if (!t) return null;
    const r = t.rounds.find(r => r.id === roundId);
    if (!r) return null;
    if (status !== 'open' && status !== 'closed') return null;
    r.status = status;
    t.updatedAt = new Date().toISOString();
    saveState();
    return r;
}

// Clamp stableford value to a sane range. Typical tournament: 0..54.
function clampStableford(n) {
    const v = parseInt(n, 10);
    if (isNaN(v)) return null;
    if (v < 0) return 0;
    if (v > 99) return 99;
    return v;
}

// setScore accepts EITHER:
//   - { strokes: {1:4, 2:5, ...}, teeId: 'white-men' }  → server computes brutto/netto
//   - { brutto, netto }                                   → stored as-is (admin manual override)
// The first form is the canonical one — upload flow submits strokes, server
// computes points using the player's HCP + selected tee.
function setScore(tournamentId, roundId, playerSub, patch, updatedBy) {
    const t = getTournament(tournamentId);
    if (!t || t.status !== 'active') return null;
    const r = t.rounds.find(r => r.id === roundId);
    if (!r) return null;
    const existing = r.results[playerSub] || {};
    const next = { ...existing };

    // Strokes-based path
    if (patch && patch.strokes && patch.teeId) {
        const course = COURSES[r.courseId];
        if (!course) return null;
        const tee = course.tees.find(te => te.id === patch.teeId);
        if (!tee) return null;
        const player = getPlayer(playerSub);
        const playerHcp = typeof player?.hcp === 'number' ? player.hcp : 54;
        // Filter strokes to valid 1..18 ints
        const strokes = {};
        for (let h = 1; h <= 18; h++) {
            const v = parseInt(patch.strokes[h], 10);
            if (!isNaN(v) && v > 0 && v < 20) strokes[h] = v;
        }
        const { brutto, netto, courseHandicap, bruttoPerHole, nettoPerHole } =
            stableford.computeRound({ strokes, course, tee, playerHcp });
        next.strokes = strokes;
        next.teeId = patch.teeId;
        next.courseHandicap = courseHandicap;
        next.bruttoPerHole = bruttoPerHole;
        next.nettoPerHole = nettoPerHole;
        next.brutto = brutto;
        next.netto = netto;
        next.playerHcp = playerHcp;
    } else {
        // Manual override path (admin setting a raw number)
        if (patch.brutto !== undefined) {
            const v = clampStableford(patch.brutto);
            if (v !== null) next.brutto = v;
        }
        if (patch.netto !== undefined) {
            const v = clampStableford(patch.netto);
            if (v !== null) next.netto = v;
        }
    }

    next.updatedAt = new Date().toISOString();
    next.updatedBy = updatedBy || null;
    r.results[playerSub] = next;
    t.updatedAt = next.updatedAt;
    saveState();
    return next;
}

function clearScore(tournamentId, roundId, playerSub) {
    const t = getTournament(tournamentId);
    if (!t) return false;
    const r = t.rounds.find(r => r.id === roundId);
    if (!r || !r.results[playerSub]) return false;
    delete r.results[playerSub];
    t.updatedAt = new Date().toISOString();
    saveState();
    return true;
}

// Scramble meta (title + rules), symmetric with tournament.rules for UI.
function updateScrambleMeta({ title, rules }) {
    if (typeof title === 'string' && title.trim()) gameState.scrambleMeta.title = title.trim();
    if (typeof rules === 'string') gameState.scrambleMeta.rules = rules;
    saveState();
    return gameState.scrambleMeta;
}

function resetGame() {
    // Archive current round
    const archivePath = path.join(DATA_DIR, 'archive');
    if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath, { recursive: true });
    }

    const finalStandings = gameState.teams.map(team => {
        const totalScore = Object.values(team.scores).reduce((sum, score) => sum + score, 0);
        const holesPlayed = Object.keys(team.scores).length;
        return { name: team.name, totalScore, holesPlayed, scores: team.scores };
    }).sort((a, b) => a.totalScore - b.totalScore);

    const archive = {
        metadata: {
            archivedAt: new Date().toISOString(),
            course: gameState.course?.name || 'Unknown',
            courseId: gameState.course?.id || 'unknown'
        },
        summary: {
            winner: finalStandings[0]?.name || 'N/A',
            winningScore: finalStandings[0]?.totalScore || 0,
            holesCompleted: Math.max(...gameState.teams.map(t => Object.keys(t.scores).length), 0)
        },
        teams: finalStandings,
        log: gameState.log
    };

    const courseSlug = gameState.course?.id || 'unknown';
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `${courseSlug}-${dateStr}.json`;

    fs.writeFileSync(
        path.join(archivePath, filename),
        JSON.stringify(archive, null, 2)
    );

    console.log(`✅ Round archived: ${finalStandings[0]?.name} won with ${finalStandings[0]?.totalScore} strokes`);

    // Reset state, preserve teams (names/logos/colors), course, and player roster
    gameState = {
        teams: gameState.teams.map(t => ({
            id: t.id,
            name: t.name,
            logo: t.logo,
            color: t.color,
            scores: {},
            currentHole: 1
        })),
        course: gameState.course || COURSES.waldviertel,
        players: gameState.players || [],
        tournaments: gameState.tournaments || [],
        scrambleMeta: gameState.scrambleMeta || { title: 'Scramble', rules: '' },
        log: []
    };
    saveState();
    return gameState;
}

module.exports = {
    getGameState,
    updateTeam,
    updateScore,
    resetGame,
    setCourse,
    setTeamCount,
    getPlayer,
    upsertPlayerOnSignIn,
    updatePlayer,
    setPlayerApproval,
    deletePlayer,
    // tournaments
    getTournament,
    createTournament,
    updateTournament,
    deleteTournament,
    addRound,
    removeRound,
    setRoundStatus,
    setScore,
    clearScore,
    updateScrambleMeta,
    COURSES,
    VALID_TEAM_COUNTS
};
