import { useState } from 'react'
import { cn } from '../lib/utils.js'

const NAV = [
  { id: 'batch',    icon: '📊', label: 'Batch Overview'  },
  { id: 'accuracy', icon: '🎯', label: 'Accuracy Stats'  },
  { id: 'settings', icon: '⚙️', label: 'Settings'        },
]

export default function Sidebar({ active, onNav }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-14' : 'w-[220px]'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span style={{ fontSize: 14 }}>📈</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-sidebar-foreground tracking-tight truncate">
            Openbank Forecast
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {NAV.map(item => (
          <button
            key={item.id}
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
            <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-border">
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <span style={{ fontSize: 14 }}>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
