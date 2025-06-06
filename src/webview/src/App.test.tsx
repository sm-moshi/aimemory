import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
	it("renders fallback when VSCode API is not available", () => {
		render(<App />);
		expect(screen.getByText(/VSCode API not available/i)).toBeInTheDocument();
	});
});
