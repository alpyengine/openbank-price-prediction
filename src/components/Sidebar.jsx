/**
 * Sidebar
 *
 * Left navigation panel with collapsible width.
 * Contains the app logo, 5 navigation items, and the UserPanel
 * at the bottom for profile, settings, and sign out.
 *
 * Collapsed state: 64px wide — shows icons only with title tooltips.
 * Expanded state: 220px wide — shows icons + labels.
 *
 * @param {string}   active        — currently active page id
 * @param {Function} onNav         — called with page id when user clicks a nav item
 * @param {boolean}  darkMode      — current dark mode state
 * @param {Function} onToggleDark  — toggle dark/light mode
 * @param {Function} onManageUsers — navigate to Manage Users page
 */
import { useState } from 'react'
import {
  LayoutDashboard, BarChart2, Settings, TrendingUp,
  Upload, Download, PanelLeftClose, PanelLeft, TableProperties, Globe, HelpCircle, Star, Waves,
} from 'lucide-react'
import UserPanel from './UserPanel.jsx'
import { cn } from '@/lib/utils'

// ── Navigation items ──────────────────────────────────────────────────────────

const NAV = [
  { id: 'batch',        Icon: LayoutDashboard, label: 'Batch Overview'        },
  { id: 'batch-detail', Icon: TableProperties, label: 'Batch Overview Detail' },
  { id: 'accuracy',     Icon: BarChart2,        label: 'Accuracy Stats'        },
  { id: 'all-stocks',   Icon: Globe,            label: 'All Stocks'            },
  { id: 'wave-script',  Icon: Waves,            label: 'Wave Script'           },
  { id: 'watchlist',    Icon: Star,             label: 'Watchlist'             },
  { id: 'export',       Icon: Download,         label: 'Export'                },
  { id: 'import',       Icon: Upload,           label: 'Import CSV'            },
  { id: 'settings',     Icon: Settings,         label: 'Settings'              },
  { id: 'help',         Icon: HelpCircle,       label: 'Help & About'          },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function Sidebar({ active, onNav, darkMode, onToggleDark, onManageUsers }) {
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
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <TrendingUp size={16} className="text-sidebar-primary-foreground" />
        </div>
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
                'w-full flex items-center gap-2.5 mb-0.5 rounded-lg border-none',
                'text-[13px] font-medium cursor-pointer transition-colors duration-150',
                collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2',
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

      {/* ── Bottom section: collapse toggle + user panel ──────────────────── */}
      <div className="p-2 border-t border-sidebar-border shrink-0 flex flex-col gap-1">

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg border-none',
            'text-[13px] font-medium text-muted-foreground cursor-pointer',
            'bg-transparent hover:bg-sidebar-accent hover:text-sidebar-foreground',
            'transition-colors duration-150',
            collapsed ? 'justify-center px-0 py-2' : 'justify-start px-3 py-2'
          )}
          style={{ fontFamily: 'inherit' }}
        >
          {collapsed
            ? <PanelLeft size={16} />
            : <><PanelLeftClose size={16} /><span>Collapse</span></>
          }
        </button>

        {/* User panel — profile, dark mode, sign out */}
        <UserPanel
          collapsed={collapsed}
          darkMode={darkMode}
          onToggleDark={onToggleDark}
          onManageUsers={onManageUsers}
        />
      </div>
    </aside>
  )
}
