// Hover tooltip element. Content is written imperatively by useMapInteractions
// (via the forwarded ref) because it follows the cursor at pointer-event speed;
// React owns only its static styling.
export function MapTooltip({ tooltipRef }) {
  return (
    <div
      ref={tooltipRef}
      style={{
        display: 'none',
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        pointerEvents: 'none',
        zIndex: 1000,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    />
  );
}
