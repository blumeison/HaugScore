const fs = require('fs');
const path = require('path');

// DATA_DIR: location of data.json and archive/. On fly.io this is /data
// (mounted volume). Locally defaults to this server/ folder.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Initial Teams for Scramble
const INITIAL_TEAMS = [
    { id: 1, name: "Team 1", logo: null, color: '#ef4444', scores: {}, currentHole: 1 },
    { id: 2, name: "Team 2", logo: null, color: '#3b82f6', scores: {}, currentHole: 1 },
    { id: 3, name: "Team 3", logo: null, color: '#22c55e', scores: {}, currentHole: 1 },
];

const COURSES = {
    waldviertel: {
        id: 'waldviertel',
        name: "Course Waldviertel",
        holes: [
            { number: 1, par: 4, hcp: 11, image: "/images/waldviertel/hole1.jpg" },
            { number: 2, par: 4, hcp: 1, image: "/images/waldviertel/hole2.jpg" },
            { number: 3, par: 4, hcp: 9, image: "/images/waldviertel/hole3.jpg" },
            { number: 4, par: 3, hcp: 13, image: "/images/waldviertel/hole4.jpg" },
            { number: 5, par: 4, hcp: 15, image: "/images/waldviertel/hole5.jpg" },
            { number: 6, par: 5, hcp: 5, image: "/images/waldviertel/hole6.jpg" },
            { number: 7, par: 4, hcp: 3, image: "/images/waldviertel/hole7.jpg" },
            { number: 8, par: 3, hcp: 17, image: "/images/waldviertel/hole8.jpg" },
            { number: 9, par: 5, hcp: 7, image: "/images/waldviertel/hole9.jpg" },
            { number: 10, par: 4, hcp: 10, image: "/images/waldviertel/hole10.jpg" },
            { number: 11, par: 4, hcp: 8, image: "/images/waldviertel/hole11.jpg" },
            { number: 12, par: 4, hcp: 16, image: "/images/waldviertel/hole12.jpg" },
            { number: 13, par: 5, hcp: 14, image: "/images/waldviertel/hole13.jpg" },
            { number: 14, par: 4, hcp: 2, image: "/images/waldviertel/hole14.jpg" },
            { number: 15, par: 5, hcp: 6, image: "/images/waldviertel/hole15.jpg" },
            { number: 16, par: 3, hcp: 12, image: "/images/waldviertel/hole16.jpg" },
            { number: 17, par: 4, hcp: 4, image: "/images/waldviertel/hole17.jpg" },
            { number: 18, par: 3, hcp: 18, image: "/images/waldviertel/hole18.jpg" }
        ]
    },
    haugschlag: {
        id: 'haugschlag',
        name: "Course Haugschlag",
        holes: [
            { number: 1, par: 4, hcp: 11, image: "/images/haugschlag/hole1.jpg" },
            { number: 2, par: 4, hcp: 1, image: "/images/haugschlag/hole2.jpg" },
            { number: 3, par: 4, hcp: 9, image: "/images/haugschlag/hole3.jpg" },
            { number: 4, par: 3, hcp: 13, image: "/images/haugschlag/hole4.jpg" },
            { number: 5, par: 4, hcp: 15, image: "/images/haugschlag/hole5.jpg" },
            { number: 6, par: 5, hcp: 5, image: "/images/haugschlag/hole6.jpg" },
            { number: 7, par: 4, hcp: 3, image: "/images/haugschlag/hole7.jpg" },
            { number: 8, par: 3, hcp: 17, image: "/images/haugschlag/hole8.jpg" },
            { number: 9, par: 5, hcp: 7, image: "/images/haugschlag/hole9.jpg" },
            { number: 10, par: 4, hcp: 10, image: "/images/haugschlag/hole10.jpg" },
            { number: 11, par: 4, hcp: 8, image: "/images/haugschlag/hole11.jpg" },
            { number: 12, par: 4, hcp: 16, image: "/images/haugschlag/hole12.jpg" },
            { number: 13, par: 5, hcp: 14, image: "/images/haugschlag/hole13.jpg" },
            { number: 14, par: 4, hcp: 2, image: "/images/haugschlag/hole14.jpg" },
            { number: 15, par: 5, hcp: 6, image: "/images/haugschlag/hole15.jpg" },
            { number: 16, par: 3, hcp: 12, image: "/images/haugschlag/hole16.jpg" },
            { number: 17, par: 4, hcp: 4, image: "/images/haugschlag/hole17.jpg" },
            { number: 18, par: 3, hcp: 18, image: "/images/haugschlag/hole18.jpg" }
        ]
    },
    monachus: {
        id: 'monachus',
        name: "Course Monachus",
        holes: [
            { number: 1, par: 4, hcp: 10, image: "/images/monachus/hole1.jpg" },
            { number: 2, par: 5, hcp: 6, image: "/images/monachus/hole2.jpg" },
            { number: 3, par: 3, hcp: 16, image: "/images/monachus/hole3.jpg" },
            { number: 4, par: 5, hcp: 14, image: "/images/monachus/hole4.jpg" },
            { number: 5, par: 4, hcp: 2, image: "/images/monachus/hole5.jpg" },
            { number: 6, par: 4, hcp: 18, image: "/images/monachus/hole6.jpg" },
            { number: 7, par: 4, hcp: 8, image: "/images/monachus/hole7.jpg" },
            { number: 8, par: 3, hcp: 4, image: "/images/monachus/hole8.jpg" },
            { number: 9, par: 4, hcp: 12, image: "/images/monachus/hole9.jpg" },
            { number: 10, par: 3, hcp: 9, image: "/images/monachus/hole10.jpg" },
            { number: 11, par: 4, hcp: 5, image: "/images/monachus/hole11.jpg" },
            { number: 12, par: 5, hcp: 17, image: "/images/monachus/hole12.jpg" },
            { number: 13, par: 5, hcp: 1, image: "/images/monachus/hole13.jpg" },
            { number: 14, par: 4, hcp: 7, image: "/images/monachus/hole14.jpg" },
            { number: 15, par: 4, hcp: 15, image: "/images/monachus/hole15.jpg" },
            { number: 16, par: 3, hcp: 13, image: "/images/monachus/hole16.jpg" },
            { number: 17, par: 4, hcp: 3, image: "/images/monachus/hole17.jpg" },
            { number: 18, par: 5, hcp: 11, image: "/images/monachus/hole18.jpg" }
        ]
    }
};

let gameState = {
    teams: INITIAL_TEAMS,
    course: COURSES.waldviertel,
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
    return gameState;
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

    // Reset state, preserve teams (names/logos/colors) and course
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
    COURSES
};
