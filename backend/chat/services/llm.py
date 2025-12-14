import json
import requests
from django.conf import settings
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from decimal import Decimal

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
    client = MistralClient(api_key=settings.MISTRAL_API_KEY)

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


def extract_quotation_info(text):
    """
    Extract quoted amount and currency from email text using LLM service.
    """
    if not text:
        return None, None

    quotation_prompt = """
    You are an expert at extracting and standardizing financial quotation information from vendor email replies.
    
    Analyze the following email text from a vendor responding to a business inquiry and extract any quoted amounts.
    
    Email text:
    {email_text}
    
    IMPORTANT: Look for various ways vendors might express pricing:
    - Direct amounts: "$5000", "USD 5000", "5000 dollars"
    - Indian Rupees: "₹40000", "40000 INR", "40000 rupees"
    - Chinese Yuan: "¥3000", "3000 yuan", "3000 CNY", "3000 RMB"
    - Euros: "€5000", "5000 EUR", "5000 euros"
    - British Pounds: "£4000", "4000 GBP", "4000 pounds"
    - Casual mentions: "give you for 25000", "can do 40k"
    - Estimates: "around $3000", "approximately 15000"
    - Range pricing: "between 5000-8000 USD"
    
    CRITICAL CURRENCY CONVERSION REQUIREMENT:
    - Detect the ORIGINAL currency from the vendor's email
    - Convert ALL amounts to USD using these approximate exchange rates:
      * INR to USD: multiply by 0.012 (1 INR ≈ $0.012)
      * CNY/Yuan to USD: multiply by 0.14 (1 CNY ≈ $0.14)
      * EUR to USD: multiply by 1.1 (1 EUR ≈ $1.10)
      * GBP to USD: multiply by 1.27 (1 GBP ≈ $1.27)
      * JPY/Yen to USD: multiply by 0.0067 (1 JPY ≈ $0.0067)
      * AED to USD: multiply by 0.27 (1 AED ≈ $0.27)
      * CAD to USD: multiply by 0.72 (1 CAD ≈ $0.72)
      * AUD to USD: multiply by 0.65 (1 AUD ≈ $0.65)
    - If no currency symbol/mention is found, assume USD
    - Round USD values to 2 decimal places
    
    Please return your response in the following JSON format:
    {{
        "quotations": [
            {{
                "amount_original": "40000.00",
                "currency_original": "INR",
                "amount_usd": "480.00",
                "context": "quoted price for the project"
            }}
        ],
        "primary_quotation": {{
            "amount": "480.00",
            "currency": "USD"
        }}
    }}
    
    If no quotations are found, return:
    {{
        "quotations": [],
        "primary_quotation": null
    }}
    
    Rules:
    - Extract all monetary amounts that appear to be quotations, prices, or costs
    - For each quotation, include:
      * amount_original: the original amount from the email
      * currency_original: the detected currency (INR, USD, EUR, CNY, etc.)
      * amount_usd: the converted amount in USD (ALWAYS convert to USD)
      * context: brief description of what this amount is for
    - For primary_quotation, use the LARGEST USD amount
    - For primary_quotation: use "amount" and "currency" (currency should ALWAYS be "USD")
    - Be flexible with informal language and various number formats
    - Look for keywords like "quote", "price", "cost", "charge", "dollars", "rupees", "yuan", "give", etc.
    - Convert ALL currencies to USD, even if originally in INR, EUR, CNY, etc.
    
    Return ONLY the JSON. No explanation, no commentary, no markdown.
    """

    try:
        provider = getattr(settings, "CHAT_LLM_PROVIDER", "mistral")
        
        if provider == "mistral":
            client = MistralClient(api_key=settings.MISTRAL_API_KEY)
            
            response = client.chat(
                model=MISTRAL_MODEL,
                messages=[
                    ChatMessage(
                        role="user",
                        content=quotation_prompt.format(email_text=text)
                    )
                ]
            )
            
            raw = response.choices[0].message.content
            parsed = parse_llm_response(raw)
            
        elif provider == "hf":
            headers = {
                "Authorization": f"Bearer {settings.HF_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "inputs": quotation_prompt.format(email_text=text),
                "parameters": {"max_new_tokens": 300}
            }
            
            response = requests.post(
                f"https://api-inference.huggingface.co/models/{settings.HF_MODEL}",
                headers=headers,
                json=payload,
                timeout=20
            )
            response.raise_for_status()
            
            raw_output = response.json()[0].get("generated_text", "")
            parsed = parse_llm_response(raw_output)
            
        else:
            return None, None
        
        # Extract primary quotation
        primary = parsed.get("primary_quotation")
        if primary and primary.get("amount") and primary.get("currency"):
            try:
                amount = Decimal(str(primary["amount"]).replace(',', ''))
                currency = primary["currency"]
                return amount, currency
            except (ValueError, TypeError):
                pass
        
        return None, None
        
    except Exception as e:
        print(f"Error extracting quotation with LLM: {e}")
        return None, None


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
