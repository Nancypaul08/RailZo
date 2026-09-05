export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
