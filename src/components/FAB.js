export default function FAB({ onClick, icon = 'plus' }) {
  const handleClick = () => {
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className="fab"
      aria-label="Add exercise"
    >
      {icon === 'plus' && (
        <svg className="w-7 h-7 text-iron-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      )}
      {icon === 'dumbbell' && (
        <svg className="w-6 h-6 text-iron-950" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
        </svg>
      )}
    </button>
  );
}

