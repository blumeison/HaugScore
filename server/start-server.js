const { spawn, exec } = require('child_process');
const path = require('path');

const PORT = 3001;

function killPort(port) {
    return new Promise((resolve) => {
        const command = process.platform === 'win32'
            ? `netstat -ano | findstr :${port}`
            : `lsof -i :${port} -t`;

        exec(command, (err, stdout) => {
            if (err || !stdout) {
                resolve();
                return;
            }

            const lines = stdout.trim().split('\n');
            const pids = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return parts[parts.length - 1];
            }).filter(pid => /^\d+$/.test(pid));

            if (pids.length === 0) {
                resolve();
                return;
            }

            const uniquePids = [...new Set(pids)];
            console.log(`Killing processes on port ${port}: ${uniquePids.join(', ')}`);

            const killCmd = process.platform === 'win32'
                ? `taskkill /F /PID ${uniquePids.join(' /PID ')}`
                : `kill -9 ${uniquePids.join(' ')}`;

            exec(killCmd, () => {
                // Give it a moment to release
                setTimeout(resolve, 1000);
            });
        });
    });
}

async function startServer() {
    await killPort(PORT);

    console.log('Starting server...');
    const server = spawn('node', ['index.js'], {
        stdio: 'inherit',
        cwd: __dirname
    });

    server.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

startServer();
