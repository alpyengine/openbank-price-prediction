/**
 * SectorControls
 *
 * Filter and grouping controls displayed above the StockTable.
 * Only visible when fundamentals have been fetched (sectors available).
 *
 * Controls:
 *   - Sector filter dropdown
 *   - Industry filter dropdown (only when multiple industries present)
 *   - Group by sector toggle
 *   - Sort by sector toggle
 */
import { Filter, ArrowUpDown, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function SectorControls({
  sectors, industries,
  filterSector, filterIndustry,
  groupBySector, sortBySector,
  onFilterSectorChange, onFilterIndustryChange,
  onGroupToggle, onSortToggle,
}) {
  if (!sectors.length) return null

  const selectClass = 'text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground outline-none cursor-pointer font-inherit'

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <Filter size={13} className="text-muted-foreground" />

      {/* Sector filter */}
      <select
        className={selectClass}
        value={filterSector}
        onChange={e => onFilterSectorChange(e.target.value)}
      >
        <option value="all">All sectors</option>
        {sectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
      </select>

      {/* Industry filter — only shown when multiple industries */}
      {industries.length > 0 && (
        <select
          className={selectClass}
          value={filterIndustry}
          onChange={e => onFilterIndustryChange(e.target.value)}
        >
          <option value="all">All industries</option>
          {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
      )}

      <Separator orientation="vertical" className="h-4" />

      {/* Group by sector toggle */}
      <Button
        size="sm"
        variant={groupBySector ? 'default' : 'outline'}
        onClick={onGroupToggle}
        className="text-xs"
      >
        <Layers size={13} /> Group
      </Button>

      {/* Sort by sector toggle */}
      <Button
        size="sm"
        variant={sortBySector ? 'default' : 'outline'}
        onClick={onSortToggle}
        className="text-xs"
      >
        <ArrowUpDown size={13} /> Sort by sector
      </Button>
    </div>
  )
}
