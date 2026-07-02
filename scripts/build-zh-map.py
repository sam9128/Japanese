"""Extract the Chinese definitions needed by the generated study cards from ECDICT."""
import csv
import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ECDICT = PROJECT.parent / "tmp" / "ECDICT" / "ecdict.csv"
OUTPUT = PROJECT / "scripts" / "source" / "ecdict-zh.json"


def normalize(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"\([^)]*\)", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" .!?'")


def clean_translation(value: str) -> str:
    lines = [line.strip() for line in value.replace("\\n", "\n").replace("\r", "\n").split("\n") if line.strip()]
    if not lines:
        return ""
    # ECDICT often lists the modern/computing sense last; this is usually the
    # intended sense for Japanese loanwords such as アニメ and アプリ.
    value = lines[-1]
    value = re.sub(r"^(?:n|v|vi|vt|adj|adv|prep|conj|pron|int|num|art|abbr)\.\s*", "", value, flags=re.I)
    value = re.sub(r"\[[^\]]{0,40}\]", "", value)
    value = re.sub(r"\s+", " ", value).strip(" ；")
    senses = [part.strip() for part in re.split(r"[,，;；]", value) if part.strip()]
    return "、".join(senses[:3])[:120]


def targets_from_content() -> set[str]:
    targets: set[str] = set()
    for content_file in (PROJECT / "public" / "content" / "periods").glob("*.json"):
        content = json.loads(content_file.read_text(encoding="utf-8"))
        for card in content["vocabulary"]:
            for part in re.split(r"[;,/]", card.get("meaningEn", "")):
                term = normalize(part)
                if not term:
                    continue
                targets.add(term)
                targets.add(re.sub(r"^to ", "", term))
                targets.update(word for word in re.findall(r"[a-z][a-z'-]+", term) if len(word) > 2)
    return targets


def main() -> None:
    if not ECDICT.exists():
        raise SystemExit(f"ECDICT not found: {ECDICT}")
    targets = targets_from_content()
    translations: dict[str, str] = {}
    with ECDICT.open(encoding="utf-8", newline="", errors="replace") as handle:
        for row in csv.DictReader(handle):
            word = normalize(row.get("word", ""))
            if word in targets and row.get("translation"):
                translated = clean_translation(row["translation"])
                if translated:
                    translations[word] = translated
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(translations, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"targets": len(targets), "matched": len(translations), "output": str(OUTPUT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
