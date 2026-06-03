import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export const FloatingActionButton = ({ onClick }: FloatingActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="fab pulse-glow z-40"
      aria-label="Create new"
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>
  );
};
