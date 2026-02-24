import React, { useEffect, useRef, useState } from 'react';

export default function Wheel({ options, onSpinComplete, spinning, result }) {
    const canvasRef = useRef(null);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = width / 2 - 10;

        const drawWheel = (currentRotation) => {
            ctx.clearRect(0, 0, width, height);

            const sliceAngle = (2 * Math.PI) / options.length;

            options.forEach((opt, i) => {
                const startAngle = i * sliceAngle + currentRotation;
                const endAngle = (i + 1) * sliceAngle + currentRotation;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();

                ctx.fillStyle = i % 2 === 0 ? '#ec4899' : '#22c55e';
                ctx.fill();
                ctx.stroke();

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(startAngle + sliceAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(opt, radius - 10, 5);
                ctx.restore();
            });

            // Arrow
            ctx.beginPath();
            ctx.moveTo(centerX + 10, centerY - radius - 20);
            ctx.lineTo(centerX - 10, centerY - radius - 20);
            ctx.lineTo(centerX, centerY - radius + 10);
            ctx.fillStyle = 'white';
            ctx.fill();
        };

        drawWheel(rotation);
    }, [rotation, options]);

    useEffect(() => {
        if (spinning && result) {
            let start = null;
            const duration = 6000; // 6 seconds (slower)
            const targetIndex = options.indexOf(result);
            // Calculate target rotation to land on the item at the top (270 degrees or -90 degrees)
            const sliceAngle = (2 * Math.PI) / options.length;

            // Add random offset within the slice to make it less predictable
            // Random value between -0.4 and +0.4 of the slice angle
            const randomOffset = (Math.random() - 0.5) * 0.8 * sliceAngle;

            // finalRotation = -PI/2 - targetIndex * slice - slice/2 + randomOffset
            // We subtract sliceAngle/2 to align the CENTER of the slice with the arrow (at -PI/2)
            const extraSpins = 10 * Math.PI;
            const finalRotation = -Math.PI / 2 - targetIndex * sliceAngle - sliceAngle / 2 + extraSpins + randomOffset;

            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = Math.min((timestamp - start) / duration, 1);

                // Ease out cubic for smooth deceleration
                const ease = 1 - Math.pow(1 - progress, 3);

                const currentRot = ease * finalRotation;
                setRotation(currentRot);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    onSpinComplete();
                }
            };
            requestAnimationFrame(animate);
        }
    }, [spinning, result, options]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
            <canvas ref={canvasRef} width={300} height={300} />
        </div>
    );
}
