import { useEffect, useState } from 'react';
import { sendTestPush, subscribeToPush } from '../lib/push';

type Status = 'unsupported' | 'idle' | 'enabling' | 'ready' | 'sending' | 'sent' | 'error';

export default function NotificationControls() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('Tap to enable real phone notifications.');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      setMessage('Push notifications are not supported in this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      setMessage('Notifications are allowed. Tap to send a test.');
      setStatus('ready');
    } else if (Notification.permission === 'denied') {
      setStatus('error');
      setMessage('Notifications are blocked. Enable them in Chrome site settings.');
    }
  }, []);

  const handleClick = async () => {
    try {
      if (status === 'ready' || status === 'sent') {
        setStatus('sending');
        await subscribeToPush();
        const result = await sendTestPush();
        setStatus('sent');
        setMessage(`Sent to ${result.sent} device${result.sent === 1 ? '' : 's'}.`);
        return;
      }

      setStatus('enabling');
      const subscription = await subscribeToPush();
      if (!subscription) {
        setStatus('error');
        setMessage('Could not enable notifications. Check HTTPS and Chrome permission.');
        return;
      }

      setStatus('ready');
      setMessage('Ready. Lock the Pixel, then send from Merchant or tap here to test.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Notification setup failed.');
    }
  };

  if (status === 'unsupported') return null;

  const busy = status === 'enabling' || status === 'sending';
  const label = status === 'ready' || status === 'sent' ? 'Send test push' : 'Enable notifications';

  return (
    <div className="fixed left-3 right-3 top-3 z-50 pointer-events-none">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="pointer-events-auto w-full rounded-2xl border border-white/50 bg-stone-950/72 px-4 py-3 text-left text-white shadow-2xl backdrop-blur-xl disabled:opacity-70"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/85">
            Real push demo
          </span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">
            {busy ? 'Working...' : label}
          </span>
        </div>
        <div className="mt-1 text-[12px] leading-snug text-stone-100/80">{message}</div>
      </button>
    </div>
  );
}
