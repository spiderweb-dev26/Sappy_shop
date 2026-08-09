"use client";
import RecoveryPanel from "@/components/RecoveryPanel";
export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecoveryPanel message={error?.message} detail={(error as any)?.digest} />;
}