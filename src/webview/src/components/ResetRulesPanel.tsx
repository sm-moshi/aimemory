import { useState } from "react";
import "./ResetRulesPanel.css";

import { VscodeTabPanel, VscodeButton } from "@vscode-elements/react-elements";

interface ResetRulesPanelProps {
  onReset: () => void;
  resetSuccess: boolean | null;
}

const ResetRulesPanel = ({ onReset, resetSuccess }: ResetRulesPanelProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleResetClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmReset = () => {
    onReset();
    setShowConfirmation(false);
  };

  const handleCancelReset = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="reset-panel">
      <VscodeTabPanel id="tab-2" aria-controls="panel-2">
        Reset Rules
      </VscodeTabPanel>
      <VscodeTabPanel id="panel-2" role="tabpanel" aria-labelledby="tab-2">
        <div className="reset-content">
          <h2>Reset Memory Bank Rules</h2>

          <div className="reset-description">
            <p>
              Reset the Memory Bank rules to their original version. This will
              restore the default rules template and is useful if you've made
              unwanted changes or if the rules file has been corrupted.
            </p>
            <p className="warning">
              <strong>Warning:</strong> This action will overwrite any
              customizations you have made to the rules file.
            </p>
          </div>

          {resetSuccess !== null && (
            <div
              className={`reset-result ${resetSuccess ? "success" : "error"}`}
            >
              {resetSuccess
                ? "Memory bank rules have been successfully reset."
                : "Failed to reset memory bank rules. Please try again."}
            </div>
          )}

          {!showConfirmation ? (
            <VscodeButton onClick={handleResetClick}>Reset Rules</VscodeButton>
          ) : (
            <div className="confirmation-dialog">
              <p>Are you sure you want to reset the memory bank rules?</p>
              <div className="button-group">
                <VscodeButton onClick={handleConfirmReset}>
                  Yes, Reset Rules
                </VscodeButton>
                <VscodeButton onClick={handleCancelReset}>Cancel</VscodeButton>
              </div>
            </div>
          )}
        </div>
      </VscodeTabPanel>
    </div>
  );
};

export default ResetRulesPanel;
