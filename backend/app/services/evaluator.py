import os
import openai
from dotenv import load_dotenv

load_dotenv()

def _get_client():
    return openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

EVAL_PROMPT = """You are an evaluation assistant. Score the following answer on faithfulness to the provided source excerpts.

Faithfulness = does the answer contain ONLY information present in the sources? (0.0 = completely hallucinated, 1.0 = fully grounded)

Respond with ONLY a single decimal number between 0.0 and 1.0. No explanation."""

async def evaluate_faithfulness(question: str, answer: str, chunks: list) -> float:
    """Use GPT-4o-mini to score answer faithfulness. Returns 0.0-1.0."""
    try:
        client = _get_client()
        context = "\n\n".join(c["text"] for c in chunks[:4])  # top 4 chunks only

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": EVAL_PROMPT},
                {"role": "user", "content": (
                    f"Question: {question}\n\n"
                    f"Sources:\n{context}\n\n"
                    f"Answer:\n{answer}"
                )},
            ],
            temperature=0,
            max_tokens=5,
        )
        score_str = response.choices[0].message.content.strip()
        return float(score_str)
    except Exception as e:
        print(f"[Eval] Scoring failed: {e}")
        return -1.0
