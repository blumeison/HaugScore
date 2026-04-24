// Downscale an uploaded image to a square JPEG data URL. Used for avatars
// (player profile, team logo). Keeps socket.io payloads small and data.json
// tidy — phone cameras produce 2-5 MB PNGs that are wasteful for a 40px circle.
//
// Center-crops to a square, then scales down to `size` and encodes as JPEG.
export async function fileToDownscaledDataUrl(file, size = 512, quality = 0.85) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to decode image'));
        el.src = dataUrl;
    });

    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    return canvas.toDataURL('image/jpeg', quality);
}
