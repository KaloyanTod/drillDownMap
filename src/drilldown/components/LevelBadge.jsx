// Small read-out of the current drill level / country / region.
export function LevelBadge({ selection }) {
  return (
    <div className="absolute top-2.5 right-2.5 z-10 px-3 py-2 rounded-lg bg-white/90 text-xs font-mono border border-gray-200">
      Level: {selection.level}
      {selection.countryISO && <><br />Country: {selection.countryISO}</>}
      {selection.regionID && <><br />Region: {selection.regionID}</>}
    </div>
  );
}
