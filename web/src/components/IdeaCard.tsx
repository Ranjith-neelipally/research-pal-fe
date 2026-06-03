import { format } from "date-fns";
import { Clock, ImageIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Idea {
  id: string;
  content: string;
  createdAt: Date;
  images?: string[];
}

interface IdeaCardProps {
  idea: Idea;
  onClick?: () => void;
  onEdit?: (idea: Idea) => void;
  onDelete?: (id: string) => void;
}

export const IdeaCard = ({ idea, onClick, onEdit, onDelete }: IdeaCardProps) => {
  const hasImages = idea.images && idea.images.length > 0;
  
  return (
    <div className="idea-card w-full text-left relative">
      {/* Action Menu */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-full hover:bg-secondary/80 transition-colors">
              <MoreVertical size={16} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => onEdit?.(idea)} className="gap-2">
              <Pencil size={14} />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(idea.id)} 
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 size={14} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button onClick={onClick} className="w-full text-left pr-10">
        <p className="text-sm text-foreground leading-relaxed line-clamp-3">
          {idea.content}
        </p>
        
        {hasImages && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {idea.images!.slice(0, 3).map((img, idx) => (
              <div key={idx} className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {idea.images!.length > 3 && (
              <div className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  +{idea.images!.length - 3}
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {format(idea.createdAt, "h:mm a")}
          </span>
          {hasImages && (
            <span className="flex items-center gap-1">
              <ImageIcon size={12} />
              {idea.images!.length}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};