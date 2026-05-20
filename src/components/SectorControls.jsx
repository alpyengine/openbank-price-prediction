export default function SectorControls({ sectors, filterSector, groupBySector, sortBySector, onFilterChange, onGroupToggle, onSortToggle }) {
  if (!sectors.length) return null

  const tabStyle = (active) => ({
    fontSize:'var(--fs-xxs)', padding:'3px 10px', borderRadius:20, cursor:'pointer', fontFamily:'inherit', fontWeight:600,
    border: active ? '1.5px solid var(--border-blue)' : '1.5px solid var(--border)',
    background: 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text-2)',
  })

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem', flexWrap:'wrap' }}>
      <span style={{ fontSize:'var(--fs-sm)', color:'var(--text-3)', flexShrink:0 }}>Sector:</span>
      <select
        style={{ fontSize:'var(--fs-xs)', padding:'3px 8px', borderRadius:'var(--radius)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', outline:'none', fontFamily:'inherit', cursor:'pointer' }}
        value={filterSector}
        onChange={e => onFilterChange(e.target.value)}
      >
        <option value="all">All sectors</option>
        {sectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
      </select>
      <div style={{ width:1, height:16, background:'var(--border)', flexShrink:0 }} />
      <button style={tabStyle(groupBySector)} onClick={onGroupToggle}>{groupBySector ? '▼' : '▶'} Group</button>
      <button style={tabStyle(sortBySector)}  onClick={onSortToggle}>↕ Sort by sector</button>
    </div>
  )
}
