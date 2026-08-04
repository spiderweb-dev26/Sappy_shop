"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Report {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportCardProps {
  report: Report;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ReportCard({
  report,
  index,
  onEdit,
  onDelete,
}: ReportCardProps) {
  const formattedDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-border/80 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground truncate">
              {report.title}
            </h3>
            <Badge variant={report.status as "draft" | "published" | "archived"}>
              {report.status}
            </Badge>
          </div>
          {report.description && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
              {report.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Created {formattedDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Edit ${report.title}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Delete ${report.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}