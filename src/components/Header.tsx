import type { User } from "firebase/auth";
import { LogOut, Plus, RotateCcw } from "lucide-react";
import {
  LANGUAGE_OPTIONS,
  UI_TEXT,
  type AppLanguage,
} from "../utils/i18n";

export type WorkspaceTab = "chat" | "publishing" | "directory" | "notes";

interface HeaderProps {
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onPrimaryAction: () => void;
  draftsCount: number;
  notesCount: number;
  platformsCount: number;
  googleUser: User | null;
  isGoogleLoggingIn: boolean;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
}

export function Header({
  language,
  onChangeLanguage,
  activeTab,
  onSelectTab,
  onPrimaryAction,
  draftsCount,
  notesCount,
  platformsCount,
  googleUser,
  isGoogleLoggingIn,
  onGoogleLogin,
  onGoogleLogout,
}: HeaderProps) {
  const t = UI_TEXT[language].header;

  const primaryLabel =
    activeTab === "directory"
      ? t.primary.addSite
      : activeTab === "notes"
      ? t.primary.newNote
      : activeTab === "publishing"
      ? t.primary.newDraft
      : t.primary.newChat;

  const PrimaryIcon = activeTab === "chat" ? RotateCcw : Plus;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <span className="font-display text-lg font-bold text-slate-900 whitespace-nowrap shrink-0">
          Rahal Plus
        </span>

        <nav
          aria-label={t.navAria}
          className="hidden lg:flex items-center gap-4 xl:gap-5"
        >
          <button
            type="button"
            onClick={() => onSelectTab("chat")}
            aria-current={activeTab === "chat" ? "page" : undefined}
            className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              activeTab === "chat"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.tabs.chat}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("publishing")}
            aria-current={activeTab === "publishing" ? "page" : undefined}
            className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              activeTab === "publishing"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.tabs.publishing}{" "}
            <span className="tabular-nums text-xs text-slate-400">
              ({draftsCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("directory")}
            aria-current={activeTab === "directory" ? "page" : undefined}
            className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              activeTab === "directory"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.tabs.directory}{" "}
            <span className="tabular-nums text-xs text-slate-400">
              ({platformsCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("notes")}
            aria-current={activeTab === "notes" ? "page" : undefined}
            className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              activeTab === "notes"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.tabs.notes}{" "}
            <span className="tabular-nums text-xs text-slate-400">
              ({notesCount})
            </span>
          </button>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          {/* Active Google Email Account / Sign-In */}
          {googleUser ? (
            <div
              data-testid="header-google-account"
              aria-label={t.googleAuth.accountAria}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 ps-2 pe-1 py-1 min-h-[36px]"
            >
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName ?? googleUser.email ?? "Google"}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {(googleUser.email?.[0] ?? "G").toUpperCase()}
                </span>
              )}
              <span
                dir="ltr"
                className="hidden sm:inline max-w-[140px] truncate text-[11px] font-mono text-slate-700"
              >
                {googleUser.email}
              </span>
              <button
                type="button"
                onClick={onGoogleLogout}
                aria-label={t.googleAuth.logoutAria}
                className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="header-google-login-btn"
              disabled={isGoogleLoggingIn}
              onClick={onGoogleLogin}
              aria-label={t.googleAuth.loginBtn}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[36px] disabled:opacity-60"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span className="hidden sm:inline">
                {isGoogleLoggingIn
                  ? t.googleAuth.loggingIn
                  : t.googleAuth.loginBtn}
              </span>
            </button>
          )}

          {/* Language Switcher: Arabic / English / Russian */}
          <div
            role="group"
            aria-label={t.langAria}
            data-testid="language-switcher"
            className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={language === opt.id}
                onClick={() => onChangeLanguage(opt.id)}
                className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[30px] sm:min-h-[32px] ${
                  language === opt.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[36px]"
          >
            <PrimaryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[96px] sm:max-w-none truncate">{primaryLabel}</span>
          </button>
        </div>
      </div>

      {/* Tablet/Mobile navigation strip */}
      <nav
        aria-label={t.mobileNavAria}
        className="lg:hidden border-t border-slate-100 px-3 flex items-center justify-between gap-1 overflow-x-auto"
      >
        <button
          type="button"
          onClick={() => onSelectTab("chat")}
          aria-current={activeTab === "chat" ? "page" : undefined}
          className={`flex-1 py-2.5 px-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "chat"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-600"
          }`}
        >
          {t.tabs.chat}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("publishing")}
          aria-current={activeTab === "publishing" ? "page" : undefined}
          className={`flex-1 py-2.5 px-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "publishing"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-600"
          }`}
        >
          {t.tabs.publishingMobile} ({draftsCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("directory")}
          aria-current={activeTab === "directory" ? "page" : undefined}
          className={`flex-1 py-2.5 px-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "directory"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-600"
          }`}
        >
          {t.tabs.directoryMobile} ({platformsCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("notes")}
          aria-current={activeTab === "notes" ? "page" : undefined}
          className={`flex-1 py-2.5 px-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "notes"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-600"
          }`}
        >
          {t.tabs.notes} ({notesCount})
        </button>
      </nav>
    </header>
  );
}
