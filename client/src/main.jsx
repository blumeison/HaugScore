import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

// Client ID is NOT a secret — it's embedded in the browser bundle and shown
// to Google during sign-in. The server verifies the JWT's audience matches
// this ID, so using a fake one client-side gets you nothing.
// Falls back to the hardcoded ID so Docker builds work without --build-arg.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '132538194498-grggesh2d0un42t2grj6sl4o1u5c0ff3.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
