import { useEffect, useState } from "react";
import { isSupabaseConfigured, redirectUrl, supabase } from "../lib/supabase.js";
import { syncWrongAnswers } from "../utils/wrongAnswers.js";

function parseLoginPayload(raw) {
  const value = raw.trim();
  if (!value) return { kind: "empty" };
  if (/^\d{6,8}$/.test(value)) return { kind: "otp", token: value };

  try {
    const url = new URL(value);
    const tokenHash = url.searchParams.get("token") || url.searchParams.get("token_hash");
    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");
    if (code) return { kind: "code", code };
    if (tokenHash) {
      const otpType = !type || type === "magiclink" || type === "signup" ? "email" : type;
      return { kind: "token_hash", tokenHash, otpType };
    }
  } catch {
    /* not a URL */
  }

  return { kind: "unknown" };
}

export default function SyncAuth({ onSync }) {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then((res) => res.json())
      .then((settings) => setGoogleEnabled(Boolean(settings?.external?.google)))
      .catch(() => {});
    return undefined;
  }, []);

  useEffect(() => {
    if (!user || !supabase) return undefined;

    let cancelled = false;
    (async () => {
      setSyncing(true);
      setMessage("");
      try {
        await syncWrongAnswers();
        if (!cancelled) onSync?.();
      } catch (e) {
        console.error(e);
        if (!cancelled) setMessage("동기화에 실패했습니다.");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, onSync]);

  useEffect(() => {
    if (!user) return undefined;

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void syncWrongAnswers()
        .then(() => onSync?.())
        .catch((err) => console.error(err));
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user, onSync]);

  if (!isSupabaseConfigured) {
    return (
      <div className="sync-bar sync-bar-muted">
        <span>클라우드 동기화: Supabase 설정 필요 (.env.local)</span>
      </div>
    );
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl() },
    });
    if (error) setMessage(error.message);
    setBusy(false);
  }

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMessage("");
    const payload = {
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
    };
    let { error } = await supabase.auth.signInWithOtp(payload);
    if (error && /redirect/i.test(error.message)) {
      ({ error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      }));
    }
    setMailSent(!error);
    setMessage(error ? error.message : "로그인 메일을 보냈습니다. 링크를 복사해 붙여넣거나 6자리 코드를 입력하세요.");
    setBusy(false);
  }

  async function confirmLogin(e) {
    e.preventDefault();
    const parsed = parseLoginPayload(loginInput);
    if (parsed.kind === "empty") return;

    setBusy(true);
    setMessage("");
    let error = null;

    if (parsed.kind === "otp") {
      if (!email.trim()) {
        setBusy(false);
        setMessage("6자리 코드를 쓰려면 이메일을 먼저 입력하세요.");
        return;
      }
      ({ error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: parsed.token,
        type: "email",
      }));
    } else if (parsed.kind === "code") {
      ({ error } = await supabase.auth.exchangeCodeForSession(parsed.code));
    } else if (parsed.kind === "token_hash") {
      ({ error } = await supabase.auth.verifyOtp({
        token_hash: parsed.tokenHash,
        type: parsed.otpType,
      }));
    } else {
      setBusy(false);
      setMessage("메일 속 로그인 링크를 그대로 붙여넣거나, 6자리 코드를 입력하세요.");
      return;
    }

    setMessage(error ? error.message : "");
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setMessage("");
    setMailSent(false);
    setLoginInput("");
    setBusy(false);
    onSync?.();
  }

  if (user) {
    const label = user.email ?? "로그인됨";
    return (
      <div className="sync-bar">
        <div className="sync-info">
          <span className="sync-badge">동기화 {syncing ? "중…" : "ON"}</span>
          <span className="sync-email" title={label}>
            {label}
          </span>
        </div>
        <button type="button" className="btn btn-ghost sync-btn" onClick={signOut} disabled={busy}>
          로그아웃
        </button>
        {message && <p className="sync-msg">{message}</p>}
      </div>
    );
  }

  return (
    <div className="sync-bar">
      <p className="sync-desc">같은 이메일로 로그인하면 PC와 폰에서 틀린 문제가 함께 저장됩니다.</p>
      <div className="sync-actions">
        {googleEnabled && (
          <button
            type="button"
            className="btn btn-primary sync-btn"
            onClick={signInWithGoogle}
            disabled={busy}
          >
            Google 로그인
          </button>
        )}
        <form className="sync-form" onSubmit={sendMagicLink}>
          <input
            type="email"
            className="sync-input"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoComplete="email"
          />
          <button type="submit" className="btn btn-primary sync-btn" disabled={busy}>
            로그인 메일
          </button>
        </form>
      </div>
      <form className="sync-paste" onSubmit={confirmLogin}>
        <textarea
          className="sync-input sync-paste-input"
          rows={2}
          placeholder={mailSent ? "메일 속 로그인 링크 또는 6자리 코드" : "이미 받은 로그인 링크/코드가 있으면 붙여넣기"}
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-ghost sync-btn" disabled={busy}>
          확인
        </button>
      </form>
      {message && <p className="sync-msg">{message}</p>}
    </div>
  );
}
