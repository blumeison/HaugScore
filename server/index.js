const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const game = require('./game');

// DATA_DIR: where data.json and archive/ live. On fly.io this points at the
// mounted volume (/data). Locally it defaults to the server/ folder so dev
// behaviour is unchanged.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' })); // team logos are base64 data URLs

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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send initial state (also fires on every reconnect)
    socket.emit('stateUpdate', game.getGameState());

    // Client can request a fresh state snapshot explicitly (e.g. after waking from sleep)
    socket.on('requestState', () => {
        socket.emit('stateUpdate', game.getGameState());
    });

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

    socket.on('setTeamCount', (count) => {
        console.log(`Set team count: ${count}`);
        if (game.setTeamCount(count)) {
            io.emit('stateUpdate', game.getGameState());
        }
    });

    socket.on('resetGame', () => {
        console.log('Reset Game requested');
        const newState = game.resetGame();
        io.emit('stateUpdate', newState);
        io.emit('notification', { message: '🔄 Game has been RESET!', type: 'warning' });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
