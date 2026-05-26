import { useState } from 'react'

const NAV = [
  { id: 'batch',    emoji: '📊', label: 'Batch Overview'  },
  { id: 'accuracy', emoji: '🎯', label: 'Accuracy Stats'  },
  { id: 'settings', emoji: '⚙️', label: 'Settings'        },
]

export default function Sidebar({ active, onNav }) {
  const [collapsed, setCollapsed] = useState(false)

  const W = collapsed ? 56 : 220

  return (
    <aside style={{
      width: W, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      background: 'var(--surface)',
      transition: 'width .25s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>
          📈
        </div>
        {!collapsed && (
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden' }}>
            Openbank Forecast
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              title={collapsed ? item.label : undefined}
              onClick={() => onNav(item.id)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--blue-bg)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-3)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background .15s, color .15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize:16, flexShrink:0 }}>{item.emoji}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding:'8px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            width:'100%', display:'flex', alignItems:'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap:8, padding: collapsed ? '8px 0' : '8px 12px',
            borderRadius:8, border:'none', background:'transparent',
            color:'var(--text-3)', fontSize:12, fontWeight:500,
            cursor:'pointer', fontFamily:'inherit',
            whiteSpace:'nowrap', overflow:'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize:14 }}>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
