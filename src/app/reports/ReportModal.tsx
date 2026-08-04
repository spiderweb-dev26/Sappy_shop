"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    status: string;
  }) => Promise<void>;
  report?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
  } | null;
}

export default function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  report,
}: ReportModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (report) {
      setTitle(report.title);
      setDescription(report.description || "");
      setStatus(report.status);
    } else {
      setTitle("");
      setDescription("");
      setStatus("draft");
    }
    setError("");
  }, [report, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report ? "Edit Report" : "New Report"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="report-title"
          label="Title"
          placeholder="Q4 Revenue Analysis"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="space-y-1.5">
          <label
            htmlFor="report-description"
            className="block text-sm font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id="report-description"
            placeholder="Brief summary of the report..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="report-status"
            className="block text-sm font-medium text-foreground"
          >
            Status
          </label>
          <select
            id="report-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 px-3.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {report ? "Save Changes" : "Create Report"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}