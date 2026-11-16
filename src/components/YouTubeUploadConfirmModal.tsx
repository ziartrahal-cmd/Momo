import { AlertTriangle, Upload, X } from "lucide-react";
import type { YouTubePrivacyStatus } from "../utils/publishing";
import { UI_TEXT, type AppLanguage } from "../utils/i18n";

interface YouTubeUploadConfirmModalProps {
  language?: AppLanguage;
  isOpen: boolean;
  title: string;
  description: string;
  privacyStatus: YouTubePrivacyStatus;
  fileName: string;
  fileSizeBytes: number;
  isUploading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function YouTubeUploadConfirmModal({
  language = "ar",
  isOpen,
  title,
  description,
  privacyStatus,
  fileName,
  fileSizeBytes,
  isUploading,
  onConfirm,
  onCancel,
}: YouTubeUploadConfirmModalProps) {
  if (!isOpen) return null;

  const t = UI_TEXT[language].publishing;
  const privacyLabel =
    privacyStatus === "public"
      ? t.privacyPublic
      : privacyStatus === "unlisted"
      ? t.privacyUnlisted
      : t.privacyPrivate;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yt-upload-confirm-title"
      data-testid="yt-upload-confirm-modal"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="yt-upload-confirm-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                {t.confirmModalTitle}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {t.confirmModalDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isUploading}
            onClick={onCancel}
            aria-label={t.cancel}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="rounded-lg border border-slate-200 bg-slate-50/70 divide-y divide-slate-200 text-sm">
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <dt className="text-slate-500">{t.confirmTitleLabel}</dt>
            <dd className="font-medium text-slate-900 text-end break-words">
              {title}
            </dd>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <dt className="text-slate-500">{t.confirmPrivacyLabel}</dt>
            <dd className="font-medium text-slate-900">{privacyLabel}</dd>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <dt className="text-slate-500">{t.confirmFileLabel}</dt>
            <dd
              dir="ltr"
              className="font-mono text-xs text-slate-700 truncate max-w-[240px]"
            >
              {fileName} · {formatFileSize(fileSizeBytes)}
            </dd>
          </div>
          {description.trim() && (
            <div className="px-4 py-2.5 space-y-1">
              <dt className="text-slate-500 text-xs">{t.confirmDescLabel}</dt>
              <dd className="text-xs text-slate-700 line-clamp-3 whitespace-pre-wrap">
                {description}
              </dd>
            </div>
          )}
        </dl>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isUploading ? t.confirmUploadingBtn : t.confirmUploadBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
