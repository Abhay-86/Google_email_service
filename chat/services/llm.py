import json
import requests
from django.conf import settings
from mistralai import Mistral

MISTRAL_MODEL = "mistral-large-latest"


def parse_llm_response(raw_text):
    """
    Extract JSON object from LLM text output.
    """
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(raw_text[start:end])
            except json.JSONDecodeError:
                pass
        
        # Fallback response if no valid JSON found
        return {
            "assistant_reply": "I'm sorry, I had trouble processing your request. Could you please rephrase?",
            "updated_json": {},
            "missing_fields": []
        }


def mistral_parse(message, draft_json):
    """
    Send message to Mistral API and return structured response.
    """
    client = Mistral(api_key=settings.MISTRAL_API_KEY)

    prompt = settings.RFP_PROMPT.format(
        user_message=message,
        draft_json=json.dumps(draft_json, indent=2)
    )

    try:
        response = client.chat.complete(
            model=MISTRAL_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.choices[0].message.content
        parsed = parse_llm_response(raw)

        return {
            "provider": "mistral",
            "assistant_reply": parsed.get("assistant_reply", "I processed your message."),
            "updated_json": parsed.get("updated_json", draft_json),
            "missing_fields": parsed.get("missing_fields", []),
            "raw": parsed
        }
    except Exception as e:
        return {
            "provider": "mistral",
            "assistant_reply": f"I encountered an error: {str(e)}. Please try again.",
            "updated_json": draft_json,
            "missing_fields": [],
            "raw": {"error": str(e)}
        }


def hf_parse(message, draft_json):
    """
    Send message to HuggingFace API and return structured response.
    """
    prompt = settings.RFP_PROMPT.format(
        user_message=message,
        draft_json=json.dumps(draft_json, indent=2)
    )

    headers = {
        "Authorization": f"Bearer {settings.HF_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 400}
    }

    try:
        response = requests.post(
            f"https://api-inference.huggingface.co/models/{settings.HF_MODEL}",
            headers=headers,
            json=payload,
            timeout=20
        )
        response.raise_for_status()

        raw_output = response.json()[0].get("generated_text", "")
        parsed = parse_llm_response(raw_output)

        return {
            "provider": "huggingface",
            "assistant_reply": parsed.get("assistant_reply", "I processed your message."),
            "updated_json": parsed.get("updated_json", draft_json),
            "missing_fields": parsed.get("missing_fields", []),
            "raw": parsed
        }
    except Exception as e:
        return {
            "provider": "huggingface",
            "assistant_reply": f"I encountered an error: {str(e)}. Please try again.",
            "updated_json": draft_json,
            "missing_fields": [],
            "raw": {"error": str(e)}
        }


def run_llm(message, draft_json):
    """
    Main entry point for all chat LLM calls.
    Reads provider from settings.CHAT_LLM_PROVIDER.
    """
    provider = getattr(settings, "CHAT_LLM_PROVIDER", "mistral")

    if provider == "mistral":
        return mistral_parse(message, draft_json)

    if provider == "hf":
        return hf_parse(message, draft_json)

    raise ValueError(f"Invalid LLM provider '{provider}' in settings.CHAT_LLM_PROVIDER")
