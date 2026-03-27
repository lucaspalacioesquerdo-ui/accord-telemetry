'use client'

import { useEffect, useRef } from 'react'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Filler, Legend,
} from 'chart.js'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend)

interface TimelineChartProps {
  labels: string[]
  datasets: {
    label: string
    data: (number | null)[]
    color: string
  }[]
  title: string
  unit?: string
  yMin?: number
  yMax?: number
  refLine?: { value: number; label: string; color?: string }
}

export default function TimelineChart({
  labels, datasets, title, unit, yMin, yMax, refLine
}: TimelineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const ctx = canvasRef.current.getContext('2d')!

    const plugins: any[] = []
    if (refLine) {
      plugins.push({
        id: 'refLine',
        afterDraw(chart: Chart) {
          const { ctx: c, chartArea: { left, right }, scales: { y } } = chart as any
          const yPos = y.getPixelForValue(refLine.value)
          c.save()
          c.setLineDash([4, 4])
          c.strokeStyle = refLine.color || 'rgba(255,255,255,0.15)'
          c.lineWidth = 1
          c.beginPath(); c.moveTo(left, yPos); c.lineTo(right, yPos); c.stroke()
          c.setLineDash([])
          c.fillStyle = refLine.color || 'rgba(255,255,255,0.3)'
          c.font = "9px 'IBM Plex Mono'"
          c.fillText(refLine.label, left + 4, yPos - 4)
          c.restore()
        }
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
          return {
            label: d.label,
            data: d.data,
            borderColor: d.color,
            backgroundColor: gradient,
            borderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: d.color,
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
        animation: { duration: 600, easing: 'easeInOutQuart' },
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: {
              color: '#465a6e',
              font: { family: "'IBM Plex Mono'", size: 10 },
              boxWidth: 8, padding: 12,
            },
          },
          tooltip: {
            backgroundColor: '#0c0f14',
            borderColor: '#1a2330',
            borderWidth: 1,
            titleColor: '#c8d4e0',
            bodyColor: '#465a6e',
            titleFont: { family: "'IBM Plex Mono'", size: 11 },
            bodyFont:  { family: "'IBM Plex Mono'", size: 10 },
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2)}${unit ? ' ' + unit : ''}`,
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
              callback: (v) => `${v}${unit ? unit : ''}`,
            },
            ...(yMin != null ? { min: yMin } : {}),
            ...(yMax != null ? { max: yMax } : {}),
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [labels, datasets, yMin, yMax, refLine, unit])

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="label-xs" style={{ marginBottom: 14 }}>{title}</div>
      <div style={{ position: 'relative', height: 160 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
