// Presentational "back to world" button. No map knowledge — it just reflects
// the current level and calls the handler it is given.
export function BackButton({ atWorld, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={atWorld}
      className={`absolute top-2.5 left-2.5 z-10 px-4 py-2 rounded-lg border border-gray-300 bg-white font-medium text-sm shadow-md transition-all duration-200
        ${atWorld
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-gray-50 hover:shadow-lg active:translate-y-px cursor-pointer'
        }`}
    >
      {'<- Back to World'}
    </button>
  );
}
