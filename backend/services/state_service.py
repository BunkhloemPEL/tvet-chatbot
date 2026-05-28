import copy
import json
import re
from functools import lru_cache

from langchain_openai import ChatOpenAI

from core.config import settings


DEFAULT_CONVERSATION_STATE = {
    "user_profile": {
        "user_type": None,
        "student_grade": None,
        "student_age": None,
        "province": None,
        "district": None,
        "interests": [],
        "student_uncertain": None,
        "financial_constraint": None,
        "can_relocate": None,
        "preferred_work_style": None,
        "urgency_to_earn_income": None,
        "desired_career": None,
    },
    "conversation": {
        "language": None,
        "intent": None,
        "needs_recommendation": False,
        "needs_application_info": False,
        "needs_scholarship_info": False,
        "user_refused_profile": False,
    },
}

PROFILE_KEYS = DEFAULT_CONVERSATION_STATE["user_profile"].keys()
CONVERSATION_KEYS = DEFAULT_CONVERSATION_STATE["conversation"].keys()
BOOL_OR_NONE_KEYS = {
    "student_uncertain",
    "can_relocate",
    "urgency_to_earn_income",
}
BOOL_KEYS = {
    "needs_recommendation",
    "needs_application_info",
    "needs_scholarship_info",
    "user_refused_profile",
}
LANGUAGES = {"khmer", "english", "mixed"}
INTENTS = {
    "application_requirements",
    "program_recommendation",
    "program_list",
    "scholarship",
    "cost",
    "contact",
    "comparison",
    "general_tvet",
    "other",
}
FINANCIAL_CONSTRAINTS = {"none", "low", "medium", "high"}

STATE_UPDATE_KEYWORDS = {
    # User type / role
    "student",
    "parent",
    "counselor",
    "សិស្ស",
    "និស្សិត",
    "ឪពុក",
    "ម្តាយ",
    "គ្រូ",
    # School level / age
    "grade",
    "ថ្នាក់ទី",
    "អាយុ",
    # Location
    "province",
    "district",
    "live",
    "from",
    "located",
    "based in",
    "ខេត្ត",
    "ស្រុក",
    "ក្រុង",
    "រស់នៅ",
    "បន្ទាយមានជ័យ",
    "បាត់ដំបង",
    "កំពង់ចាម",
    "កំពង់ឆ្នាំង",
    "កំពង់ស្ពឺ",
    "កំពង់ធំ",
    "កំពត",
    "កណ្ដាល",
    "កោះកុង",
    "ក្រចេះ",
    "មណ្ឌលគិរី",
    "ភ្នំពេញ",
    "ព្រះវិហារ",
    "ព្រៃវែង",
    "ពោធិ៍សាត់",
    "រតនគិរី",
    "សៀមរាប",
    "ព្រះសីហនុ",
    "ស្ទឹងត្រែង",
    "ស្វាយរៀង",
    "តាកែវ",
    "ឧត្តរមានជ័យ",
    "កែប",
    "ប៉ៃលិន",
    "ត្បូងឃ្មុំ",
    "banteay meanchey",
    "battambang",
    "kampong cham",
    "kampong chhnang",
    "kampong speu",
    "kampong thom",
    "kampot",
    "kandal",
    "koh kong",
    "kratie",
    "mondulkiri",
    "phnom penh",
    "preah vihear",
    "prey veng",
    "pursat",
    "ratanakiri",
    "siem reap",
    "preah sihanouk",
    "stung treng",
    "svay rieng",
    "takeo",
    "oddar meanchey",
    "kep",
    "pailin",
    "tboung khmum",
    # Interests / goals
    "interested",
    "interest",
    "career",
    "job",
    "work",
    "ចាប់អារម្មណ៍",
    "ចង់រៀន",
    "ចង់ធ្វើ",
    "ការងារ",
    "អាជីព",
    # Uncertainty / refusal
    "not sure",
    "don't know",
    "do not know",
    "any skill",
    "មិនដឹង",
    "អីក៏ដោយ",
    "មិនចង់ប្រាប់",
    "មិនត្រូវការប្រាប់",
    # Money / relocation / urgency
    "money",
    "poor",
    "financial",
    "scholarship",
    "relocate",
    "income",
    "earn",
    "អាហារូបករណ៍",
    "លុយ",
    "ក្រីក្រ",
    "ជីវភាព",
    "ផ្លាស់ទី",
    "ចំណូល",
    "រកលុយ",
    # Intent flags worth keeping in state
    "apply",
    "admission",
    "requirement",
    "document",
    "cost",
    "fee",
    "contact",
    "comparison",
    "ដាក់ពាក្យ",
    "ចូលរៀន",
    "ត្រូវការ",
    "ឯកសារ",
    "ថ្លៃ",
    "តម្លៃ",
    "ទំនាក់ទំនង",
    "ប្រៀបធៀប",
}

STATE_SKIP_EXACT_MESSAGES = {
    "why",
    "more",
    "continue",
    "again",
    "yes",
    "no",
    "ok",
    "okay",
    "thanks",
    "thank you",
    "ហេតុអ្វី",
    "បន្ថែម",
    "បន្ត",
    "ម្តងទៀត",
    "បាទ",
    "ចាស",
    "អត់ទេ",
    "អរគុណ",
}


STATE_EXTRACTION_SYSTEM_PROMPT = """
You update structured conversation state for a Cambodia TVET advising chatbot.

Return only valid JSON with exactly this top-level shape:
{
  "user_profile": {
    "user_type": "student" | "parent" | "counselor" | null,
    "student_grade": string | null,
    "student_age": number | null,
    "province": string | null,
    "district": string | null,
    "interests": string[],
    "student_uncertain": boolean | null,
    "financial_constraint": "none" | "low" | "medium" | "high" | null,
    "can_relocate": boolean | null,
    "preferred_work_style": string | null,
    "urgency_to_earn_income": boolean | null,
    "desired_career": string | null
  },
  "conversation": {
    "language": "khmer" | "english" | "mixed" | null,
    "intent": "application_requirements" | "program_recommendation" | "program_list" | "scholarship" | "cost" | "contact" | "comparison" | "general_tvet" | "other" | null,
    "needs_recommendation": boolean,
    "needs_application_info": boolean,
    "needs_scholarship_info": boolean,
    "user_refused_profile": boolean
  }
}

Rules:
- Preserve existing values unless the user clearly updates or corrects them.
- Do not guess personal facts. Use null or [] when unknown.
- Extract only facts explicitly stated or strongly implied by the conversation.
- If the user says they are unsure, do not know what skill to choose, or will take any TVET skill, set student_uncertain to true.
- If the user refuses to provide profile details, set user_refused_profile to true.
- Do not put explanatory text, Markdown, or code fences around the JSON.
"""


@lru_cache(maxsize=1)
def get_state_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="google/gemini-2.0-flash-lite-001",
        openai_api_key=settings.openrouter_api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0,
    )


def default_state() -> dict:
    return copy.deepcopy(DEFAULT_CONVERSATION_STATE)


def serialize_state(state: dict) -> str:
    return json.dumps(sanitize_state(state), ensure_ascii=False)


def deserialize_state(state_json: str | None) -> dict:
    if not state_json:
        return default_state()

    try:
        return sanitize_state(json.loads(state_json))
    except (TypeError, json.JSONDecodeError):
        return default_state()


def format_state_for_prompt(state: dict) -> str:
    return json.dumps(sanitize_state(state), ensure_ascii=False, indent=2)


def update_conversation_state(
    *,
    history: list[dict],
    latest_message: str,
    current_state: dict | None,
) -> dict:
    current = sanitize_state(current_state or default_state())
    recent_history = history[-8:]

    user_prompt = json.dumps(
        {
            "current_state": current,
            "recent_history": recent_history,
            "latest_user_message": latest_message,
        },
        ensure_ascii=False,
        indent=2,
    )

    try:
        response = get_state_llm().invoke(
            [
                ("system", STATE_EXTRACTION_SYSTEM_PROMPT),
                ("human", user_prompt),
            ]
        )
        extracted = parse_json_object(response.content)
    except Exception:
        return current

    return sanitize_state(deep_merge(current, extracted))


def should_update_conversation_state(
    *,
    latest_message: str,
    history: list[dict],
    has_existing_state: bool,
) -> bool:
    message = latest_message.strip()
    if not message:
        return False

    if not has_existing_state:
        return True

    normalized = re.sub(r"\s+", " ", message.casefold()).strip(" ?!។៕")
    if normalized in STATE_SKIP_EXACT_MESSAGES:
        return False

    if len(history) == 0:
        return True

    return any(keyword in normalized for keyword in STATE_UPDATE_KEYWORDS)


def parse_json_object(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        value = json.loads(cleaned[start : end + 1])

    if not isinstance(value, dict):
        raise ValueError("State extraction did not return a JSON object.")
    return value


def deep_merge(base: dict, update: dict) -> dict:
    merged = copy.deepcopy(base)
    for key, value in (update or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def sanitize_state(state: dict) -> dict:
    clean = default_state()
    if not isinstance(state, dict):
        return clean

    profile = state.get("user_profile") or {}
    if isinstance(profile, dict):
        for key in PROFILE_KEYS:
            clean["user_profile"][key] = sanitize_profile_value(key, profile.get(key))

    conversation = state.get("conversation") or {}
    if isinstance(conversation, dict):
        for key in CONVERSATION_KEYS:
            clean["conversation"][key] = sanitize_conversation_value(
                key, conversation.get(key)
            )

    return clean


def sanitize_profile_value(key: str, value):
    if key == "interests":
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    if key == "student_age":
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value if 0 < value < 100 else None
        return None

    if key in BOOL_OR_NONE_KEYS:
        return value if isinstance(value, bool) else None

    if key == "financial_constraint":
        if not isinstance(value, str):
            return None
        normalized = value.strip().lower()
        return normalized if normalized in FINANCIAL_CONSTRAINTS else None

    if value is None:
        return None

    text = str(value).strip()
    return text or None


def sanitize_conversation_value(key: str, value):
    if key in BOOL_KEYS:
        return value if isinstance(value, bool) else False

    if key == "language":
        if not isinstance(value, str):
            return None
        normalized = value.strip().lower()
        return normalized if normalized in LANGUAGES else None

    if key == "intent":
        if not isinstance(value, str):
            return None
        normalized = value.strip().lower()
        return normalized if normalized in INTENTS else None

    return None
