import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Idea } from "./IdeaCard";
import { validateRequiredMaxLength } from "@/utils/apiValidation";

interface CreateIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  maxWords?: number;
  editingIdea?: Idea | null;
}

export const CreateIdeaModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  maxWords = 200,
  editingIdea
}: CreateIdeaModalProps) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (editingIdea) {
      setContent(editingIdea.content);
    } else {
      setContent("");
    }
  }, [editingIdea, isOpen]);
  
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > maxWords;
  
  const handleSubmit = () => {
    const validationError = validateRequiredMaxLength(content, 1000, "Idea content");
    if (validationError || isOverLimit) {
      setError(validationError || `Idea content must be ${maxWords} words or fewer.`);
      return;
    }
    onSubmit(content.trim());
    setContent("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setContent("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border-t border-x border-border rounded-t-3xl animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>
        
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-lg font-semibold">
            {editingIdea ? "Edit Idea" : "Quick Idea"}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-5 pb-5">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError("");
            }}
            placeholder="Capture your thought..."
            className="w-full h-32 bg-secondary/50 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          
          {/* Word count */}
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {wordCount}/{maxWords} words
            </span>
            
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                <ImageIcon size={20} className="text-muted-foreground" />
              </button>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isOverLimit}
                size="sm"
                className="rounded-full px-4 gap-2"
              >
                <Send size={16} />
                {editingIdea ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
