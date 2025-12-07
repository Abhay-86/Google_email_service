import json
import logging
from mistralai import Mistral
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Constants
MISTRAL_MODEL = "mistral-small-latest"
HF_MODEL_URL = "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct"

def parse_email_response(raw_response):
    """
    Parse the LLM response to extract subject and template_body.
    Expected format: {"subject": "...", "template_body": "..."}
    """
    try:
        # Clean the response - remove markdown code blocks if present
        cleaned_response = raw_response.strip()
        
        # Remove markdown code block markers
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        elif cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]   # Remove ```
            
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            
        cleaned_response = cleaned_response.strip()
        
        # Try to parse as JSON first
        if cleaned_response.startswith('{'):
            parsed_json = json.loads(cleaned_response)
            # Return with standard keys
            return {
                "subject": parsed_json.get("subject", ""),
                "template_body": parsed_json.get("template_body", "")
            }
        
        # If not JSON, try to extract from text
        lines = cleaned_response.split('\n')
        result = {"subject": "", "template_body": ""}
        
        current_section = None
        content_lines = []
        
        for line in lines:
            line = line.strip()
            if line.lower().startswith('subject:'):
                if current_section == "template_body":
                    result["template_body"] = '\n'.join(content_lines).strip()
                current_section = "subject"
                result["subject"] = line[8:].strip()  # Remove "Subject:" prefix
                content_lines = []
            elif line.lower().startswith('template_body:') or line.lower().startswith('body:'):
                if current_section == "subject" and content_lines:
                    result["subject"] += ' ' + ' '.join(content_lines)
                current_section = "template_body"
                content_lines = []
            elif current_section:
                content_lines.append(line)
        
        # Handle last section
        if current_section == "template_body":
            result["template_body"] = '\n'.join(content_lines).strip()
        elif current_section == "subject" and content_lines:
            result["subject"] += ' ' + ' '.join(content_lines)
        
        return result
    
    except Exception as e:
        logger.error(f"Error parsing email response: {e}")
        return {
            "subject": "RFP Request - Please Review",
            "template_body": "Dear {{vendor_name}},\n\nWe would like to request a proposal for our project requirements.\n\nBest regards,\n{{contact_person}}"
        }

def mistral_generate_email(rfp_json):
    """
    Generate email template using Mistral API.
    """
    client = Mistral(api_key=settings.MISTRAL_API_KEY)

    prompt = settings.EMAIL_GENERATION_PROMPT.format(
        rfp_json=json.dumps(rfp_json, indent=2)
    )

    try:
        response = client.chat.complete(
            model=MISTRAL_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.choices[0].message.content
        parsed = parse_email_response(raw)

        return {
            "provider": "mistral",
            "subject": parsed.get("subject", "RFP Request"),
            "template_body": parsed.get("template_body", "Please find our RFP requirements attached."),
            "raw": raw
        }
    except Exception as e:
        logger.error(f"Mistral email generation error: {e}")
        return {
            "provider": "mistral",
            "subject": "RFP Request - Please Review",
            "template_body": "Dear {{vendor_name}},\n\nWe would like to request a proposal for our project requirements.\n\nBest regards,\n{{contact_person}}",
            "raw": {"error": str(e)}
        }

def hf_generate_email(rfp_json):
    """
    Generate email template using HuggingFace API.
    """
    prompt = settings.EMAIL_GENERATION_PROMPT.format(
        rfp_json=json.dumps(rfp_json, indent=2)
    )

    headers = {
        "Authorization": f"Bearer {settings.HF_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 500}
    }

    try:
        response = requests.post(
            HF_MODEL_URL,
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            raw = result[0].get("generated_text", "")
            # Remove the original prompt from response
            raw = raw.replace(prompt, "").strip()
        else:
            raw = str(result)

        parsed = parse_email_response(raw)

        return {
            "provider": "hf",
            "subject": parsed.get("subject", "RFP Request"),
            "template_body": parsed.get("template_body", "Please find our RFP requirements attached."),
            "raw": raw
        }
    except Exception as e:
        logger.error(f"HuggingFace email generation error: {e}")
        return {
            "provider": "hf",
            "subject": "RFP Request - Please Review",
            "template_body": "Dear {{vendor_name}},\n\nWe would like to request a proposal for our project requirements.\n\nBest regards,\n{{contact_person}}",
            "raw": {"error": str(e)}
        }

def generate_email_template(rfp_json):
    """
    Main entry point for email template generation.
    Uses the same provider as chat LLM (CHAT_LLM_PROVIDER setting).
    Returns: {"subject": str, "body": str}
    """
    provider = getattr(settings, "CHAT_LLM_PROVIDER", "mistral")

    if provider == "mistral":
        result = mistral_generate_email(rfp_json)
    elif provider == "hf":
        result = hf_generate_email(rfp_json)
    else:
        raise ValueError(f"Invalid LLM provider '{provider}' in settings.CHAT_LLM_PROVIDER")
    
    # Return in the format expected by the frontend
    return {
        "subject": result.get("subject", "RFP Request"),
        "body": result.get("template_body", "Please find our RFP requirements attached.")
    }
