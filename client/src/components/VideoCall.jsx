import React, { useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function VideoCall({ roomName, displayName, onLeave, embedded = false }) {
    const [loading, setLoading] = useState(true);

    const containerStyle = embedded ? {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '2px solid #334155'
    } : {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.9)',
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column'
    };

    return (
        <div style={containerStyle}>
            <div style={{
                padding: '1rem',
                background: '#1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #334155'
            }}>
                <h3 style={{ margin: 0, color: 'white' }}>🎥 Live Wheel Cam</h3>
                <button
                    onClick={onLeave}
                    style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Leave Call
                </button>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white'
                    }}>
                        Loading Video...
                    </div>
                )}
                <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={roomName}
                    configOverwrite={{
                        startWithAudioMuted: false,
                        disableThirdPartyRequests: true,
                        prejoinPageEnabled: false,
                    }}
                    interfaceConfigOverwrite={{
                        TOOLBAR_BUTTONS: [
                            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                            'security'
                        ],
                    }}
                    userInfo={{
                        displayName: displayName
                    }}
                    onApiReady={(externalApi) => {
                        setLoading(false);
                        // externalApi.executeCommand('toggleAudio');
                    }}
                    getIFrameRef={(iframeRef) => {
                        iframeRef.style.height = '100%';
                        iframeRef.style.width = '100%';
                    }}
                />
            </div>
        </div>
    );
}
