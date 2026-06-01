/**
 * chart.jsx — shadcn/ui ChartContainer + ChartTooltip components
 *
 * Provides a consistent theming wrapper for Recharts charts.
 * CSS variables (--chart-1 through --chart-5) are defined in global.css.
 *
 * Usage:
 *   <ChartContainer config={chartConfig}>
 *     <LineChart data={data}>...</LineChart>
 *   </ChartContainer>
 */
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

const THEMES = { light: '', dark: '.dark' }

export function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

const ChartContext = React.createContext(null)

export function ChartContainer({ id, className, children, config, ...props }) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "w-full",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color)
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) =>
            `${prefix} [data-chart=${id}] {\n${colorConfig
              .map(([key, cfg]) => {
                const color = cfg.theme?.[theme] || cfg.color
                return color ? `  --color-${key}: ${color};` : null
              })
              .filter(Boolean)
              .join('\n')}\n}`
          )
          .join('\n'),
      }}
    />
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null
    const [item] = payload
    const key = `${labelKey || item.dataKey || item.name || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value = !labelKey && typeof label === 'string'
      ? config[label]?.label || label
      : itemConfig?.label

    if (labelFormatter) {
      return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>
    }
    return value ? <div className={cn('font-medium', labelClassName)}>{value}</div> : null
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!active || !payload?.length) return null

  const nestLabel = payload.length === 1 && indicator !== 'dot'

  return (
    <div className={cn(
      'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
      className
    )}>
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = color || item.payload.fill || item.color

          return (
            <div
              key={item.dataKey}
              className={cn(
                'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                indicator === 'dot' && 'items-center'
              )}
            >
              {!hideIndicator && (
                <div
                  className={cn(
                    'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                    indicator === 'dot' && 'h-2.5 w-2.5 rounded-full',
                    indicator === 'line' && 'w-1',
                    indicator === 'dashed' && 'w-0 border-[1.5px] border-dashed bg-transparent',
                    nestLabel && indicator === 'dashed' && 'my-0.5'
                  )}
                  style={{ '--color-bg': indicatorColor, '--color-border': indicatorColor }}
                />
              )}
              <div className={cn(
                'flex flex-1 justify-between leading-none',
                nestLabel ? 'items-end' : 'items-center'
              )}>
                <div className="grid gap-1.5">
                  {nestLabel ? tooltipLabel : null}
                  <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                </div>
                {item.value !== undefined && (
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatter ? formatter(item.value, item.name, item, index, item.payload)
                      : item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartLegend(props) {
  return <RechartsPrimitive.Legend {...props} />
}

export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}) {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div className={cn(
      'flex items-center justify-center gap-4',
      verticalAlign === 'top' ? 'pb-3' : 'pt-3',
      className
    )}>
      {payload.map(item => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        return (
          <div key={item.value} className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground">
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
}

function getPayloadConfigFromPayload(config, payload, key) {
  if (typeof payload !== 'object' || payload === null) return undefined
  const payloadPayload = 'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
    ? payload.payload : undefined

  let configLabelKey = key
  if (key in payload && typeof payload[key] === 'string') {
    configLabelKey = payload[key]
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === 'string') {
    configLabelKey = payloadPayload[key]
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}
