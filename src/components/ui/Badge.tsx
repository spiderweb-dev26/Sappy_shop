interface BadgeProps {
  children: React.ReactNode;
  variant?: "draft" | "published" | "archived";
}

const variantStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Badge({ children, variant = "draft" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full
        text-xs font-medium border capitalize
        ${variantStyles[variant]}
      `}
    >
      {children}
    </span>
  );
}