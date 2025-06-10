/**
 * Component Types
 * Type definitions for React component props and related interfaces
 */

/**
 * Props for the Status component
 */
export interface StatusProps {
	readonly onReviewAllFiles: () => void;
	readonly reviewLoading: boolean;
}

/**
 * Props for the MemoryBankStatus component
 */
export interface MemoryBankStatusProps {
	readonly onReviewAllFiles: () => void;
	readonly reviewLoading: boolean;
}

/**
 * Common button props used across components
 */
export interface ButtonProps {
	readonly onClick: () => void;
	readonly disabled?: boolean;
	readonly loading?: boolean;
	readonly children: React.ReactNode;
	readonly className?: string;
	readonly type?: "button" | "submit" | "reset";
}

/**
 * Loading state interface for components with async operations
 */
export interface LoadingState {
	isLoading: boolean;
	error?: string | null;
}

/**
 * Generic component state for forms and interactive elements
 */
export interface ComponentState<T = unknown> {
	data: T | null;
	loading: boolean;
	error: string | null;
}
