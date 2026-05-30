/**
 * Sidebar
 *
 * Left navigation panel with collapsible width.
 * Contains the app logo and 5 navigation items.
 *
 * Collapsed state: 64px wide — shows icons only with title tooltips.
 * Expanded state: 220px wide — shows icons + labels.
 *
 * @param {string}   active — currently active page id
 * @param {Function} onNav  — called with page id when user clicks a nav item
 */
import { useState } from 'react'
import {
  LayoutDashboard, BarChart2, Settings, TrendingUp,
  Upload, PanelLeftClose, PanelLeft, TableProperties,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Navigation items ──────────────────────────────────────────────────────────

const NAV = [
  { id: 'batch',        Icon: LayoutDashboard, label: 'Batch Overview'        },
  { id: 'batch-detail', Icon: TableProperties, label: 'Batch Overview Detail' },
  { id: 'accuracy',     Icon: BarChart2,        label: 'Accuracy Stats'        },
  { id: 'import',       Icon: Upload,           label: 'Import CSV'            },
  { id: 'settings',     Icon: Settings,         label: 'Settings'              },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function Sidebar({ active, onNav }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border',
        'transition-[width] duration-250 ease-in-out overflow-hidden shrink-0',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-sidebar-border shrink-0">
        {/* Icon mark */}
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <TrendingUp size={16} className="text-sidebar-primary-foreground" />
        </div>
        {/* App name — hidden when collapsed */}
        {!collapsed && (
          <span className="text-[13px] font-semibold text-sidebar-foreground whitespace-nowrap">
            Openbank Forecast
          </span>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {NAV.map(({ id, Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              title={collapsed ? label : undefined}
              onClick={() => onNav(id)}
              className={cn(
                // Base layout
                'w-full flex items-center gap-2.5 mb-0.5 rounded-lg border-none',
                'text-[13px] font-medium cursor-pointer transition-colors duration-150',
                // Collapsed: center icon only
                collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2',
                // Active vs inactive styles
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
              style={{ fontFamily: 'inherit' }}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* ── Collapse toggle ───────────────────────────────────────────────── */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg border-none',
            'text-[13px] font-medium text-muted-foreground cursor-pointer',
            'bg-transparent hover:bg-sidebar-accent hover:text-sidebar-foreground',
            'transition-colors duration-150',
            collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2'
          )}
          style={{ fontFamily: 'inherit' }}
        >
          {collapsed
            ? <PanelLeft size={16} />
            : <><PanelLeftClose size={16} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  )
}
