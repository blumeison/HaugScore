export const startScreenRecording = async () => {
    try {
        // Check for mobile/iOS (getDisplayMedia is not supported on iOS)
        if (!navigator.mediaDevices?.getDisplayMedia) {
            alert("📷 Screen recording is not supported on this device/browser (iOS/Mobile).");
            return null;
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: "browser", // Hint to prefer browser tab
            },
            audio: true,
            preferCurrentTab: true // Chrome-specific hint
        });

        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            a.href = url;
            a.download = `haugscore-spin-${new Date().toISOString()}.webm`;
            a.click();
            window.URL.revokeObjectURL(url);
            alert("💾 Recording saved to your DOWNLOADS folder!");
        };

        mediaRecorder.start();
        return { stream, mediaRecorder };
    } catch (err) {
        console.error("Error starting screen recording:", err);
        return null;
    }
};
