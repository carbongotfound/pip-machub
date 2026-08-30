# Token efficiency without hidden quality tradeoffs

No agent system can promise that fewer model input tokens will produce exactly identical answers. This fork therefore avoids invisible model downgrades and destructive summarization.

## What it does

- Resumes provider sessions when the active branch and engine have not changed, avoiding unnecessary history replay.
- Replays only settled text from the active branch; abandoned branches, UI events, screenshots, and tool activity do not become repeated prompt text.
- On long fresh-engine replays, protects both the initial user task and the recent working set inside the existing 40-message cap. The omitted middle remains canonical and the agent receives an explicit instruction to search it before trusting an uncertain detail.
- Keeps shared section context bounded and user-owned. Agents cannot silently rewrite it.
- Uses compact transcript pages and explicit task summaries for agent-to-agent coordination rather than copying whole channel histories.
- Records actual provider token usage in the existing Usage panel where the provider reports it.

## What it deliberately does not do

- No automatic switch to a smaller/cheaper model.
- No deletion or replacement of canonical messages with generated summaries.
- No claim that a generated summary is lossless.
- No provider credentials or private transcripts sent to a third-party optimizer.

For maximum fidelity on a critical project, keep requirements in the initial task or shared section context and ask an agent to search the transcript before final delivery. For maximum economy, split unrelated work into separate channels/tasks so each agent carries a smaller relevant history.
