"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import ReportCard from "./ReportCard";
import ReportModal from "./ReportModal";

interface Report {
  id: string;
  title: string;
  description: string | null;
  status: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}

interface ReportsClientProps {
  initialReports: Report[];
}

export default function ReportsClient({ initialReports }: ReportsClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || report.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleCreate = useCallback(async (data: {
    title: string;
    description?: string;
    status: string;
  }) => {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to create report");

    const { report } = await res.json();
    setReports((prev) => [report, ...prev]);
    setIsModalOpen(false);
  }, []);

  const handleUpdate = useCallback(
    async (id: string, data: { title?: string; description?: string; status?: string }) => {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update report");

      const { report } = await res.json();
      setReports((prev) =>
        prev.map((r) => (r.id === id ? report : r))
      );
      setEditingReport(null);
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });

    if (!res.ok) throw new Error("Failed to delete report");

    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const stats = {
    total: reports.length,
    draft: reports.filter((r) => r.status === "draft").length,
    published: reports.filter((r) => r.status === "published").length,
    archived: reports.filter((r) => r.status === "archived").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your reports
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingReport(null);
            setIsModalOpen(true);
          }}
          size="lg"
        >
          <Plus className="w-5 h-5" />
          New Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Drafts", value: stats.draft, color: "text-amber-600" },
          { label: "Published", value: stats.published, color: "text-emerald-600" },
          { label: "Archived", value: stats.archived, color: "text-gray-500" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            aria-label="Search reports"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "draft", "published", "archived"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg capitalize transition-colors
                ${
                  filterStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            {searchQuery || filterStatus !== "all"
              ? "No matching reports"
              : "No reports yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || filterStatus !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first report to get started"}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredReports.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                index={index}
                onEdit={() => {
                  setEditingReport(report);
                  setIsModalOpen(true);
                }}
                onDelete={() => handleDelete(report.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReport(null);
        }}
        onSubmit={editingReport ? (data) => handleUpdate(editingReport.id, data) : handleCreate}
        report={editingReport}
      />
    </div>
  );
}