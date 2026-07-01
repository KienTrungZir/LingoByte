import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Search, X, Filter, ZoomIn, ZoomOut, Maximize2, Activity, Atom, ChevronRight } from 'lucide-react'

const API = 'http://127.0.0.1:8000'

// HSK color palette - vibrant neon colors for dark theme
const HSK_COLORS = {
  1: { main: '#22d3ee', glow: 'rgba(34,211,238,0.5)', label: 'HSK 1' },   // cyan
  2: { main: '#34d399', glow: 'rgba(52,211,153,0.5)', label: 'HSK 2' },   // emerald
  3: { main: '#fbbf24', glow: 'rgba(251,191,36,0.5)', label: 'HSK 3' },   // amber
  4: { main: '#f97316', glow: 'rgba(249,115,22,0.5)', label: 'HSK 4' },   // orange
  5: { main: '#f43f5e', glow: 'rgba(244,63,94,0.5)', label: 'HSK 5' },    // rose
  6: { main: '#a855f7', glow: 'rgba(168,85,247,0.5)', label: 'HSK 6' },   // purple
}
const RADICAL_COLOR = { main: '#06b6d4', glow: 'rgba(6,182,212,0.6)' }
const DEFAULT_CHAR_COLOR = { main: '#94a3b8', glow: 'rgba(148,163,184,0.4)' }

const RadicalGraph = () => {
  const [data, setData] = useState({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hskFilter, setHskFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [animTick, setAnimTick] = useState(0)
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Resize observer
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Animation tick for glow pulse - slower to save CPU
  useEffect(() => {
    const interval = setInterval(() => setAnimTick(t => t + 1), 100)
    return () => clearInterval(interval)
  }, [])

  const fetchData = useCallback(() => {
    let url = `${API}/graph/data`
    const params = []
    if (hskFilter) params.push(`hsk_level=${hskFilter}`)
    if (params.length) url += '?' + params.join('&')
    
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .catch(err => console.error("Error:", err))
  }, [hskFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 300)
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() * 0.7, 300)
  const handleFit = () => graphRef.current?.zoomToFit(400, 50)

  const isFilterActive = searchTerm.trim().length > 0 || hskFilter !== ''

  const getLinkedNodeIds = useCallback((nodeId) => {
    if (!nodeId) return new Set()
    const linked = new Set()
    data.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      if (s === nodeId) linked.add(t)
      if (t === nodeId) linked.add(s)
    })
    return linked
  }, [data.links])

  const selectedLinkedIds = useMemo(() => getLinkedNodeIds(selectedNode?.id), [getLinkedNodeIds, selectedNode])

  const filteredData = useMemo(() => {
    // Determine which nodes should be visible
    const filteredNodes = data.nodes.filter(n => {
      // Radicals are always visible unless we are strictly filtering
      if (n.type === 'radical') {
        if (!isFilterActive && !selectedNode) return true;
        if (selectedNode?.id === n.id) return true;
        if (selectedNode && selectedLinkedIds.has(n.id)) return true;
        
        // If searching, check if radical matches
        if (searchTerm) {
          return n.label.includes(searchTerm) || 
                 (n.meaning || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (n.pinyin || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true; 
      }

      // Characters
      if (n.type === 'character') {
        // If no filter and no selection, show all (or limit if performance is an issue, but let's show all first)
        if (!isFilterActive && !selectedNode) return true;
        
        if (selectedNode && (selectedNode.id === n.id || selectedLinkedIds.has(n.id))) return true;

        let matchSearch = true;
        let matchHsk = true;
        
        if (searchTerm) {
          matchSearch = n.label.includes(searchTerm) || 
            (n.meaning || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (n.pinyin || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        if (hskFilter) {
          // hskFilter can be a number or a string like "HSK 1"
          const targetLevel = typeof hskFilter === 'string' ? parseInt(hskFilter.replace('HSK ', '')) : hskFilter;
          matchHsk = n.hsk_level === targetLevel;
        }
        
        return matchSearch && matchHsk;
      }
      
      return false;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter links to only show those between visible nodes
    const filteredLinks = data.links.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [data, selectedNode, selectedLinkedIds, searchTerm, hskFilter, isFilterActive])

  useEffect(() => {
    if (graphRef.current) {
      // Make lines longer (default is 30)
      graphRef.current.d3Force('link').distance(100)
      // Increase repulsion so nodes spread out more
      graphRef.current.d3Force('charge').strength(-400)
    }
  }, [filteredData])

  // Stats
  const stats = useMemo(() => {
    const radicals = filteredData.nodes.filter(n => n.type === 'radical').length
    const characters = filteredData.nodes.filter(n => n.type === 'character').length
    return { radicals, characters, links: filteredData.links.length }
  }, [filteredData])

  const getNodeColor = (node) => {
    if (node.type === 'radical') return RADICAL_COLOR
    if (node.hsk_level && HSK_COLORS[node.hsk_level]) return HSK_COLORS[node.hsk_level]
    return DEFAULT_CHAR_COLOR
  }

  // Pulse factor for animation
  const pulse = Math.sin(animTick * 0.08) * 0.3 + 1

  return (
    <div ref={containerRef} className="relative h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Top search bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-4 flex gap-2">
        <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-cyan-500/10 flex items-center px-4 py-2.5">
          <Search className="text-cyan-400 mr-3" size={18} />
          <input
            type="text"
            placeholder="Tìm bộ thủ hoặc chữ Hán..."
            className="bg-transparent border-none outline-none w-full text-slate-200 text-sm placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')}><X size={16} className="text-slate-500 hover:text-slate-300" /></button>}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${showFilters ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-cyan-500/20' : 'bg-slate-900/80 text-slate-400 border-slate-700/50 hover:border-slate-600'}`}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="absolute top-16 right-4 z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/30 p-5 w-56">
          <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Lọc theo HSK</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHskFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${!hskFilter ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >Tất cả</button>
            {[1,2,3,4,5,6].map(l => (
              <button
                key={l}
                onClick={() => setHskFilter(l)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300"
                style={{
                  background: hskFilter === l ? HSK_COLORS[l].main : 'rgb(30 41 59)',
                  color: hskFilter === l ? 'white' : HSK_COLORS[l].main,
                  boxShadow: hskFilter === l ? `0 4px 15px ${HSK_COLORS[l].glow}` : 'none',
                  border: `1px solid ${hskFilter === l ? HSK_COLORS[l].main : 'transparent'}`
                }}
              >HSK {l}</button>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thống kê</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Bộ thủ</span>
              <span className="text-sm font-bold text-cyan-400">{stats.radicals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Chữ Hán</span>
              <span className="text-sm font-bold text-slate-300">{stats.characters}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Liên kết</span>
              <span className="text-sm font-bold text-violet-400">{stats.links}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1.5">
        {[
          { icon: ZoomIn, fn: handleZoomIn },
          { icon: ZoomOut, fn: handleZoomOut },
          { icon: Maximize2, fn: handleFit },
        ].map(({ icon: Icon, fn }, i) => (
          <button key={i} onClick={fn} className="p-2.5 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-lg hover:bg-slate-800 hover:border-cyan-500/30 transition-all duration-300 text-slate-400 hover:text-cyan-400">
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-10 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-5 py-3 shadow-2xl">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shadow-lg" style={{ background: RADICAL_COLOR.main, boxShadow: `0 0 8px ${RADICAL_COLOR.glow}` }} />
            <span className="text-slate-400 font-medium">Bộ thủ</span>
          </span>
          {Object.entries(HSK_COLORS).map(([level, color]) => (
            <span key={level} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color.main, boxShadow: `0 0 6px ${color.glow}` }} />
              <span className="text-slate-500">{color.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredData}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel=""
        nodeCanvasObjectMode={() => 'replace'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          if (node.x === undefined || node.y === undefined) return
          const isRadical = node.type === 'radical'
          const isSelected = selectedNode?.id === node.id
          const isHovered = hoveredNode?.id === node.id
          const isLinked = selectedNode && selectedLinkedIds.has(node.id)
          const color = getNodeColor(node)

          const baseRadius = isRadical ? 16 : 12
          const radius = isSelected || isHovered ? baseRadius * 1.3 : baseRadius
          const fontSize = isRadical ? 16 : 12

          // Outer glow ring
          if (isSelected || isHovered || isLinked) {
            const glowSize = radius * (isSelected ? 2.5 : 2) * pulse
            const gradient = ctx.createRadialGradient(node.x, node.y, radius * 0.5, node.x, node.y, glowSize)
            gradient.addColorStop(0, color.glow)
            gradient.addColorStop(1, 'transparent')
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(node.x, node.y, glowSize, 0, 2 * Math.PI)
            ctx.fill()
          }

          // Node ring (border) - always show for visibility
          ctx.strokeStyle = color.main
          ctx.lineWidth = isSelected ? 2.5 : isRadical ? 1.5 : 1
          ctx.globalAlpha = isRadical || isSelected || isHovered ? 1 : 0.7
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1

          // Node body - gradient fill
          const bodyGrad = ctx.createRadialGradient(
            node.x - radius * 0.3, node.y - radius * 0.3, 0,
            node.x, node.y, radius
          )
          bodyGrad.addColorStop(0, isRadical ? '#155e75' : '#1e293b')
          bodyGrad.addColorStop(1, isRadical ? '#0e4558' : '#0f172a')
          ctx.fillStyle = bodyGrad
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
          ctx.fill()

          // Character text
          ctx.font = `bold ${fontSize}px "Inter", "Noto Sans SC", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = color.main
          ctx.fillText(node.label, node.x, node.y)

          // Meaning label below (only when zoomed in enough or selected/hovered)
          if ((globalScale > 1.5 || isSelected || isHovered) && node.meaning) {
            const labelSize = 10
            ctx.font = `${labelSize}px "Inter", sans-serif`
            ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'
            const meaningText = node.meaning.length > 12 ? node.meaning.slice(0, 12) + '…' : node.meaning
            ctx.fillText(meaningText, node.x, node.y + radius + labelSize + 2)
          }
        }}
        onNodeClick={(node) => setSelectedNode(prev => prev?.id === node.id ? null : node)}
        onNodeHover={(node) => setHoveredNode(node || null)}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={(link, ctx) => {
          const source = link.source
          const target = link.target
          if (!source.x || !target.x) return

          const isHighlighted = selectedNode && (
            (typeof link.source === 'object' ? link.source.id : link.source) === selectedNode.id ||
            (typeof link.target === 'object' ? link.target.id : link.target) === selectedNode.id
          )

          // Gradient link
          const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y)
          if (isHighlighted) {
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.6)')
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.6)')
          } else {
            gradient.addColorStop(0, 'rgba(51, 65, 85, 0.3)')
            gradient.addColorStop(1, 'rgba(51, 65, 85, 0.15)')
          }

          ctx.strokeStyle = gradient
          ctx.lineWidth = isHighlighted ? 1.5 : 0.5
          ctx.beginPath()
          ctx.moveTo(source.x, source.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }}
        backgroundColor="transparent"
        d3VelocityDecay={0.3}
        warmupTicks={80}
        d3AlphaDecay={0.02}
        cooldownTime={3000}
        onEngineStop={() => graphRef.current?.zoomToFit(600, 80)}
        nodePointerAreaPaint={(node, color, ctx) => {
          if (node.x === undefined || node.y === undefined) return
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI)
          ctx.fill()
        }}
      />

      {/* Info Panel */}
      {selectedNode && (
        <div 
          className="absolute top-0 right-0 h-full w-80 z-20"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.97) 100%)',
            borderLeft: '1px solid rgba(51, 65, 85, 0.5)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)'
          }}
        >
          <div className="p-6 h-full overflow-y-auto">
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} className="text-slate-500" />
            </button>

            <div className="mt-8 flex flex-col items-center">
              {/* Character display with glow */}
              <div className="relative mb-6">
                <div 
                  className="absolute inset-0 rounded-3xl blur-xl"
                  style={{ background: getNodeColor(selectedNode).glow, transform: 'scale(1.5)' }}
                />
                <div 
                  className="relative text-6xl font-black w-24 h-24 flex items-center justify-center rounded-3xl border-2"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,27,75,0.9))',
                    borderColor: getNodeColor(selectedNode).main,
                    color: getNodeColor(selectedNode).main,
                    boxShadow: `0 0 30px ${getNodeColor(selectedNode).glow}`
                  }}
                >
                  {selectedNode.label}
                </div>
              </div>

              {/* Type badge */}
              <span 
                className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
                style={{
                  background: `${getNodeColor(selectedNode).main}20`,
                  color: getNodeColor(selectedNode).main,
                  border: `1px solid ${getNodeColor(selectedNode).main}40`
                }}
              >
                {selectedNode.type === 'radical' ? '部首 Bộ thủ' : '汉字 Chữ Hán'}
              </span>

              {/* Info cards */}
              <div className="w-full space-y-3">
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/30">
                  <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Ý nghĩa</p>
                  <p className="text-base font-bold text-slate-200">{selectedNode.meaning || '—'}</p>
                </div>

                {selectedNode.pinyin && (
                  <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Pinyin</p>
                    <p className="text-base font-bold text-cyan-400">{selectedNode.pinyin}</p>
                  </div>
                )}

                {selectedNode.hsk_level && (
                  <div 
                    className="rounded-xl p-4 border"
                    style={{ 
                      background: `${HSK_COLORS[selectedNode.hsk_level]?.main}10`,
                      borderColor: `${HSK_COLORS[selectedNode.hsk_level]?.main}30`
                    }}
                  >
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">HSK Level</p>
                    <p className="text-lg font-black" style={{ color: HSK_COLORS[selectedNode.hsk_level]?.main }}>
                      HSK {selectedNode.hsk_level}
                    </p>
                  </div>
                )}

                {selectedNode.stroke_count && (
                  <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Số nét</p>
                    <p className="text-base font-bold text-violet-400">{selectedNode.stroke_count} nét</p>
                  </div>
                )}

                {/* Connected nodes count */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/30">
                  <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Liên kết</p>
                  <p className="text-base font-bold text-emerald-400">
                    {selectedLinkedIds.size} {selectedNode.type === 'radical' ? 'chữ Hán' : 'bộ thủ'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RadicalGraph
