import type { ReactNode } from "react";

export function HowDoesItWork(): ReactNode {
	return (
		<div className="rounded-xl border border-border bg-muted p-4 shadow-sm space-y-4 mb-6">
			<h2 className="text-xl font-bold mb-2 border-b border-border pb-1">How does it work?</h2>
			<div className="flex flex-col gap-3">
				<p>
					AI Memory gets Cursor some context about what really is important stuff in your project. It does
					this by storing key context (like your goals, architecture, and recent progress) in a structured set
					of Markdown files called the Memory Bank. This lets the AI stay grounded in your work, even across
					sessions. It also lets you review the Memory Bank to get a better understanding of your project.
				</p>
				<div className="flex flex-col gap-1">
					<span className="font-bold text-md">Memory Bank:</span>
					<p>
						The Memory Bank is a modular folder of editable Markdown files, loaded automatically on each
						session. It integrates with Cursor rules and uses tools like Mermaid diagrams and system
						patterns to make your project context persistent and queryable. To initialise it, type{" "}
						<code>"Initialise memory bank"</code> or <code>"/memory init"</code> into Cursors chat (ideally
						using Claude 4). For a deeper dive, read the source code or wait until I got the time to write a
						guide.
						{/* (ideally using Claude 3.5 or 3.7). For a deeper dive, read the Cline guide on{" "}
						<a
							className="text-blue-500"
							href="https://cline.bot/blog/memory-bank-how-to-make-cline-an-ai-agent-that-never-forgets"
							target="_blank"
							rel="noreferrer"
						>
							how to make an AI agent that never forgets
						</a> */}
						.
					</p>
				</div>
			</div>
		</div>
	);
}
