import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { socket } from '../socket.js';

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { canDraw, color, brushSize, tool, initialStrokes = [] },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const segmentsRef = useRef([]);
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  const strokeIdRef = useRef(null);

  const propsRef = useRef({ canDraw, color, brushSize, tool });
  propsRef.current = { canDraw, color, brushSize, tool };

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    redraw();
  }, []);

  const dims = () => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  };

  const drawSegment = useCallback((seg) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = dims();
    ctx.globalCompositeOperation = seg.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = seg.size;
    ctx.beginPath();
    ctx.moveTo(seg.x0 * w, seg.y0 * h);
    ctx.lineTo(seg.x1 * w, seg.y1 * h);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const { w, h } = dims();
    ctx.clearRect(0, 0, w, h);
    for (const seg of segmentsRef.current) drawSegment(seg);
  }, [drawSegment]);

  const clearLocal = useCallback(() => {
    segmentsRef.current = [];
    redraw();
  }, [redraw]);

  useImperativeHandle(ref, () => ({
    clear() {
      clearLocal();
      socket.emit('canvas_clear');
    },
    undo() {
      const segs = segmentsRef.current;
      if (segs.length === 0) return;
      const lastId = segs[segs.length - 1].strokeId;
      segmentsRef.current = segs.filter((s) => s.strokeId !== lastId);
      redraw();
      socket.emit('draw_undo', { strokeId: lastId });
    },
  }), [clearLocal, redraw]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);

    if (initialStrokes.length) {
      segmentsRef.current = initialStrokes.slice();
      redraw();
    }

    const onDraw = (seg) => {
      segmentsRef.current.push(seg);
      drawSegment(seg);
    };
    const onClear = () => clearLocal();
    const onUndo = ({ strokeId }) => {
      segmentsRef.current = segmentsRef.current.filter((s) => s.strokeId !== strokeId);
      redraw();
    };

    socket.on('draw', onDraw);
    socket.on('canvas_clear', onClear);
    socket.on('draw_undo', onUndo);

    return () => {
      window.removeEventListener('resize', resize);
      socket.off('draw', onDraw);
      socket.off('canvas_clear', onClear);
      socket.off('draw_undo', onUndo);
    };
  }, []);

  useEffect(() => {
    segmentsRef.current = initialStrokes.slice();
    redraw();
  }, [initialStrokes]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: (point.clientX - rect.left) / rect.width,
      y: (point.clientY - rect.top) / rect.height,
    };
  };

  const start = (e) => {
    if (!propsRef.current.canDraw) return;
    e.preventDefault();
    drawingRef.current = true;
    strokeIdRef.current = `${socket.id}-${performance.now()}-${Math.floor(Math.random() * 1e6)}`;
    lastRef.current = pos(e);
  };

  const move = (e) => {
    if (!drawingRef.current || !propsRef.current.canDraw) return;
    e.preventDefault();
    const p = pos(e);
    const { color, brushSize, tool } = propsRef.current;
    const seg = {
      strokeId: strokeIdRef.current,
      x0: lastRef.current.x, y0: lastRef.current.y,
      x1: p.x, y1: p.y,
      color, size: brushSize, erase: tool === 'eraser',
    };
    segmentsRef.current.push(seg);
    drawSegment(seg);
    socket.emit('draw', seg);
    lastRef.current = p;
  };

  const end = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  return (
    <div className={`canvas-wrap ${canDraw ? 'can-draw' : ''}`}>
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {!canDraw && <div className="canvas-lock" title="Only the drawer can draw" />}
    </div>
  );
});

export default DrawingCanvas;
