export default function ErrorAlert({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex justify-between items-start gap-4">
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-red-700 hover:text-red-900"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
