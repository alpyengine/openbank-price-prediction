export default function SectorControls({
  sectors, industries,
  filterSector, filterIndustry,
  groupBySector, sortBySector,
  onFilterSectorChange, onFilterIndustryChange,
  onGroupToggle, onSortToggle,
}) {
  if (!sectors.length) return null

  const tabStyle = (active) => ({
    fontSize:'var(--fs-xxs)', padding:'3px 10px', borderRadius:20, cursor:'pointer',
    fontFamily:'inherit', fontWeight:600,
    border: active ? '1.5px solid var(--border-blue)' : '1.5px solid var(--border)',
    background: 'var(--surface)',
    color: active ? 'var(--accent)' : 'var(--text-2)',
  })

  const selectStyle = {
    fontSize:'var(--fs-xs)', padding:'3px 8px', borderRadius:'var(--radius)',
    border:'1px solid var(--border)', background:'var(--surface)',
    color:'var(--text)', outline:'none', fontFamily:'inherit', cursor:'pointer',
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem', flexWrap:'wrap' }}>

      {/* Sector filter */}
      <span style={{ fontSize:'var(--fs-sm)', color:'var(--text-3)', flexShrink:0 }}>Sector:</span>
      <select style={selectStyle} value={filterSector} onChange={e => onFilterSectorChange(e.target.value)}>
        <option value="all">All sectors</option>
        {sectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
      </select>

      {/* Industry filter — only shown when fundamentals loaded */}
      {industries.length > 0 && (
        <>
          <span style={{ fontSize:'var(--fs-sm)', color:'var(--text-3)', flexShrink:0 }}>Industry:</span>
          <select style={selectStyle} value={filterIndustry} onChange={e => onFilterIndustryChange(e.target.value)}>
            <option value="all">All industries</option>
            {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </>
      )}

      <div style={{ width:1, height:16, background:'var(--border)', flexShrink:0 }} />
      <button style={tabStyle(groupBySector)} onClick={onGroupToggle}>{groupBySector ? '▼' : '▶'} Group</button>
      <button style={tabStyle(sortBySector)}  onClick={onSortToggle}>↕ Sort by sector</button>
    </div>
  )
}
