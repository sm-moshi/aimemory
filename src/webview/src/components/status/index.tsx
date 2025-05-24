import { MemoryBankStatus } from './memory-bank-status.js';
// import { RulesStatus } from "./rules-status";

export function Status({
  onReviewAllFiles,
  reviewLoading,
}: {
  onReviewAllFiles: () => void;
  reviewLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted p-4 shadow-sm space-y-4 mb-6">
      <h2 className="text-xl font-bold mb-2 border-b border-border pb-1">Memory Bank Status</h2>
      <MemoryBankStatus onReviewAllFiles={onReviewAllFiles} reviewLoading={reviewLoading} />
      {/* <hr className="border-border my-4" />
      <RulesStatus /> */}
    </div>
  );
}
