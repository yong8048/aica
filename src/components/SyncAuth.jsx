import { useEffect, useState } from "react";
import { isSupabaseConfigured, redirectUrl, supabase } from "../lib/supabase.js";
import { syncWrongAnswers } from "../utils/wrongAnswers.js";

export default function SyncAuth({ onSync }) {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

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
    if (!user || !supabase) return;

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
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl() },
    });
    setMessage(error ? error.message : "로그인 링크를 이메일로 보냈습니다.");
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setMessage("");
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
      <p className="sync-desc">로그인하면 PC·폰에서 오답이 자동 동기화됩니다.</p>
      <div className="sync-actions">
        <button
          type="button"
          className="btn btn-primary sync-btn"
          onClick={signInWithGoogle}
          disabled={busy}
        >
          Google 로그인
        </button>
        <form className="sync-form" onSubmit={sendMagicLink}>
          <input
            type="email"
            className="sync-input"
            placeholder="이메일 (매직 링크)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn btn-ghost sync-btn" disabled={busy}>
            링크 받기
          </button>
        </form>
      </div>
      {message && <p className="sync-msg">{message}</p>}
    </div>
  );
}
