export function playGoalSound() {
	// Try playing the static /gol_sound.mp3 first
	const audio = new Audio("/gol_sound.mp3");
	audio.play().catch((err) => {
		console.warn(
			"Autoplay or /gol_sound.mp3 file missing, playing synthetic whistle:",
			err,
		);
		// Fallback: Synthesize a short stadium whistle using Web Audio API
		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as typeof window & { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext;
			if (!AudioContextClass) return;

			const audioCtx = new AudioContextClass();

			const playWhistle = (
				delay: number,
				duration: number,
				frequency: number,
			) => {
				const osc = audioCtx.createOscillator();
				const gain = audioCtx.createGain();

				osc.type = "sine";
				osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + delay);

				// Short fade-in and exponential decay
				gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
				gain.gain.linearRampToValueAtTime(
					0.12,
					audioCtx.currentTime + delay + 0.03,
				);
				gain.gain.exponentialRampToValueAtTime(
					0.0001,
					audioCtx.currentTime + delay + duration,
				);

				osc.connect(gain);
				gain.connect(audioCtx.destination);

				osc.start(audioCtx.currentTime + delay);
				osc.stop(audioCtx.currentTime + delay + duration);
			};

			// Play a double referee-like whistle
			playWhistle(0, 0.12, 950);
			playWhistle(0.18, 0.25, 950);
		} catch (e) {
			console.warn("Web Audio Context synthesis failed:", e);
		}
	});
}
