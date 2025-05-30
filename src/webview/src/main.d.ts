import "./index.css";
import "@vscode-elements/elements";
declare global {
	interface Window {
		acquireVsCodeApi: () => {
			postMessage: (message: any) => void;
			getState: () => any;
			setState: (state: any) => void;
		};
		vscodeApi?: {
			postMessage: (message: any) => void;
			getState: () => any;
			setState: (state: any) => void;
		};
	}
}
//# sourceMappingURL=main.d.ts.map
