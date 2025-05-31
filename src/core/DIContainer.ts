/**
 * Lightweight Dependency Injection Container
 */

// TODO: Move the type to src/types/
type DependencyFactory<T> = (container: DIContainer) => T;

interface Registration<T> {
	factory: DependencyFactory<T>;
	singleton: boolean;
	instance?: T;
}

export class DIContainer {
	private readonly registrations = new Map<string, Registration<unknown>>();

	/**
	 * Registers a dependency with the container.
	 * @param key - The key or identifier for the dependency (e.g., a class name or interface identifier).
	 * @param factory - A function that creates the dependency instance. This function receives the container itself to resolve its own dependencies.
	 * @param singleton - If true, the factory will be called only once and the same instance will be returned on subsequent resolutions.
	 */
	register<T>(key: string, factory: DependencyFactory<T>, singleton = false): void {
		if (this.registrations.has(key)) {
			// Optional: Log a warning or throw an error if a key is registered twice
			// console.warn(`Dependency with key '${key}' already registered.`);
		}
		this.registrations.set(key, { factory, singleton });
	}

	/**
	 * Resolves and returns an instance of the dependency registered with the given key.
	 * @param key - The key or identifier for the dependency.
	 * @returns The dependency instance.
	 * @throws Error if the key is not registered or if a dependency cannot be resolved.
	 */
	resolve<T>(key: string): T {
		const registration = this.registrations.get(key);

		if (!registration) {
			// Consider a more specific error type if needed
			throw new Error(`Dependency with key '${key}' not registered.`);
		}

		if (registration.singleton) {
			registration.instance ??= registration.factory(this);
			return registration.instance as T;
		}
		return registration.factory(this) as T;
	}

	// Optional: Method to check if a key is registered
	isRegistered(key: string): boolean {
		return this.registrations.has(key);
	}
}
