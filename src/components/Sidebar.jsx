import { useState } from 'react'
import { LayoutDashboard, BarChart2, Settings, TrendingUp, Upload, PanelLeftClose, PanelLeft } from 'lucide-react'

const NAV = [
  { id: 'batch',    Icon: LayoutDashboard, label: 'Batch Overview' },
  { id: 'accuracy', Icon: BarChart2,        label: 'Accuracy Stats' },
  { id: 'settings', Icon: Settings,         label: 'Settings'       },
]

export default function Sidebar({ active, onNav, onUploadCSV }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--tw-sidebar)',
      borderRight: '1px solid var(--tw-sidebar-border)',
      transition: 'width .25s ease',
      overflow: 'hidden',
      height: '100%',
    }}>

      {/* Logo */}
      <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--tw-sidebar-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--tw-sidebar-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TrendingUp size={16} color="var(--tw-sidebar-primary-fg)" />
          </div>
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tw-sidebar-fg)', whiteSpace: 'nowrap' }}>
              Openbank Forecast
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {NAV.map(({ id, Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              title={collapsed ? label : undefined}
              onClick={() => onNav(id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '9px 12px',
                marginBottom: 2,
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--tw-sidebar-accent)' : 'transparent',
                color: isActive ? 'var(--tw-sidebar-accent-fg)' : 'var(--tw-muted-fg)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background .15s, color .15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--tw-sidebar-accent)'; e.currentTarget.style.color = 'var(--tw-sidebar-fg)' }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tw-muted-fg)' }}}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--tw-sidebar-border)', flexShrink: 0 }}>
        {/* Upload CSV button */}
        {collapsed ? (
          <button
            title="Upload CSV"
            onClick={onUploadCSV}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'9px 0', marginBottom:4, borderRadius:8, border:'none', background:'transparent', color:'var(--tw-muted-fg)', cursor:'pointer', transition:'background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tw-sidebar-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Upload size={16} />
          </button>
        ) : (
          <button
            onClick={onUploadCSV}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 12px', marginBottom:4, borderRadius:8, border:'1px solid var(--tw-sidebar-border)', background:'transparent', color:'var(--tw-muted-fg)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tw-sidebar-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Upload size={16} />
            <span>Upload CSV</span>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            width:'100%', display:'flex', alignItems:'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, padding: collapsed ? '9px 0' : '9px 12px',
            borderRadius: 8, border: 'none', background: 'transparent',
            color: 'var(--tw-muted-fg)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tw-sidebar-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
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
