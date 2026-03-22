import os
import time
import asyncio
import mlflow
from dotenv import load_dotenv

load_dotenv()

MLFLOW_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
EXPERIMENT  = "research-agent"

def _setup():
    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.set_experiment(EXPERIMENT)

async def log_query_run(
    question: str,
    answer: str,
    chunks: list,
    latency_ms: float,
    prompt_tokens: int,
    completion_tokens: int,
    eval_score: float | None = None,
):
    """Log a full query run to MLflow asynchronously."""
    await asyncio.to_thread(_log_sync,
        question, answer, chunks,
        latency_ms, prompt_tokens, completion_tokens, eval_score
    )

def _log_sync(
    question, answer, chunks,
    latency_ms, prompt_tokens, completion_tokens, eval_score
):
    try:
        _setup()
        with mlflow.start_run():
            # ── Params ──────────────────────────────────────────
            mlflow.log_param("question", question[:500])
            mlflow.log_param("num_chunks_retrieved", len(chunks))
            mlflow.log_param("model", "gpt-4o")
            mlflow.log_param("embedding_model", "text-embedding-3-small")

            # ── Metrics ─────────────────────────────────────────
            mlflow.log_metric("latency_ms", latency_ms)
            mlflow.log_metric("prompt_tokens", prompt_tokens)
            mlflow.log_metric("completion_tokens", completion_tokens)
            mlflow.log_metric("total_tokens", prompt_tokens + completion_tokens)

            # Estimate cost (GPT-4o pricing as of 2024)
            cost = (prompt_tokens / 1_000_000 * 5.0) + (completion_tokens / 1_000_000 * 15.0)
            mlflow.log_metric("estimated_cost_usd", round(cost, 6))

            # Average retrieval score
            if chunks:
                avg_score = sum(c["score"] for c in chunks) / len(chunks)
                mlflow.log_metric("avg_retrieval_score", round(avg_score, 4))
                mlflow.log_metric("top_retrieval_score", round(chunks[0]["score"], 4))

            # Auto-eval score
            if eval_score is not None:
                mlflow.log_metric("eval_faithfulness", eval_score)

            # ── Artifacts ───────────────────────────────────────
            mlflow.log_text(answer, "answer.txt")
            mlflow.log_text(
                "\n\n---\n\n".join(
                    f"[{i+1}] {c['label']} (score: {c['score']:.3f})\n{c['text']}"
                    for i, c in enumerate(chunks)
                ),
                "retrieved_chunks.txt"
            )

    except Exception as e:
        print(f"[MLflow] Logging failed (non-fatal): {e}")
