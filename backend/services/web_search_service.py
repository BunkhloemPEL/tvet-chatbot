from dataclasses import dataclass
from urllib.parse import urlparse

import requests

from core.config import settings


TAVILY_SEARCH_URL = "https://api.tavily.com/search"

WEB_SEARCH_KEYWORDS = {
    "duration",
    "schedule",
    "enrollment",
    "enrolment",
    "intake",
    "deadline",
    "scholarship",
    "fee",
    "fees",
    "tuition",
    "latest",
    "current",
    "recent",
    "announcement",
    "event",
    "application period",
    "រយៈពេល",
    "កាលវិភាគ",
    "ចុះឈ្មោះ",
    "ថ្ងៃផុតកំណត់",
    "អាហារូបករណ៍",
    "ថ្លៃ",
    "តម្លៃ",
    "ថ្លៃសិក្សា",
    "បច្ចុប្បន្ន",
    "ថ្មី",
    "សេចក្ដីជូនដំណឹង",
    "ព្រឹត្តិការណ៍",
}

OFFICIAL_SOURCE_HINTS = {
    ".gov.kh",
    "moeys.gov.kh",
    "mlvt.gov.kh",
    "tvet.gov.kh",
    "facebook.com",
    "www.facebook.com",
}


@dataclass(frozen=True)
class SearchQuery:
    query: str
    language: str


@dataclass(frozen=True)
class WebSearchResult:
    query: str
    query_language: str
    tavily_answer: str | None
    title: str
    url: str
    content: str
    score: float


@dataclass(frozen=True)
class WebEvidence:
    title: str
    url: str
    snippet: str
    score: float
    query_language: str
    source_type: str
    supports: list[str]


@dataclass(frozen=True)
class WebEvidenceAssessment:
    response_mode: str
    confidence: str
    missing_fields: list[str]
    supported_fields: list[str]
    notes: list[str]


def should_search_web(question: str, state: dict, retrieved_context: str) -> bool:
    if not settings.enable_web_search or not settings.tavily_api_key:
        return False

    haystack = " ".join(
        [
            question,
            str((state or {}).get("conversation", {}).get("intent", "")),
            str((state or {}).get("conversation", {}).get("needs_scholarship_info", "")),
        ]
    ).casefold()

    if any(keyword in haystack for keyword in WEB_SEARCH_KEYWORDS):
        return True

    context_lower = (retrieved_context or "").casefold()
    asks_current_info = any(
        keyword in haystack
        for keyword in ["current", "latest", "បច្ចុប្បន្ន", "ថ្មី"]
    )
    return asks_current_info and not any(
        keyword in context_lower for keyword in WEB_SEARCH_KEYWORDS
    )


def build_bilingual_queries(
    question: str, state: dict, retrieved_context: str
) -> list[SearchQuery]:
    targets = extract_institute_names(f"{question}\n{retrieved_context}")
    province = ((state or {}).get("user_profile") or {}).get("province")

    target = targets[0] if targets else ""
    location_hint = f" {province}" if province and province not in target else ""

    english_query = " ".join(
        part
        for part in [
            target,
            "TVET Cambodia",
            location_hint.strip(),
            "program duration schedule enrollment scholarship tuition fee",
            question,
        ]
        if part
    )
    khmer_query = " ".join(
        part
        for part in [
            target,
            location_hint.strip(),
            "អាហារូបករណ៍ កាលវិភាគ រយៈពេលសិក្សា ចុះឈ្មោះ ថ្លៃសិក្សា",
            question,
        ]
        if part
    )

    queries = [
        SearchQuery(query=english_query[:400], language="english"),
        SearchQuery(query=khmer_query[:400], language="khmer"),
    ]
    return dedupe_queries(queries)


def run_tavily_searches(queries: list[SearchQuery]) -> list[WebSearchResult]:
    if not settings.tavily_api_key:
        return []

    headers = {
        "Authorization": f"Bearer {settings.tavily_api_key}",
        "Content-Type": "application/json",
    }
    all_results: list[WebSearchResult] = []

    for query in queries:
        payload = {
            "query": query.query,
            "search_depth": settings.tavily_search_depth,
            "topic": "general",
            "country": "cambodia",
            "max_results": settings.tavily_max_results,
            "include_answer": "basic",
            "include_raw_content": False,
        }

        try:
            response = requests.post(
                TAVILY_SEARCH_URL,
                headers=headers,
                json=payload,
                timeout=settings.tavily_timeout_seconds,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException:
            continue

        answer = data.get("answer")
        for item in data.get("results", []):
            url = item.get("url") or ""
            content = item.get("content") or ""
            if not url or not content:
                continue

            all_results.append(
                WebSearchResult(
                    query=query.query,
                    query_language=query.language,
                    tavily_answer=answer,
                    title=item.get("title") or "Untitled web result",
                    url=url,
                    content=content,
                    score=float(item.get("score") or 0),
                )
            )

    return all_results


def dedupe_and_rank_results(results: list[WebSearchResult]) -> list[WebEvidence]:
    by_url: dict[str, WebEvidence] = {}

    for result in results:
        if not has_target_relevance(result):
            continue

        normalized_url = normalize_url(result.url)
        evidence = WebEvidence(
            title=result.title,
            url=result.url,
            snippet=clean_snippet(result.content),
            score=result.score,
            query_language=result.query_language,
            source_type=classify_source_type(result.url),
            supports=detect_supported_fields(f"{result.title}\n{result.content}"),
        )

        existing = by_url.get(normalized_url)
        if not existing or evidence.score > existing.score:
            by_url[normalized_url] = evidence

    ranked = sorted(by_url.values(), key=lambda item: item.score, reverse=True)
    return ranked[: settings.tavily_max_results]


def evaluate_web_evidence(
    question: str, evidence: list[WebEvidence]
) -> WebEvidenceAssessment:
    requested_fields = detect_supported_fields(question)
    if not requested_fields:
        requested_fields = ["current_information"]

    if not evidence:
        return WebEvidenceAssessment(
            response_mode="not_found_contact_school",
            confidence="none",
            missing_fields=requested_fields,
            supported_fields=[],
            notes=["No relevant web evidence was found."],
        )

    supported = sorted({field for item in evidence for field in item.supports})
    missing = [field for field in requested_fields if field not in supported]
    official_count = sum(1 for item in evidence if item.source_type == "official")
    social_count = sum(1 for item in evidence if item.source_type == "social")

    if supported and not missing and official_count:
        mode = "verified_answer"
        confidence = "medium"
    elif supported and official_count:
        mode = "partial_answer"
        confidence = "medium"
    elif supported or social_count:
        mode = "weak_signal_answer"
        confidence = "low"
    else:
        mode = "not_found_contact_school"
        confidence = "low"

    notes = []
    if social_count and not official_count:
        notes.append("Evidence is mainly from social media or non-official pages.")
    if missing:
        notes.append("Some requested fields were not directly supported by web evidence.")

    return WebEvidenceAssessment(
        response_mode=mode,
        confidence=confidence,
        missing_fields=missing,
        supported_fields=supported,
        notes=notes,
    )


def format_web_context_for_prompt(
    evidence: list[WebEvidence], assessment: WebEvidenceAssessment
) -> str:
    lines = [
        "Web evidence assessment:",
        f"- response_mode: {assessment.response_mode}",
        f"- confidence: {assessment.confidence}",
        f"- supported_fields: {', '.join(assessment.supported_fields) or 'none'}",
        f"- missing_fields: {', '.join(assessment.missing_fields) or 'none'}",
        (
            "- strict_missing_field_rule: Do not answer missing_fields unless the "
            "official context contains exact school-specific facts for them."
        ),
        (
            "- strict_source_rule: Do not cite or mention any web URL that is not "
            "listed in Web evidence results below."
        ),
    ]

    if assessment.notes:
        lines.append(f"- notes: {'; '.join(assessment.notes)}")

    if not evidence:
        lines.append("\nNo web evidence available.")
        return "\n".join(lines)

    lines.append("\nWeb evidence results:")
    for index, item in enumerate(evidence, start=1):
        lines.extend(
            [
                f"{index}. {item.title}",
                f"   URL: {item.url}",
                f"   Source type: {item.source_type}",
                f"   Query language: {item.query_language}",
                f"   Supports: {', '.join(item.supports) or 'related only'}",
                f"   Snippet: {item.snippet}",
            ]
        )

    return "\n".join(lines)


def extract_institute_names(text: str) -> list[str]:
    names = []
    for raw_line in (text or "").splitlines():
        line = raw_line.strip(" -*•:\t")
        line = trim_contact_details(line)
        if not line or len(line) > 140:
            continue

        lower = line.casefold()
        if any(
            marker in lower
            for marker in [
                "institute",
                "polytechnic",
                "training center",
                "វិទ្យាស្ថាន",
                "មជ្ឈមណ្ឌល",
                "សាលា",
            ]
        ):
            names.append(line)

    return dedupe_strings(names)[:3]


def has_target_relevance(result: WebSearchResult) -> bool:
    target_terms = extract_target_terms(result.query)
    if not target_terms:
        return True

    result_text = f"{result.title} {result.url} {result.content}".casefold()
    distinctive_terms = [
        term
        for term in target_terms
        if term
        not in {
            "province",
            "cambodia",
            "school",
            "center",
            "training",
            "institute",
            "polytechnic",
            "student",
            "tell",
            "និស្សិត",
            "សិស្ស",
        }
    ]
    if not distinctive_terms:
        return True

    return any(term in result_text for term in distinctive_terms)


def extract_target_terms(query: str) -> list[str]:
    lower = query.casefold()
    stop_markers = [
        "tvet cambodia",
        "program duration",
        "អាហារូបករណ៍",
        "កាលវិភាគ",
    ]
    marker_indexes = [lower.find(marker) for marker in stop_markers]
    marker_indexes = [index for index in marker_indexes if index != -1]
    target = lower[: min(marker_indexes)] if marker_indexes else lower

    terms = []
    for raw in target.replace(":", " ").replace("/", " ").split():
        term = raw.strip(".,;()[]{}\"'")
        if len(term) >= 4 and term not in {
            "what",
            "about",
            "with",
            "from",
            "tell",
            "student",
            "និស្សិត",
            "សិស្ស",
            "ជំនួយការ",
        }:
            terms.append(term)
    return dedupe_strings(terms)


def trim_contact_details(line: str) -> str:
    markers = [
        " Website:",
        " website:",
        " Facebook:",
        " facebook:",
        " Email:",
        " email:",
        " Phone:",
        " phone:",
        " Tel:",
        " tel:",
        " ទូរស័ព្ទ",
        " អ៊ីមែល",
        " គេហទំព័រ",
        " ហ្វេសប៊ុក",
    ]
    trimmed = line
    for marker in markers:
        index = trimmed.find(marker)
        if index != -1:
            trimmed = trimmed[:index]
    return trimmed.strip(" -*•:\t")


def detect_supported_fields(text: str) -> list[str]:
    lower = (text or "").casefold()
    fields = []
    field_keywords = {
        "duration": ["duration", "រយៈពេល"],
        "schedule": ["schedule", "timetable", "កាលវិភាគ"],
        "enrollment": ["enrollment", "enrolment", "intake", "ចុះឈ្មោះ"],
        "deadline": ["deadline", "ថ្ងៃផុតកំណត់"],
        "scholarship": ["scholarship", "អាហារូបករណ៍"],
        "tuition_fee": ["fee", "fees", "tuition", "ថ្លៃ", "តម្លៃ"],
        "recent_event": ["event", "announcement", "latest", "ព្រឹត្តិការណ៍", "ថ្មី"],
    }

    for field, keywords in field_keywords.items():
        if any(keyword in lower for keyword in keywords):
            fields.append(field)

    return fields


def classify_source_type(url: str) -> str:
    host = urlparse(url).netloc.casefold()
    if any(hint in host for hint in OFFICIAL_SOURCE_HINTS):
        return "official" if "facebook.com" not in host else "social"
    if "facebook.com" in host or "t.me" in host or "youtube.com" in host:
        return "social"
    return "third_party"


def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.netloc.casefold()}{parsed.path}".rstrip("/")


def clean_snippet(text: str) -> str:
    return " ".join((text or "").split())[:900]


def dedupe_queries(queries: list[SearchQuery]) -> list[SearchQuery]:
    seen = set()
    unique = []
    for query in queries:
        normalized = query.query.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        unique.append(query)
    return unique


def dedupe_strings(values: list[str]) -> list[str]:
    seen = set()
    unique = []
    for value in values:
        normalized = value.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        unique.append(value)
    return unique
