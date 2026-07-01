import React, { useRef, useState, useEffect } from 'react'
import { Eraser, RotateCcw, CheckCircle2 } from 'lucide-react'

const HandwritingCanvas = ({ charToPractice }) => {
  const canvasRef = useRef(null)
  const [strokes, setStrokes] = useState([])
  const [currentStroke, setCurrentStroke] = useState([])
  const [loading, setLoading] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [score, setScore] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.lineWidth = 12 // Thicker lines for better feature extraction
    ctx.strokeStyle = '#1e293b'
  }, [])

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(offsetX, offsetY)
    setIsDrawing(true)
    setCurrentStroke([[offsetX, offsetY]])
  }

  const draw = (e) => {
    if (!isDrawing) return
    const { offsetX, offsetY } = getCoordinates(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(offsetX, offsetY)
    ctx.stroke()
    setCurrentStroke(prev => [...prev, [offsetX, offsetY]])
  }

  const stopDrawing = () => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke])
    }
    setIsDrawing(false)
    setCurrentStroke([])
  }

  const getCoordinates = (e) => {
    if (e.touches) {
      const rect = canvasRef.current.getBoundingClientRect()
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top
      }
    }
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setScore(null)
    setStrokes([])
  }

  const submitDrawing = async () => {
    if (strokes.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/handwriting/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_char: charToPractice,
          strokes: strokes
        })
      })
      const data = await response.json()
      setScore(data.score)
    } catch (error) {
      console.error('Error scoring handwriting:', error)
      // Fallback for demo
      setScore(0.0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Hãy viết chữ</h3>
        <div className="text-6xl font-bold text-slate-800 mb-4">{charToPractice}</div>
      </div>

      <div className="relative zen-card p-2 bg-slate-100 border-2 border-slate-200">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="bg-white rounded-xl cursor-crosshair touch-none"
        />
        
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          <button 
            onClick={clearCanvas}
            className="p-3 bg-white/90 backdrop-blur shadow-md rounded-full hover:bg-white transition-colors text-slate-600"
            title="Xóa"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-[400px]">
        <button 
          onClick={submitDrawing}
          disabled={loading || strokes.length === 0}
          className={`zen-button flex-1 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 size={20} />
          )}
          {loading ? 'Đang chấm điểm...' : 'Kiểm tra nét vẽ'}
        </button>
      </div>

      {score && (
        <div className="zen-card bg-teal-50 border-teal-100 flex items-center gap-4 w-full max-w-[400px] animate-in zoom-in duration-300">
          <div className="p-3 bg-teal-600 rounded-2xl text-white font-bold">
            {score}%
          </div>
          <div>
            <p className="font-bold text-teal-800">Tuyệt vời!</p>
            <p className="text-sm text-teal-600">Nét vẽ của bạn rất chính xác.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default HandwritingCanvas
