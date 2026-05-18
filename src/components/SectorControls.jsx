export default function SectorControls({ sectors, filterSector, groupBySector, sortBySector, onFilterChange, onGroupToggle, onSortToggle }) {
  if (!sectors.length) return null

  const toggleStyle = (active) => ({
    fontSize:11, padding:'3px 10px', borderRadius:20, cursor:'pointer', fontFamily:'inherit',
    border: active ? '1px solid var(--blue-bdr)' : '1px solid var(--border)',
    background: active ? 'var(--blue-bg)' : 'transparent',
    color: active ? 'var(--blue)' : 'var(--text-2)',
  })

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem', flexWrap:'wrap' }}>
      <span style={{ fontSize:11, color:'var(--text-2)', flexShrink:0 }}>Sector:</span>
      <select
        style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-2)', color:'var(--text)', cursor:'pointer', outline:'none', fontFamily:'inherit' }}
        value={filterSector}
        onChange={e => onFilterChange(e.target.value)}
      >
        <option value="all">All sectors</option>
        {sectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
      </select>
      <div style={{ width:1, height:16, background:'var(--border)', flexShrink:0 }} />
      <button style={toggleStyle(groupBySector)} onClick={onGroupToggle}>{groupBySector ? '▼' : '▶'} Group</button>
      <button style={toggleStyle(sortBySector)}  onClick={onSortToggle}>↕ Sort by sector</button>
    </div>
  )
}
