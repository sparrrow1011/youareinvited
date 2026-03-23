'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
        <p className="text-light text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-accent text-white font-bold py-2 rounded-lg hover:bg-opacity-90 transition-all"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-[#0f3460] text-light py-2 rounded-lg hover:border-light transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
