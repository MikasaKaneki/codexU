import { RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import { type CSSProperties } from 'react';
import { type RateWindow, type UsageSnapshot } from '../types/models';
import { useI18n } from '../i18n/I18nProvider';

interface QuotaOverviewProps {
  snapshot: UsageSnapshot | null | undefined;
  sourceLabel: string | null | undefined;
  onRefresh: () => void;
}

function formatQuotaReset(value: number | null | undefined, locale: string, t: ReturnType<typeof useI18n>['t']): string {
  return value == null ? t('quota.resetTimeNotProvided') : t('quota.resets', { time: new Date(value).toLocaleString(locale) });
}

function formatDuration(value: number | null | undefined, t: ReturnType<typeof useI18n>['t']): string {
  return value == null ? t('common.notAvailable') : t('quota.windowMinutes', { value });
}

const RING_GEOMETRY = { outer: 145, inner: 107, stroke: 16, singleCenter: 110, dualCenter: 72 };
type QuotaKind = 'fiveHour' | 'sevenDay' | 'monthly';
type QuotaEntry = { kind: QuotaKind; label: string; compact: string; window: RateWindow; role: 'primary' | 'secondary' };

function remainingPercent(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, 100 - value));
}

function remainingText(window: RateWindow): string {
  const value = remainingPercent(window.used_percent);
  return value == null ? '—' : `${Math.round(value)}%`;
}

function QuotaRing({ entry, diameter, stroke = RING_GEOMETRY.stroke, t }: {
  entry: QuotaEntry; diameter: number; stroke?: number; t: ReturnType<typeof useI18n>['t'];
}) {
  const percent = remainingPercent(entry.window.used_percent);
  const angle = (percent ?? 0) / 100 * Math.PI * 2;
  const radius = (diameter - stroke) / 2;
  const style = {
    '--quota-ring-size': `${diameter}px`, '--quota-ring-stroke': `${stroke}px`,
    '--quota-ring-angle': `${percent == null ? 0 : percent * 3.6}deg`,
    '--quota-cap-x': `${diameter / 2 + Math.sin(angle) * radius}px`,
    '--quota-cap-y': `${diameter / 2 - Math.cos(angle) * radius}px`,
  } as CSSProperties;
  return (
    <div className="quota-overview-ring" data-quota-kind={entry.kind} data-quota-role={entry.role}
      style={style} role="meter" aria-label={entry.label} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={percent == null ? undefined : Math.round(percent)}
      aria-valuetext={percent == null ? t('common.notAvailable') : t('quota.remaining', { value: Math.round(percent) })}>
      {percent != null && percent > 0 ? <span className="quota-overview-ring-fill" aria-hidden="true" /> : null}
      {percent != null && percent > 0 && percent < 100 ? <>
        <span className="quota-overview-ring-cap quota-overview-ring-cap-start" aria-hidden="true" />
        <span className="quota-overview-ring-cap quota-overview-ring-cap-end" aria-hidden="true" />
      </> : null}
    </div>
  );
}

export function QuotaOverview({ snapshot, sourceLabel, onRefresh }: QuotaOverviewProps) {
  const { t, language } = useI18n();
  const locale = language === 'zh-Hans' ? 'zh-CN' : 'en-US';
  const available = [
    { kind: 'fiveHour' as const, label: t('quota.fiveHour'), compact: '5h', window: snapshot?.five_hour_quota },
    { kind: 'sevenDay' as const, label: t('quota.sevenDay'), compact: '7d', window: snapshot?.seven_day_quota },
    { kind: 'monthly' as const, label: t('quota.monthly'), compact: 'mo', window: snapshot?.monthly_quota },
  ].filter((entry): entry is typeof entry & { window: RateWindow } => entry.window != null);
  const hasFiveHour = available.some(entry => entry.kind === 'fiveHour');
  const hasSevenDay = available.some(entry => entry.kind === 'sevenDay');
  const quotaWindows: QuotaEntry[] = available.map(entry => ({ ...entry,
    role: entry.kind === 'fiveHour' || (entry.kind === 'monthly' && hasSevenDay && !hasFiveHour) ? 'primary' : 'secondary',
  }));
  const primaryWindows = quotaWindows.slice(0, 2);
  const single = primaryWindows.length === 1;
  const quotaReadSucceeded = snapshot?.quota_read_succeeded === true;
  const hasQuota = quotaWindows.length > 0;

  return (
    <section className="dashboard-home-quota dashboard-home-primary-card glass-panel p-4" aria-label={t('quota.availability')} aria-live="polite">
      <div className="dashboard-overview-header">
        <div className="dashboard-overview-heading">
          <div>
            <h3>{t('quota.remainingTitle')}</h3>
          </div>
        </div>
        <span title={sourceLabel ?? t('quota.officialSource')} className={`dashboard-overview-status ${hasQuota && quotaReadSucceeded ? 'dashboard-overview-status-confirmed' : ''}`}>
          {hasQuota && !quotaReadSucceeded ? t('quota.savedBadge') : t('quota.officialBadge')}
        </span>
      </div>

      {hasQuota ? (
        <div className="quota-overview-content">
          <div className="quota-overview-rings" data-topology={single ? 'single' : 'dual'}
            style={{ '--quota-stage-size': `${RING_GEOMETRY.outer}px`,
              '--quota-center-size': `${single ? RING_GEOMETRY.singleCenter : RING_GEOMETRY.dualCenter}px`,
            } as CSSProperties}>
            {primaryWindows.map((entry, index) => <QuotaRing key={entry.kind} entry={entry}
              diameter={index === 0 ? RING_GEOMETRY.outer : RING_GEOMETRY.inner} t={t} />)}
            <div className="quota-overview-readouts" aria-hidden="true">
              {primaryWindows.map(entry => <div className="quota-overview-readout" key={entry.kind} data-quota-role={entry.role}>
                <span>{entry.compact}</span><strong>{remainingText(entry.window)}</strong>
              </div>)}
            </div>
          </div>
          <div className="quota-overview-resets">
            {quotaWindows.map((entry, index) => <div className="quota-overview-reset" key={entry.kind}
              data-quota-role={entry.role}
              title={`${entry.label} · ${formatDuration(entry.window.window_duration_mins, t)} · ${formatQuotaReset(entry.window.resets_at, locale, t)}`}>
              {index >= 2 ? <div className="quota-overview-extra">
                <QuotaRing entry={entry} diameter={24} stroke={4} t={t} />
                <span>{entry.compact}</span><strong>{remainingText(entry.window)}</strong>
              </div> : <span className="quota-overview-reset-label">{entry.compact}</span>}
              <span className="quota-overview-reset-time"><RotateCcw size={11} aria-hidden="true" />
                {entry.window.resets_at == null ? t('quota.resetTimeNotProvided') : new Date(entry.window.resets_at).toLocaleString(locale, {
                  month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </span>
            </div>)}
          </div>
        </div>
      ) : (
        <div className="quota-overview-state quota-overview-state-empty">
          <div className="quota-overview-state-copy">
            <ShieldAlert size={18} aria-hidden="true" />
            <div>
              <strong>{quotaReadSucceeded ? t('quota.noActive') : t('quota.checking')}</strong>
            </div>
          </div>
          {!quotaReadSucceeded ? (
            <button onClick={onRefresh} className="quota-overview-refresh glass-button" type="button">
              <RefreshCw size={13} aria-hidden="true" />
              {t('quota.retry')}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
