import { MemoryBankStatus } from "./memory-bank-status";
import { RulesStatus } from "./rules-status";

export function Status() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">Memory Bank Status</h2>
      <MemoryBankStatus />
      <RulesStatus />
    </div>
  );
}
