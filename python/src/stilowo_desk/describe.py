"""Skrót wyceny taki sam jak w kolejce warsztatu."""

from __future__ import annotations

WOODS = {
    "sosna": "Sosna",
    "buk": "Buk",
    "jesion": "Jesion",
    "dab": "Dąb",
    "orzech": "Orzech",
}
PAINTS = {
    "czern": "Czerń",
    "antracyt": "Antracyt",
    "biel": "Biel",
    "zielen": "Zieleń",
    "braz": "Brąz",
}
SIDES = {"lewa": "bok lewy", "prawa": "bok prawy", "obie": "boki od ściany"}


def _config(raw: dict) -> dict:
    config = raw.get("config")
    return config if isinstance(config, dict) else {}


def _piece(prefix: str, wood: str, thickness) -> str:
    return " ".join(part for part in (prefix, wood, f"{thickness} cm") if part)


def summarize_piece(raw: dict) -> str:
    config = _config(raw)
    paint = PAINTS.get(str(config.get("paint") or "czern"), "")
    if raw.get("product") == "barierka":
        bits = [
            f"{config.get('length')} × {config.get('height')} cm",
            f"słupek {config.get('postWidth')}×{config.get('postDepth')} cm",
            f"pochwyt {config.get('handrailWidth')}×{config.get('handrailThickness')} cm",
        ]
        if config.get("bottom"):
            bits.append(f"rygiel {config.get('bottomWidth')}×{config.get('bottomThickness')} cm")
        if config.get("floorGap"):
            bits.append(f"odstęp od płyty {config.get('floorGap')} cm")
        side_name = SIDES.get(str(config.get("sides") or ""))
        if side_name:
            bits.append(f"{side_name}, wysięg {config.get('sideLength')} cm")
        direction = "poziome" if config.get("bars") == "poziom" else "pionowe"
        if config.get("fill") == "profil":
            bits.append(
                f"profile {direction} {config.get('fillWidth')}×{config.get('fillDepth')} cm, prześwit {config.get('barGap')} cm"
            )
        else:
            bits.append(f"pręty {direction} {config.get('barDiameter')} cm, prześwit {config.get('barGap')} cm")
        bits.append(
            f"do czoła, płyta {config.get('slabThickness')} cm" if config.get("mount") == "czolo" else "na płycie"
        )
        if paint:
            bits.append(paint)
        return " · ".join(bits)

    wood = WOODS.get(str(config.get("wood") or ""), "")
    bits = [
        f"{config.get('height')} × {config.get('width')} × {config.get('depth')} cm",
        f"rama {config.get('frameThickness')} cm",
    ]
    if config.get("topThickness"):
        bits.append(_piece("blat", wood, config.get("topThickness")))
    if config.get("shelfThickness"):
        bits.append(_piece(wood, "", config.get("shelfThickness")))
    if config.get("shelves"):
        bits.append(f"półki: {config.get('shelves')}")
    if config.get("bays"):
        bits.append(f"segmenty: {config.get('bays')}")
    if paint:
        bits.append(paint)
    if config.get("legHeight"):
        bits.append(f"nogi {config.get('legHeight')} cm")
    return " · ".join(bits)
