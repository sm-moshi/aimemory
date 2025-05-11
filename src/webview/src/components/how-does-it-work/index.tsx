export function HowDoesItWork() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">How does it work?</h2>
        <p>
          The AI Memory extension allows you to activate various memory
          techniques for Cursor & LLMs for better contextual understandings of
          your codebase & project. Currently, it only supports the memory bank
          technique.
        </p>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-md">Memory Bank:</span>
          <p>
            Memory bank is a technique that allows you to store and retrieve
            information in a structured markdown files using the help of cursor
            rules and mermaid diagrams to visualize the information and achieve
            better contextual results. You can activate it by typing "Initialize
            memory bank" in cursor, preferably with Anthropic Claude 3.7 or 3.5
            Sonnet.
          </p>
          <p>
            You can check out how it works on this YouTube video:{" "}
            <a
              className="text-blue-500"
              href="https://youtu.be/Uufa6flWid4"
              rel="noreferrer"
              target="_blank"
            >
              https://youtu.be/Uufa6flWid4
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
