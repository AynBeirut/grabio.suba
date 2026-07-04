import { supabase } from '@/lib/supabase';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  '997465465802-biu0r3k8ff880560gvgd8tao71361bp4.apps.googleusercontent.com';

type GoogleCredentialResponse = { credential: string };
type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; type?: string; text?: string; width?: number },
          ) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in script failed to load')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in script failed to load'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Google One Tap / account picker → Supabase session (no OAuth client secret). */
export async function signInWithGoogleIdToken(): Promise<{ error: Error | null }> {
  await loadGoogleIdentityScript();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (error: Error | null) => {
      if (settled) return;
      settled = true;
      resolve({ error });
    };

    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });
        finish(error ? new Error(error.message) : null);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google!.accounts.id.prompt((notification) => {
      if (
        notification.isNotDisplayed() ||
        notification.isSkippedMoment() ||
        notification.isDismissedMoment()
      ) {
        const host = document.createElement('div');
        host.style.position = 'fixed';
        host.style.inset = '0';
        host.style.display = 'flex';
        host.style.alignItems = 'center';
        host.style.justifyContent = 'center';
        host.style.background = 'rgba(0,0,0,0.35)';
        host.style.zIndex = '9999';
        document.body.appendChild(host);

        const panel = document.createElement('div');
        panel.style.background = '#fff';
        panel.style.padding = '24px';
        panel.style.borderRadius = '12px';
        host.appendChild(panel);

        window.google!.accounts.id.renderButton(panel, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          width: 280,
        });

        const cleanup = () => host.remove();
        host.addEventListener('click', (e) => {
          if (e.target === host) {
            cleanup();
            finish(new Error('Google sign-in was cancelled'));
          }
        });

        setTimeout(() => {
          if (!settled && !panel.querySelector('[role="button"]')) {
            cleanup();
            finish(
              new Error(
                'Google sign-in blocked. Add http://grabio.online and https://grabio.online under Authorized JavaScript origins in Google Cloud Console.',
              ),
            );
          }
        }, 8000);
      }
    });
  });
}
