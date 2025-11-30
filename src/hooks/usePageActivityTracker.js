import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageActivity } from '../services/rankingService';

/**
 * Custom hook to automatically track page activity and update user score
 * @param {string} userId - Current user's ID
 */
export function usePageActivityTracker(userId) {
  const location = useLocation();
  const startTimeRef = useRef(null);
  const currentPathRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Record entry time
    startTimeRef.current = Date.now();
    currentPathRef.current = location.pathname;

    return () => {
      // Calculate time spent when leaving page
      if (startTimeRef.current && currentPathRef.current) {
        const timeSpent = Date.now() - startTimeRef.current;
        const minutesSpent = Math.floor(timeSpent / 60000); // Convert to minutes

        if (minutesSpent > 0) {
          trackPageActivity(userId, currentPathRef.current, minutesSpent);
        }
      }
    };
  }, [location.pathname, userId]);

  // Also track on window unload/refresh
  useEffect(() => {
    if (!userId) return;

    const handleBeforeUnload = () => {
      if (startTimeRef.current && currentPathRef.current) {
        const timeSpent = Date.now() - startTimeRef.current;
        const minutesSpent = Math.floor(timeSpent / 60000);

        if (minutesSpent > 0) {
          // Use sendBeacon for reliable tracking on page unload
          const data = JSON.stringify({
            userId,
            path: currentPathRef.current,
            minutes: minutesSpent
          });
          
          // Note: This requires a backend endpoint to process
          // For now, just use trackPageActivity
          trackPageActivity(userId, currentPathRef.current, minutesSpent);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId]);
}

export default usePageActivityTracker;