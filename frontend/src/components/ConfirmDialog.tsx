import './ConfirmDialog.css';

type ConfirmDialogProps = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-dialog-title">{title}</h3>
        {message && <p className="confirm-dialog-message">{message}</p>}
        <div className="confirm-dialog-actions">
          {cancelLabel && (
            <button className="confirm-dialog-button cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button className="confirm-dialog-button confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

