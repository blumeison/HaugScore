// Google OAuth token verification + admin recognition.
//
// We use Google Identity Services (GIS) on the client, which returns a
// short-lived ID token (JWT) directly to the browser. The server verifies
// that JWT against Google's public keys on every socket connection. The
// google-auth-library caches Google's public keys internally, so in practice
// this is a ~1ms JWT signature check after the first call.
//
// Scheme:
//   - Client sends { auth: { token } } in socket.io handshake
//   - `verifyToken` returns a User { sub, email, name, picture, isAdmin }
//   - `socket.user` is then available to every handler
//   - Admin status is derived server-side from the ADMIN_EMAILS env var —
//     never trusted from the client.

const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!CLIENT_ID) {
    console.warn('[auth] GOOGLE_CLIENT_ID env var not set — token verification will fail');
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

console.log(`[auth] Admin emails configured: ${ADMIN_EMAILS.length ? ADMIN_EMAILS.join(', ') : '(none)'}`);

const client = new OAuth2Client(CLIENT_ID);

// Small in-memory cache: token → { user, expiresAt }.
// JWTs are valid for ~1h; we cache successful verifications for 10 minutes
// to avoid re-verifying on every socket reconnect.
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function verifyToken(idToken) {
    if (!idToken) throw new Error('No token provided');

    const cached = cache.get(idToken);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.user;
    }

    const ticket = await client.verifyIdToken({
        idToken,
        audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload.sub || !payload.email) {
        throw new Error('Token payload missing sub or email');
    }
    if (!payload.email_verified) {
        throw new Error('Email not verified by Google');
    }

    const email = payload.email.toLowerCase();
    const user = {
        sub: payload.sub,
        email,
        name: payload.name || email,
        picture: payload.picture || null,
        isAdmin: ADMIN_EMAILS.includes(email),
    };

    cache.set(idToken, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
}

// Socket.io middleware: runs on every new connection. Rejects the connection
// if there is no valid token. Anonymous connections are still permitted for
// read-only access to state — guarded individually per handler.
function socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth?.token;
    if (!token) {
        // Anonymous connection — allowed, but socket.user stays null.
        // Write handlers must explicitly check requireAuth / requireAdmin.
        socket.user = null;
        return next();
    }

    verifyToken(token)
        .then(user => {
            socket.user = user;
            console.log(`[auth] socket authed: ${user.email}${user.isAdmin ? ' (admin)' : ''}`);
            next();
        })
        .catch(err => {
            console.warn(`[auth] socket auth failed: ${err.message}`);
            socket.user = null;
            next(); // allow connection; handlers will reject writes
        });
}

module.exports = { verifyToken, socketAuthMiddleware, ADMIN_EMAILS };
