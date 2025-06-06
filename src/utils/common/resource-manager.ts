/**
 * Generic Resource Manager Utility
 */
import type { IDisposable } from "@/types/core.js";
import type { Logger } from "@/types/index.js";

/**
 * Manages the lifecycle of disposable resources.
 * Ensures that all registered resources are properly cleaned up.
 */
export class ResourceManager implements IDisposable {
	private readonly disposables: Set<IDisposable> = new Set();
	private disposed = false;

	constructor(private readonly logger: Logger) {}

	/**
	 * Adds a disposable resource to be managed.
	 * @param disposable The resource to manage.
	 */
	public add(disposable: IDisposable): void {
		if (this.disposed) {
			this.logger.warn(
				"ResourceManager: Attempted to add disposable to already disposed manager.",
			);
			// Optionally, dispose it immediately or throw an error
			Promise.resolve(disposable.dispose()).catch(err =>
				this.logger.error(
					`Error disposing immediately added disposable: ${err instanceof Error ? err.message : String(err)}`,
				),
			);
			return;
		}
		this.disposables.add(disposable);
	}

	/**
	 * Removes a disposable resource from management.
	 * This does NOT dispose the resource, only stops tracking it.
	 * @param disposable The resource to remove.
	 */
	public remove(disposable: IDisposable): void {
		this.disposables.delete(disposable);
	}

	/**
	 * Disposes all managed resources.
	 * After calling this, the manager itself is considered disposed and should not be reused.
	 */
	public async dispose(): Promise<void> {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.logger.info("Disposing all managed resources...");

		const disposePromises: Promise<void>[] = [];
		for (const disposable of this.disposables) {
			try {
				const result = disposable.dispose();
				if (result instanceof Promise) {
					disposePromises.push(
						result.catch(err =>
							this.logger.error(
								`Error during async disposal: ${err instanceof Error ? err.message : String(err)}`,
							),
						),
					);
				}
			} catch (err) {
				this.logger.error(
					`Error during sync disposal: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		await Promise.allSettled(disposePromises);
		this.disposables.clear();
		this.logger.info("All managed resources disposed.");
	}
}
