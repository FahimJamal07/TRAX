export const getStoredUserProfile = () => {
  const fallback = { name: 'Unknown User', role: 'Read-Only' };

  try {
    const sessionRaw = sessionStorage.getItem('trax_user');
    
    if (!sessionRaw) return fallback;

    const parsed = JSON.parse(sessionRaw);

    // Strict validation: If the payload doesn't have what we need, reject it.
    if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.role) {
      console.warn('TRAX Auth: Malformed session data detected. Forcing fallback.');
      sessionStorage.removeItem('trax_user'); // Clean up the garbage
      return fallback;
    }

    return {
      name: parsed.name,
      role: parsed.role,
    };
  } catch (error) {
    console.error('TRAX Auth: Failed to parse session storage.', error);
    sessionStorage.removeItem('trax_user'); // Failsafe
    return fallback;
  }
};
