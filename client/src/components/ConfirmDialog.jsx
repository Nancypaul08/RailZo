import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title || 'Please confirm'}>
      <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 6px' }}>{message}</p>
      <div className="modal-actions">
        <button className="btn secondary" onClick={onCancel}>Cancel</button>
        <button className="btn" onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}
