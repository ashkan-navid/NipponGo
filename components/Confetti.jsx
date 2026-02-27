'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#FF69B4', '#FF6347', '#FFD700', '#4FC3F7', '#66BB6A', '#E040FB', '#FF7043'];

/**
 * Confetti celebration effect.
 * Renders 40 particles that fall and fade.
 * Auto-removes after animation completes.
 */
export default function Confetti({ trigger, duration = 3000 }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (!trigger) return;

        const newParticles = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            x: Math.random() * 100,
            delay: Math.random() * 0.8,
            fallDuration: 2 + Math.random() * 2,
        }));

        setParticles(newParticles);

        const timer = setTimeout(() => setParticles([]), duration + 1000);
        return () => clearTimeout(timer);
    }, [trigger, duration]);

    if (particles.length === 0) return null;

    return (
        <div aria-hidden="true">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="confetti-particle"
                    style={{
                        '--fall-x': `${p.x}%`,
                        '--fall-delay': `${p.delay}s`,
                        '--fall-duration': `${p.fallDuration}s`,
                        backgroundColor: p.color,
                    }}
                />
            ))}
        </div>
    );
}
