'use client'

import { useEffect, useRef } from 'react'
import {
  Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Filler, Legend, type Plugin,
} from 'chart.js'
import type { TooltipItem } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend)

export interface TimelineChartProps {
  labels: string[]
  datasets: {
    label: string
    data: (number | null)[]
    color: string
    alarmFn?: (v: number) => boolean
  }[]
  title: string
  unit?: string
  yMin?: number
  yMax?: number
  refLine?: { value: number; label: string; color?: string }
}

export default function TimelineChart({
  labels, datasets, title, unit, yMin, yMax, refLine,
}: TimelineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    const ctx = canvasRef.current.getContext('2d')!

    // Auto-scale: always fit all data points with padding
    const allVals = datasets.flatMap(d => d.data.filter((v): v is number => v != null))
    const dataMin = allVals.length ? Math.min(...allVals) : 0
    const dataMax = allVals.length ? Math.max(...allVals) : 1
    const range   = Math.max(dataMax - dataMin, 0.1)
    const pad     = Math.max(range * 0.15, 0.5)

    // User hints are minimum bounds, data always wins
    const scaleMin = yMin != null ? Math.min(yMin, dataMin - pad) : dataMin - pad
    const scaleMax = yMax != null ? Math.max(yMax, dataMax + pad) : dataMax + pad

    // Alarm overlay plugin
    const alarmPlugin = {
      id: 'alarmPoints',
      afterDatasetsDraw(chart: Chart) {
        const c = chart.ctx
        datasets.forEach((ds, di) => {
          if (!ds.alarmFn) return
          const meta = chart.getDatasetMeta(di)
          ds.data.forEach((val, i) => {
            if (val == null || !ds.alarmFn!(val)) return
            const el = meta.data[i]
            if (!el) return
            // PointElement has getCenterPoint -- cast safely
            const center = (el as unknown as { getCenterPoint(): {x:number;y:number} }).getCenterPoint()
            c.save()
            c.fillStyle = '#ff3030'
            c.font = 'bold 11px sans-serif'
            c.textAlign = 'center'
            c.fillText('!', center.x, center.y - 9)
            c.restore()
          })
        })
      },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = [alarmPlugin]

    if (refLine) {
      plugins.push({
        id: 'refLine',
        afterDraw(chart: Chart<'line'>) {
          const anyChart = chart as unknown as {
            ctx: CanvasRenderingContext2D
            chartArea: { left: number; right: number }
            scales: { y: { getPixelForValue(v: number): number } }
          }
          const { ctx: c, chartArea: { left, right }, scales: { y } } = anyChart
          const yPos = y.getPixelForValue(refLine.value)
          c.save()
          c.setLineDash([4, 4])
          c.strokeStyle = refLine.color ?? 'rgba(255,255,255,0.15)'
          c.lineWidth = 1
          c.beginPath()
          c.moveTo(left, yPos)
          c.lineTo(right, yPos)
          c.stroke()
          c.setLineDash([])
          c.fillStyle = refLine.color ?? 'rgba(255,255,255,0.3)'
          c.font = "9px 'IBM Plex Mono'"
          c.fillText(refLine.label, left + 4, yPos - 4)
          c.restore()
        },
      })
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      plugins,
      data: {
        labels,
        datasets: datasets.map(d => {
          const gradient = ctx.createLinearGradient(0, 0, 0, 160)
          gradient.addColorStop(0, d.color + '28')
          gradient.addColorStop(1, d.color + '00')
          const pointColors = d.data.map(v =>
            v != null && d.alarmFn?.(v) ? '#ff3030' : d.color
          )
          const pointRadii = d.data.map(v =>
            v != null && d.alarmFn?.(v) ? 6 : 4
          )
          return {
            label: d.label,
            data: d.data,
            borderColor: d.color,
            backgroundColor: gradient,
            borderWidth: 1.5,
            pointRadius: pointRadii,
            pointHoverRadius: 7,
            pointBackgroundColor: pointColors,
            pointBorderColor: '#07090c',
            pointBorderWidth: 2,
            tension: 0.3,
            fill: true,
            spanGaps: true,
          }
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeInOutQuart' },
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: {
              color: '#465a6e',
              font: { family: "'IBM Plex Mono'", size: 10 },
              boxWidth: 8,
              padding: 12,
            },
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: '#0c0f14',
            borderColor: '#1a2330',
            borderWidth: 1,
            titleColor: '#f97316',
            bodyColor: '#94a3b8',
            titleFont: { family: "'IBM Plex Mono'", size: 11, weight: 'bold' as const },
            bodyFont:  { family: "'IBM Plex Mono'", size: 10 },
            padding: 10,
            callbacks: {
              title: (items: TooltipItem<'line'>[]) => items[0]?.label ?? '',
              label: (item: TooltipItem<'line'>) => {
                const v = item.parsed.y
                if (v == null) return ''
                const ds = datasets[item.datasetIndex]
                const alarm = ds?.alarmFn?.(v) ? ' !' : ''
                return ` ${item.dataset.label}: ${v.toFixed(2)}${unit ? ' ' + unit : ''}${alarm}`
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1a2330' },
            ticks: {
              color: '#465a6e',
              font: { family: "'IBM Plex Mono'", size: 9 },
              maxRotation: 35,
            },
          },
          y: {
            grid: { color: '#1a2330' },
            ticks: {
              color: '#465a6e',
              font: { family: "'IBM Plex Mono'", size: 9 },
              callback: (v: number | string) => `${v}${unit ?? ''}`,
            },
            min: scaleMin,
            max: scaleMax,
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [labels, datasets, yMin, yMax, refLine, unit])

  return (
    <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase' as const, color:'#64748b', fontFamily:"'IBM Plex Mono'", marginBottom:14 }}>
        {title}
      </div>
      <div style={{ position:'relative', height:160 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
