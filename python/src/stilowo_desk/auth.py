"""Wejście do warsztatu. Hasło i podpis ciasteczka są te same co w panelu Node."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from pathlib import Path

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

COOKIE = "fl_admin"
WEEK_SECONDS = 7 * 24 * 60 * 60
_FAILS: dict[str, dict[str, float]] = {}


def load_workshop_secrets(env_file: Path) -> None:
    if not env_file.is_file():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key not in {"ADMIN_PASSWORD", "ADMIN_SECRET"}:
            continue
        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def _password() -> str:
    return os.environ.get("ADMIN_PASSWORD", "")


def _secret() -> str:
    return os.environ.get("ADMIN_SECRET") or _password()


def _mac(value: str) -> str:
    digest = hmac.new(_secret().encode("utf-8"), value.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def _password_ok(given: str) -> bool:
    expected = _password()
    if not expected:
        return False
    left = hashlib.sha256(given.encode("utf-8")).digest()
    right = hashlib.sha256(expected.encode("utf-8")).digest()
    return hmac.compare_digest(left, right)


def session_ok(token: str) -> bool:
    dot = token.rfind(".")
    if dot <= 0:
        return False
    exp, given = token[:dot], token[dot + 1 :]
    if not exp.isdigit() or int(exp) < time.time() * 1000:
        return False
    return hmac.compare_digest(given, _mac(exp))


def require_workshop(request: Request) -> None:
    if not session_ok(request.cookies.get(COOKIE, "")):
        raise HTTPException(status_code=401, detail="Zaloguj się do warsztatu.")


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "local"


def _locked(ip: str) -> bool:
    row = _FAILS.get(ip)
    return bool(row and row.get("until", 0) > time.time() * 1000)


def _note_fail(ip: str) -> None:
    now = time.time() * 1000
    row = _FAILS.get(ip) or {"count": 0, "until": 0}
    if row["until"] and row["until"] <= now:
        row = {"count": 0, "until": 0}
    row["count"] += 1
    if row["count"] >= 8:
        row["until"] = now + 60_000
        row["count"] = 0
    _FAILS[ip] = row


def _write_cookie(response: JSONResponse, token: str, max_age: int) -> JSONResponse:
    response.set_cookie(
        COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return response


def login(request: Request, password: str) -> JSONResponse:
    if not _password():
        raise HTTPException(status_code=503, detail="Panel warsztatu nie jest włączony.")
    ip = _client_ip(request)
    if _locked(ip):
        raise HTTPException(status_code=429, detail="Za dużo prób. Odczekaj minutę.")
    if not _password_ok(password[:200]):
        _note_fail(ip)
        raise HTTPException(status_code=401, detail="Hasło nie pasuje.")
    _FAILS.pop(ip, None)
    exp = str(int(time.time() * 1000) + WEEK_SECONDS * 1000)
    return _write_cookie(JSONResponse({"ok": True}), f"{exp}.{_mac(exp)}", WEEK_SECONDS)


def logout() -> JSONResponse:
    return _write_cookie(JSONResponse({"ok": True}), "", 0)
