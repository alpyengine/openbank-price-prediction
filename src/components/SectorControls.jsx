const s = {
  bar:      { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem', flexWrap: 'wrap' },
  label:    { fontSize: 11, color: '#8b949e', flexShrink: 0 },
  select:   { fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #30363d', background: '#161b22', color: '#e6edf3', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' },
  toggle:   { fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid #30363d', cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: '#8b949e' },
  toggleOn: { border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff' },
  divider:  { width: 1, height: 16, background: '#30363d', flexShrink: 0 },
}

export default function SectorControls({
  sectors,         // string[] — all unique sectors
  filterSector,    // string — currently selected sector filter ('all' or sector name)
  groupBySector,   // boolean
  sortBySector,    // boolean
  onFilterChange,
  onGroupToggle,
  onSortToggle,
}) {
  if (!sectors.length) return null

  return (
    <div style={s.bar}>
      <span style={s.label}>Sector:</span>

      {/* Filter dropdown */}
      <select
        style={s.select}
        value={filterSector}
        onChange={e => onFilterChange(e.target.value)}
      >
        <option value="all">All sectors</option>
        {sectors.map(sec => (
          <option key={sec} value={sec}>{sec}</option>
        ))}
      </select>

      <div style={s.divider} />

      {/* Group toggle */}
      <button
        style={{ ...s.toggle, ...(groupBySector ? s.toggleOn : {}) }}
        onClick={onGroupToggle}
      >
        {groupBySector ? '&#9660;' : '&#9658;'} Group
      </button>

      {/* Sort toggle */}
      <button
        style={{ ...s.toggle, ...(sortBySector ? s.toggleOn : {}) }}
        onClick={onSortToggle}
      >
        &#8597; Sort by sector
      </button>
    </div>
  )
}
