const COLORS = [
  '#000000', '#7f7f7f', '#c1c1c1', '#ffffff',
  '#ef130b', '#ff7100', '#ffe400', '#00cc00',
  '#00b2ff', '#231fd3', '#a300ba', '#d37caa',
  '#a0522d', '#ff008a', '#654321', '#00ffbf',
];

const SIZES = [3, 6, 12, 22];

export default function Toolbar({ color, setColor, brushSize, setBrushSize, tool, setTool, onUndo, onClear }) {
  return (
    <div className="toolbar">
      <div className="colors">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${color === c && tool === 'pen' ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => { setColor(c); setTool('pen'); }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>

      <div className="sizes">
        {SIZES.map((s) => (
          <button
            key={s}
            className={`size-btn ${brushSize === s ? 'active' : ''}`}
            onClick={() => setBrushSize(s)}
          >
            <span className="dot" style={{ width: s, height: s }} />
          </button>
        ))}
      </div>

      <div className="tool-actions">
        <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Pen">✏️</button>
        <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Eraser">🧽</button>
        <button className="tool-btn" onClick={onUndo} title="Undo">↩️</button>
        <button className="tool-btn" onClick={onClear} title="Clear canvas">🗑️</button>
      </div>
    </div>
  );
}
