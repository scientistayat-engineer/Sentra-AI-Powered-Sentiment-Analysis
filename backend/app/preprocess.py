"""Text cleaning shared by training and prediction.

Stop words are deliberately NOT removed: words such as "not", "no" and "never"
carry sentiment ("not good" is the opposite of "good").
"""
import re
import unicodedata

_URL = re.compile(r"https?://\S+|www\.\S+")
_MENTION = re.compile(r"@\w+")
_HASHTAG = re.compile(r"#(\w+)")
_REPEAT = re.compile(r"(.)\1{2,}")          # soooo -> soo
_NON_TEXT = re.compile(r"[^a-z0-9'!?\s]")
_SPACES = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Return a normalised, lower-case version of ``text``."""
    if not isinstance(text, str):
        return ""
    text = unicodedata.normalize("NFKC", text).lower()
    text = _URL.sub(" url ", text)
    text = _MENTION.sub(" user ", text)
    text = _HASHTAG.sub(r" \1 ", text)
    text = text.replace("\u2019", "'")
    text = _REPEAT.sub(r"\1\1", text)
    text = _NON_TEXT.sub(" ", text)
    return _SPACES.sub(" ", text).strip()
