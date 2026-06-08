import { useEffect, useState } from "react";
import type { Match } from "../lib/types";

/**
 * Custom hook to simulate the progress of a live match timer in the frontend.
 * This prevents user anxiety by incrementing the elapsed minute locally between database syncs.
 * It strictly respects football match timing rules:
 * - Capping the first half at 45'
 * - Capping the second half at 90'
 * - Capping extra time at 120'
 * - Displaying "ET" during halftime (rawStatus = 'HT')
 * - Displaying "PEN" during penalty shootout (rawStatus = 'P')
 * - Not ticking during halftime or full-time
 */
export function useLiveMinute(match: Match): number | string | undefined {
	const initialMinute = match.minute;
	const isLive = match.status === "live";
	const rawStatus = match.rawStatus;

	const [liveMinute, setLiveMinute] = useState<number | string | undefined>(
		isLive && rawStatus === "HT"
			? "ET"
			: isLive && rawStatus === "P"
				? "PEN"
				: initialMinute,
	);

	useEffect(() => {
		// If rawStatus is halftime or penalty, set state and exit
		if (isLive && rawStatus === "HT") {
			setLiveMinute("ET");
			return;
		}
		if (isLive && rawStatus === "P") {
			setLiveMinute("PEN");
			return;
		}

		setLiveMinute(initialMinute);

		if (!isLive || initialMinute === undefined) {
			return;
		}

		// Save the timestamp of when this match update was received
		const lastUpdatedTime = Date.now();

		const interval = setInterval(() => {
			const elapsedMs = Date.now() - lastUpdatedTime;
			const elapsedMinutes = Math.floor(elapsedMs / 60000);

			if (elapsedMinutes > 0) {
				setLiveMinute(() => {
					// Football-specific stopwatch capping logic
					if (initialMinute > 0 && initialMinute < 45) {
						return Math.min(initialMinute + elapsedMinutes, 45);
					}
					if (initialMinute === 45) {
						return 45;
					}
					if (initialMinute > 45 && initialMinute < 90) {
						return Math.min(initialMinute + elapsedMinutes, 90);
					}
					if (initialMinute === 90) {
						return 90;
					}
					if (initialMinute > 90 && initialMinute < 120) {
						return Math.min(initialMinute + elapsedMinutes, 120);
					}
					return initialMinute; // Default fallback
				});
			}
		}, 10000); // Check every 10 seconds to update the minute smoothly

		return () => clearInterval(interval);
	}, [initialMinute, isLive, rawStatus]);

	return liveMinute;
}
