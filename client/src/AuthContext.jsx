import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

// AuthContext orchestrates Google Sign-In + socket re-auth:
//
//   - The raw Google ID token (JWT) is kept in localStorage so reloads
//     don't force a new sign-in as long as it's still valid (~1h).
//   - When the token changes (sign-in / sign-out), we force the socket to
//     reconnect with the new auth handshake so the server re-verifies.
//   - The server responds with an `authUpdate` event carrying the
//     server-authoritative view of who the user is: { sub, email, isAdmin,
//     approved, hasProfile, player }. We mirror that into `me`.
//
// `me` is the one thing UI code should read — it's the post-verification,
// post-approval truth. The raw Google token + decoded payload are exposed
// too but most components shouldn't need them.

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'haugscore.googleIdToken';

export function AuthProvider({ socket, children }) {
    const [idToken, setIdToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
    const [me, setMe] = useState(null);
    const meRef = useRef(me);
    meRef.current = me;

    // Wire socket → context: listen for authUpdate from server
    useEffect(() => {
        const handleAuthUpdate = (payload) => {
            setMe(payload);
        };
        socket.on('authUpdate', handleAuthUpdate);
        return () => socket.off('authUpdate', handleAuthUpdate);
    }, [socket]);

    // Whenever the token changes, kick the socket so it re-handshakes with
    // the new (or cleared) credential.
    //
    // IMPORTANT: we own the connect() here (socket is created with
    // autoConnect:false in App.jsx). AppInner must NOT call socket.connect()
    // itself — otherwise the initial connection races ahead of this effect
    // and lands on the server with no token (→ anonymous, no admin).
    useEffect(() => {
        socket.auth = { token: idToken || undefined };
        if (socket.connected) socket.disconnect();
        socket.connect();
    }, [idToken, socket]);

    const signIn = useCallback((credentialResponse) => {
        const token = credentialResponse?.credential;
        if (!token) return;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        setIdToken(token);
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        // Also forget any local team/player bindings — the device effectively
        // becomes anonymous again.
        localStorage.removeItem('myTeamId');
        localStorage.removeItem('myPlayerId');
        setIdToken(null);
        setMe(null);
    }, []);

    const value = {
        idToken,
        me,
        isSignedIn: !!idToken,
        // True while we have a token but the server hasn't yet sent back its
        // authoritative view. UI should avoid rendering the full signed-in
        // card during this window — otherwise name/email/approval all look
        // empty for a moment after reload.
        isAuthLoading: !!idToken && me === null,
        isAdmin: !!(me && me.isAdmin),
        isApproved: !!(me && me.approved),
        hasProfile: !!(me && me.hasProfile),
        player: me?.player || null,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
