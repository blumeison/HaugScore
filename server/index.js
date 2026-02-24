const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const game = require('./game');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

// API Routes
app.get('/api/state', (req, res) => {
    res.json(game.getGameState());
});

app.post('/api/set-course', (req, res) => {
    const { courseId } = req.body;
    if (game.setCourse(courseId)) {
        io.emit('stateUpdate', game.getGameState());
        res.json({ success: true, state: game.getGameState() });
    } else {
        res.status(400).json({ success: false, message: "Invalid course ID" });
    }
});

app.post('/api/reset-game', (req, res) => {
    const newState = game.resetGame();
    io.emit('stateUpdate', newState);
    res.json(newState);
});

app.get('/api/archives', (req, res) => {
    const archivePath = path.join(__dirname, 'archive');
    if (!fs.existsSync(archivePath)) {
        return res.json([]);
    }

    const files = fs.readdirSync(archivePath)
        .filter(f => (f.startsWith('round-') || f.match(/^[a-z]+-\d{4}-/)) && f.endsWith('.json'))
        .map(f => {
            try {
                const filePath = path.join(archivePath, f);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                // Handle new format with metadata/summary
                if (content.metadata && content.summary) {
                    return {
                        filename: f,
                        metadata: content.metadata,
                        summary: content.summary
                    };
                }

                // Handle old format - skip
                console.log(`Skipping old format archive: ${f}`);
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
    const archivePath = path.join(__dirname, 'archive', req.params.filename);
    if (!fs.existsSync(archivePath)) {
        return res.status(404).json({ error: 'Archive not found' });
    }

    const content = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
    res.json(content);
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send initial state
    socket.emit('stateUpdate', game.getGameState());

    socket.on('updateTeam', ({ teamId, name, logo }) => {
        console.log(`Update Team: ${teamId} -> ${name}`);
        if (game.updateTeam(teamId, name, logo)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('updateScore', ({ teamId, holeNumber, score }) => {
        console.log(`Score update: T${teamId} H${holeNumber} -> ${score}`);
        if (game.updateScore(teamId, holeNumber, score)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('useItem', ({ sourceId, targetId, itemId }) => {
        console.log(`Item usage: ${sourceId} -> ${targetId} (${itemId})`);
        const result = game.useItem(sourceId, targetId, itemId);
        if (result.success) {
            io.emit('stateUpdate', result.newState);
            io.emit('notification', { message: result.message, type: 'info' });
        }
    });

    // Step 1: Losing team requests to spin
    socket.on('wheelSpinRequest', ({ teamId }) => {
        console.log(`Wheel spin REQUEST from T${teamId}`);
        const result = game.prepareWheelSpin(teamId);
        if (result.success) {
            // Broadcast state update (which now includes activeChallenge)
            io.emit('stateUpdate', game.getGameState());

            // Also emit specific alert for immediate UI reaction (optional but good for animation triggers)
            io.emit('wheelAlert', result);
        } else {
            socket.emit('notification', { message: result.message, type: 'error' });
        }
    });

    // Step 2: Winning team confirms ready
    socket.on('wheelReady', ({ targetTeamId }) => {
        console.log(`Wheel READY from T${targetTeamId}`);
        game.setChallengeStatus('spinning');
        io.emit('stateUpdate', game.getGameState());
        io.emit('wheelSpin');
    });

    // Step 3: Wheel done / closed
    socket.on('wheelDone', ({ teamId } = {}) => {
        console.log(`Wheel DONE/CLOSED by T${teamId}`);
        game.clearChallenge(teamId);
        io.emit('stateUpdate', game.getGameState());
    });

    socket.on('resetGame', () => {
        console.log('Reset Game requested');
        const newState = game.resetGame();
        io.emit('stateUpdate', newState);
        io.emit('notification', { message: '🔄 Game has been RESET!', type: 'warning' });
    });

    socket.on('setGameConfig', (config) => {
        console.log('Game Config Update:', config);
        if (game.setGameConfig(config)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
