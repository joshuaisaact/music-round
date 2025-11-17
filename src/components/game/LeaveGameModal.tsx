import { PixelButton } from "../PixelButton";

interface LeaveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeave: () => void;
  cancelButtonRef: React.RefObject<HTMLButtonElement | null>;
}

export function LeaveGameModal({
  isOpen,
  onClose,
  onLeave,
  cancelButtonRef,
}: LeaveGameModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      aria-describedby="leave-modal-description"
    >
      <div className="bg-white border-4 border-sky-900 p-8 max-w-md w-full">
        <h3 id="leave-modal-title" className="pixel-text text-sky-900 text-xl mb-4 text-center">
          LEAVE GAME?
        </h3>
        <p id="leave-modal-description" className="pixel-text text-sky-700 text-sm mb-6 text-center">
          ARE YOU SURE YOU WANT TO LEAVE? YOUR PROGRESS WILL BE LOST.
        </p>
        <div className="flex gap-4">
          <PixelButton
            ref={cancelButtonRef}
            onClick={onClose}
            className="flex-1 bg-sky-100 text-sky-900"
            aria-label="Cancel and stay in game"
          >
            CANCEL
          </PixelButton>
          <PixelButton
            onClick={onLeave}
            variant="danger"
            className="flex-1"
            aria-label="Confirm and leave game"
          >
            LEAVE
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
