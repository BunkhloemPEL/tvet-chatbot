DEFAULT_SESSION_TITLE = "New Conversation"
TITLE_MAX_LENGTH = 48
TITLE_SUFFIX = " . . . "


def title_from_message(message: str) -> str:
    cleaned = " ".join((message or "").split())
    if not cleaned:
        return DEFAULT_SESSION_TITLE

    if len(cleaned) <= TITLE_MAX_LENGTH:
        return cleaned

    trim_length = max(1, TITLE_MAX_LENGTH - len(TITLE_SUFFIX))
    return f"{cleaned[:trim_length].rstrip()}{TITLE_SUFFIX}"
