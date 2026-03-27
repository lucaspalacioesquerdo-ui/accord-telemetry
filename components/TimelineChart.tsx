'use client'

import { useEffect, useRef } from 'react'
import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend)

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
                                                    c.font = '10px monospace'
                                                    c.fillText(refLine.label, left + 4, yPos - 4)
                                                    c.restore()
                                        }
                              })
                      }

                chartRef.current = new Chart(ctx, {
                        type: 'line',
                        data: {
                                  labels,
                                  datasets: datasets.map(d => ({
                                              label: d.label,
                                              data: d.data,
                                              borderColor: d.color,
                                              backgroundColor: d.color + '22',
                                              borderWidth: 2,
                                              pointRadius: 4,
                                              pointHoverRadius: 6,
                                              tension: 0.3,
                                              fill: false,
                                              spanGaps: true,
                                  }))
                        },
                        options: {
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                              legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
                                              tooltip: { mode: 'index', intersect: false },
                                  },
                                  scales: {
                                              x: {
                                                            ticks: { color: '#6b7280', font: { size: 10 } },
                                                            grid: { color: 'rgba(255,255,255,0.05)' },
                                              },
                                              y: {
                                                            min: yMin,
                                                            max: yMax,
                                                            ticks: {
                                                                            color: '#6b7280',
                                                                            font: { size: 10 },
                                                                            callback: (v: any) => unit ? `${v}${unit}` : v
                                                            },
                                                            grid: { color: 'rgba(255,255,255,0.05)' },
                                              }
                                  }
                        },
                        plugins,
                })

                return () => { chartRef.current?.destroy() }
  }, [labels, datasets, yMin, yMax, refLine, unit])

  return (
        <div className="w-full">
              <p className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">{title}</p>p>
              <div style={{ height: 180 }}>
                      <canvas ref={canvasRef} />
              </div>div>
        </div>div>
      )
}</div>
