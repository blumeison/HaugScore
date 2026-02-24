const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// Initial Teams for Scramble
const INITIAL_TEAMS = [
    { id: 1, name: "Team 1", logo: null, color: '#ef4444', scores: {}, currentHole: 1, activeEffects: [] },
    { id: 2, name: "Team 2", logo: null, color: '#3b82f6', scores: {}, currentHole: 1, activeEffects: [] },
    { id: 3, name: "Team 3", logo: null, color: '#22c55e', scores: {}, currentHole: 1, activeEffects: [] },
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
    }
};

const ITEMS = {
    TURTLE: { id: 'turtle', name: 'Red Turtle', description: 'Add 1 stroke to target team on current hole' },
    BANANA: { id: 'banana', name: 'Banana', description: 'Next shot must be played with putter (visual only)' },
    MUSHROOM: { id: 'mushroom', name: 'Mushroom', description: 'Remove 1 stroke from current hole' }
};

const WHEEL_OPTIONS = [
    "Driver",
    "Wood",
    "6 Iron",
    "8 Iron",
    "P Wedge",
    "Lob Wedge",
    "Putter"
];

let gameState = {
    teams: INITIAL_TEAMS,
    course: COURSES.waldviertel, // Default
    activeChallenge: null,
    maxSpins: 2,
    wheelUnlocksAfterHole: 3,
    log: []
};

// Load state from file if exists
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const loadedState = JSON.parse(data);
        if (loadedState.players) {
            console.log("Migrating from Players to Teams...");
            saveState();
        } else {
            gameState = loadedState;

            // FORCE REFRESH COURSE DATA
            // This ensures that if we update the static COURSES definition, 
            // the saved state gets the new hole data (Pars/HCPs).
            if (gameState.course && gameState.course.id && COURSES[gameState.course.id]) {
                console.log(`Refreshing data for course: ${gameState.course.name}`);
                gameState.course = COURSES[gameState.course.id];
            } else {
                // Default to Waldviertel if missing or invalid
                gameState.course = COURSES.waldviertel;
            }

            // Migration: Add currentHole if missing
            let needsSave = false;
            gameState.teams.forEach(team => {
                if (team.currentHole === undefined) {
                    team.currentHole = Math.max(1, Object.keys(team.scores).length + 1);
                    console.log(`Added currentHole=${team.currentHole} to ${team.name}`);
                    needsSave = true;
                }
            });

            // Migration: Add maxSpins if missing
            if (gameState.maxSpins === undefined) {
                gameState.maxSpins = 2;
                needsSave = true;
            }

            // Migration: Add wheelUnlocksAfterHole if missing
            if (gameState.wheelUnlocksAfterHole === undefined) {
                gameState.wheelUnlocksAfterHole = 3;
                needsSave = true;
            }

            // Always save after refresh to persist the updated course data
            saveState();
        }
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

function getStandings() {
    return [...gameState.teams].sort((a, b) => {
        const scoreA = Object.values(a.scores).reduce((sum, s) => sum + s, 0);
        const scoreB = Object.values(b.scores).reduce((sum, s) => sum + s, 0);
        return scoreA - scoreB;
    });
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

function setGameConfig(config) {
    let updated = false;
    if (config.maxSpins !== undefined) {
        gameState.maxSpins = parseInt(config.maxSpins);
        updated = true;
    }
    if (config.wheelUnlocksAfterHole !== undefined) {
        gameState.wheelUnlocksAfterHole = parseInt(config.wheelUnlocksAfterHole);
        updated = true;
    }
    if (updated) {
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

function useItem(sourceId, targetId, itemId) {
    const source = gameState.teams.find(t => t.id === parseInt(sourceId));
    const target = gameState.teams.find(t => t.id === parseInt(targetId));

    if (!source || !target) return { success: false, message: "Team not found" };

    const item = Object.values(ITEMS).find(i => i.id === itemId);
    if (!item) return { success: false, message: "Invalid item" };

    gameState.log.push(`${source.name} used ${item.name} on ${target.name}!`);
    target.activeEffects.push({ id: itemId, from: source.name, timestamp: Date.now() });

    saveState();
    return { success: true, message: `Used ${item.name}`, newState: gameState };
}

function prepareWheelSpin(sourceTeamId) {
    const sourceTeam = gameState.teams.find(t => t.id === parseInt(sourceTeamId));

    if (!sourceTeam) return { success: false, message: "Team not found" };

    // Rule 1: Must have completed at least X holes
    const sourceHolesPlayed = Object.keys(sourceTeam.scores).length;
    const unlockHole = gameState.wheelUnlocksAfterHole || 3;
    if (sourceHolesPlayed < unlockHole) {
        return { success: false, message: `Wheel unlocks after hole ${unlockHole}!` };
    }

    // Rule 2: Max spins per team per round
    const sourceSpinsUsed = gameState.log.filter(entry => entry.includes(`${sourceTeam.name} initiated spin`)).length;
    const maxSpins = gameState.maxSpins || 2;
    if (sourceSpinsUsed >= maxSpins) {
        return { success: false, message: `You've used all your wheel spins (max ${maxSpins})!` };
    }

    // Rule 2.5: Only ONE spin per hole allowed
    if (sourceTeam.lastSpinHole === sourceTeam.currentHole) {
        return { success: false, message: "Only one spin allowed per hole!" };
    }

    // Rule 3: Determine Leader based on Relative Score (to Par)
    const allTeams = gameState.teams;
    const teamStandings = allTeams.map(team => {
        const holesPlayed = Object.keys(team.scores);
        const totalScore = Object.values(team.scores).reduce((sum, s) => sum + s, 0);
        const totalPar = holesPlayed.reduce((sum, holeNum) => {
            const hole = gameState.course.holes.find(h => h.number === parseInt(holeNum));
            return sum + (hole ? hole.par : 4);
        }, 0);
        return {
            team,
            relativeScore: totalScore - totalPar,
            holesPlayedCount: holesPlayed.length
        };
    });

    // Sort by relative score (lowest first)
    teamStandings.sort((a, b) => a.relativeScore - b.relativeScore);
    const leader = teamStandings[0];
    const firstPlaceTeam = leader.team;
    const spinResult = WHEEL_OPTIONS[Math.floor(Math.random() * WHEEL_OPTIONS.length)];

    // Update state
    sourceTeam.lastSpinHole = sourceTeam.currentHole; // Mark this hole as "spin used"
    gameState.log.push(`${sourceTeam.name} initiated spin against ${firstPlaceTeam.name}: ${spinResult}`);
    firstPlaceTeam.activeEffects.push({ id: 'wheel_curse', name: spinResult, from: sourceTeam.name, timestamp: Date.now() });

    // PERSIST THE ACTIVE CHALLENGE
    gameState.activeChallenge = {
        sourceTeam: { id: sourceTeam.id, name: sourceTeam.name },
        targetTeam: { id: firstPlaceTeam.id, name: firstPlaceTeam.name },
        spinResult,
        status: 'waiting', // waiting -> spinning -> done
        dismissedBy: [] // Track who has closed the overlay
    };

    saveState();
    return {
        success: true,
        ...gameState.activeChallenge
    };
}

function setChallengeStatus(status) {
    if (gameState.activeChallenge) {
        gameState.activeChallenge.status = status;
        saveState();
        return true;
    }
    return false;
}

function clearChallenge(teamId) {
    if (gameState.activeChallenge) {
        // If teamId is provided, track dismissal
        if (teamId) {
            gameState.activeChallenge.dismissedBy = gameState.activeChallenge.dismissedBy || [];
            if (!gameState.activeChallenge.dismissedBy.includes(teamId)) {
                gameState.activeChallenge.dismissedBy.push(teamId);
            }

            // Check if both source and target have dismissed
            const sourceId = gameState.activeChallenge.sourceTeam.id;
            const targetId = gameState.activeChallenge.targetTeam.id;

            const sourceDismissed = gameState.activeChallenge.dismissedBy.includes(sourceId);
            const targetDismissed = gameState.activeChallenge.dismissedBy.includes(targetId);

            console.log(`Challenge dismissal: Source(${sourceDismissed}) Target(${targetDismissed})`);

            if (sourceDismissed && targetDismissed) {
                console.log("Both teams dismissed. Clearing challenge.");
                gameState.activeChallenge = null;
            } else {
                console.log("Waiting for other team to dismiss.");
            }
        } else {
            // Fallback for legacy calls or forced clear
            gameState.activeChallenge = null;
        }

        saveState();
        return true;
    }
    return false;
}

function resetGame() {
    // 1. Create enhanced archive with summary
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(__dirname, 'archive');
    if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath);
    }

    // Extract wheel spins from log
    const wheelSpins = gameState.log
        .filter(entry => entry.includes('initiated spin'))
        .map(entry => {
            const match = entry.match(/(.+) initiated spin against (.+): (.+)/);
            if (match) {
                return {
                    challenger: match[1],
                    target: match[2],
                    result: match[3]
                };
            }
            return null;
        })
        .filter(spin => spin !== null);

    // Calculate final scores
    const finalStandings = gameState.teams.map(team => {
        const totalScore = Object.values(team.scores).reduce((sum, score) => sum + score, 0);
        const holesPlayed = Object.keys(team.scores).length;
        return {
            name: team.name,
            totalScore,
            holesPlayed,
            scores: team.scores
        };
    }).sort((a, b) => a.totalScore - b.totalScore);

    // Create structured archive
    const archive = {
        metadata: {
            archivedAt: new Date().toISOString(),
            course: gameState.course?.name || 'Unknown',
            courseId: gameState.course?.id || 'unknown'
        },
        summary: {
            winner: finalStandings[0]?.name || 'N/A',
            winningScore: finalStandings[0]?.totalScore || 0,
            totalWheelSpins: wheelSpins.length,
            holesCompleted: Math.max(...gameState.teams.map(t => Object.keys(t.scores).length), 0)
        },
        teams: finalStandings,
        wheelSpins: wheelSpins,
        rawGameState: gameState, // Keep full state for complete record
        log: gameState.log
    };

    // Save archive
    const courseSlug = gameState.course?.id || 'unknown';
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19); // YYYY-MM-DDTHH-MM-SS
    const filename = `${courseSlug}-${dateStr}.json`;

    fs.writeFileSync(
        path.join(archivePath, filename),
        JSON.stringify(archive, null, 2)
    );

    console.log(`✅ Round archived: ${finalStandings[0]?.name} won with ${finalStandings[0]?.totalScore} strokes`);
    console.log(`📊 Wheel Spins: ${wheelSpins.length}, Holes: ${archive.summary.holesCompleted}`);

    // 2. Create new state (Keep teams, reset scores)
    const newTeams = gameState.teams.map(t => ({
        ...t,
        scores: {},
        currentHole: 1,
        activeEffects: []
    }));

    gameState = {
        teams: newTeams,
        course: gameState.course || COURSES.waldviertel, // Keep current course or default
        activeChallenge: null,
        maxSpins: gameState.maxSpins || 2,
        wheelUnlocksAfterHole: gameState.wheelUnlocksAfterHole || 3,
        log: []
    };
    saveState();
    return gameState;
}

module.exports = {
    getGameState,
    getStandings,
    updateTeam,
    updateScore,
    useItem,
    prepareWheelSpin,
    setChallengeStatus,
    clearChallenge,
    resetGame,
    setCourse,
    setGameConfig,
    ITEMS,
    WHEEL_OPTIONS,
    COURSES
};
