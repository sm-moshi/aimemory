import {
  VscodeTabPanel,
  VscodeProgressRing,
  VscodeButton,
} from "@vscode-elements/react-elements";
import "./RuleStatusPanel.css";

interface RuleStatusPanelProps {
  isInitialized: boolean | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const RuleStatusPanel = ({
  isInitialized,
  isLoading,
  onRefresh,
}: RuleStatusPanelProps) => {
  return (
    <div className="status-panel">
      <VscodeTabPanel id="tab-1" aria-controls="panel-1">
        Rule Status
      </VscodeTabPanel>
      <VscodeTabPanel id="panel-1" role="tabpanel" aria-labelledby="tab-1">
        <div className="status-content">
          <h2>Memory Bank Rules Status</h2>

          {isLoading ? (
            <VscodeProgressRing></VscodeProgressRing>
          ) : (
            <>
              <div className="status-indicator">
                <div
                  className={`status-icon ${
                    isInitialized ? "success" : "error"
                  }`}
                >
                  {isInitialized ? "✓" : "✗"}
                </div>
                <div className="status-text">
                  {isInitialized
                    ? "Memory bank rules are initialized correctly"
                    : "Memory bank rules are not initialized"}
                </div>
              </div>

              <div className="status-details">
                {isInitialized ? (
                  <p>
                    Your AI Memory bank rules are properly configured and ready
                    to use.
                  </p>
                ) : (
                  <p>
                    Your AI Memory bank rules need to be initialized. You can
                    initialize them by running the "AI Memory: Start MCP Server"
                    command.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="status-actions">
            <VscodeButton onClick={onRefresh}>Refresh Status</VscodeButton>
          </div>
        </div>
      </VscodeTabPanel>
    </div>
  );
};

export default RuleStatusPanel;
