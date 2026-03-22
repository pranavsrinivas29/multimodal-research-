import os
import mlflow
from fastapi import APIRouter
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

MLFLOW_URI  = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
EXPERIMENT  = "research-agent"

def _client():
    mlflow.set_tracking_uri(MLFLOW_URI)
    return mlflow.MlflowClient()

@router.get("/stats")
async def get_stats():
    """Return aggregated metrics from MLflow for the dashboard."""
    try:
        client = _client()
        exp = client.get_experiment_by_name(EXPERIMENT)
        if not exp:
            return {"runs": 0, "metrics": {}}

        runs = client.search_runs(
            experiment_ids=[exp.experiment_id],
            order_by=["start_time DESC"],
            max_results=50,
        )

        if not runs:
            return {"runs": 0, "metrics": {}, "recent": []}

        # Aggregate
        latencies    = [r.data.metrics.get("latency_ms", 0) for r in runs]
        costs        = [r.data.metrics.get("estimated_cost_usd", 0) for r in runs]
        evals        = [r.data.metrics.get("eval_faithfulness", -1) for r in runs]
        tokens       = [r.data.metrics.get("total_tokens", 0) for r in runs]
        ret_scores   = [r.data.metrics.get("avg_retrieval_score", 0) for r in runs]

        valid_evals  = [e for e in evals if e >= 0]

        recent = [
            {
                "run_id":      r.info.run_id,
                "question":    r.data.params.get("question", "")[:80],
                "latency_ms":  round(r.data.metrics.get("latency_ms", 0)),
                "total_tokens": int(r.data.metrics.get("total_tokens", 0)),
                "cost_usd":    round(r.data.metrics.get("estimated_cost_usd", 0), 5),
                "eval_score":  round(r.data.metrics.get("eval_faithfulness", -1), 2),
                "retrieval_score": round(r.data.metrics.get("avg_retrieval_score", 0), 3),
                "start_time":  r.info.start_time,
            }
            for r in runs[:10]
        ]

        return {
            "runs": len(runs),
            "metrics": {
                "avg_latency_ms":       round(sum(latencies) / len(latencies)),
                "total_cost_usd":       round(sum(costs), 5),
                "avg_cost_usd":         round(sum(costs) / len(costs), 5),
                "total_tokens":         int(sum(tokens)),
                "avg_eval_score":       round(sum(valid_evals) / len(valid_evals), 2) if valid_evals else None,
                "avg_retrieval_score":  round(sum(ret_scores) / len(ret_scores), 3),
            },
            "recent": recent,
        }
    except Exception as e:
        return {"error": str(e), "runs": 0}
