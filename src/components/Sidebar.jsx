import { useState } from 'react'
import { LayoutDashboard, BarChart2, Settings, TrendingUp, Upload, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '../lib/utils.js'

const NAV = [
  { id: 'batch',    icon: LayoutDashboard, label: 'Batch Overview'  },
  { id: 'accuracy', icon: BarChart2,        label: 'Accuracy Stats'  },
  { id: 'settings', icon: Settings,         label: 'Settings'        },
]

export default function Sidebar({ active, onNav }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'border-r border-sidebar-border bg-sidebar flex flex-col transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-16' : 'w-[220px]'
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">
              Openbank Forecast
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {NAV.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onNav(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  active === item.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {collapsed ? (
          <button
            title="Upload CSV"
            onClick={() => onNav('batch')}
            className="w-full flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
          >
            <Upload className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => onNav('batch')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </button>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          )}
        >
          {collapsed
            ? <PanelLeft className="h-4 w-4" />
            : <><PanelLeftClose className="h-4 w-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  )
}
