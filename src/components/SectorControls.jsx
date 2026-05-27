import { Filter, ArrowUpDown, Layers } from 'lucide-react'

export default function SectorControls({
  sectors, industries,
  filterSector, filterIndustry,
  groupBySector, sortBySector,
  onFilterSectorChange, onFilterIndustryChange,
  onGroupToggle, onSortToggle,
}) {
  if (!sectors.length) return null

  const selectStyle = {
    fontSize:12, padding:'5px 10px', borderRadius:8,
    border:'1px solid var(--tw-border)',
    background:'var(--tw-card)',
    color:'var(--tw-fg)', outline:'none',
    fontFamily:'inherit', cursor:'pointer',
  }

  const toggleBtn = (active) => ({
    display:'inline-flex', alignItems:'center', gap:5,
    fontSize:12, padding:'5px 12px', borderRadius:8,
    cursor:'pointer', fontFamily:'inherit', fontWeight:500,
    border: active ? '1px solid var(--tw-primary)' : '1px solid var(--tw-border)',
    background: active ? 'var(--tw-primary)' : 'var(--tw-card)',
    color: active ? 'var(--tw-card)' : 'var(--tw-muted-fg)',
    transition:'all .15s',
  })

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.75rem', flexWrap:'wrap' }}>
      <Filter size={13} color="var(--tw-muted-fg)" />

      <select style={selectStyle} value={filterSector} onChange={e => onFilterSectorChange(e.target.value)}>
        <option value="all">All sectors</option>
        {sectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
      </select>

      {industries.length > 0 && (
        <select style={selectStyle} value={filterIndustry} onChange={e => onFilterIndustryChange(e.target.value)}>
          <option value="all">All industries</option>
          {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
      )}

      <div style={{ width:1, height:16, background:'var(--tw-border)' }} />

      <button style={toggleBtn(groupBySector)} onClick={onGroupToggle}>
        <Layers size={13} /> Group
      </button>
      <button style={toggleBtn(sortBySector)} onClick={onSortToggle}>
        <ArrowUpDown size={13} /> Sort by sector
      </button>
    </div>
  )
}
