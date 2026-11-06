/* WatcherOsint i18n — English + Persian (RTL). Usage: data-i18n, data-i18n-ph, data-i18n-aria, WO.t(key, vars) */
(function () {
  'use strict';
  var WO = (window.WO = window.WO || {});
  var D = {
    en: {
      'skip': 'Skip to content', 'brand': 'WatcherOsint',
      'nav.home': 'Home', 'nav.console': 'Console', 'nav.settings': 'Settings', 'nav.signin': 'Sign in', 'nav.signup': 'Create account', 'nav.signout': 'Sign out',
      'lang.other': 'فارسی', 'lang.aria': 'Switch language to Persian',
      'common.copy': 'Copy', 'common.copied': 'Copied', 'common.download': 'Download', 'common.back': 'Back', 'common.show': 'Show', 'common.hide': 'Hide',
      'common.cancel': 'Cancel', 'common.revoke': 'Revoke', 'common.this_device': 'This device', 'common.loading': 'Loading…', 'common.yes': 'Yes', 'common.no': 'No', 'common.none': 'None',
      'hero.badge': 'Open-source intelligence, responsibly', 'hero.t1': 'Map the public footprint', 'hero.t2': 'of any number, email or username.',
      'hero.lead': 'Classify phone numbers, check email health and scan 45+ platforms for a username — fast, private and built only on public signals.',
      'hero.cta.console': 'Open console', 'hero.cta.signup': 'Create free account', 'hero.cta.signin': 'Sign in',
      'trust.1': 'Public data only', 'trust.2': 'Email-verified accounts', 'trust.3': 'No tracking, no ads',
      'feat.title': 'Three tools. One workflow.', 'feat.sub': 'Everything runs on public signals and is rate-limited to stay respectful.',
      'feat.phone.t': 'Phone intelligence', 'feat.phone.d': 'Carrier, region, line type, vanity-number patterns, service codes and a risk score for Iranian and international numbers.',
      'feat.email.t': 'Email health', 'feat.email.d': 'Syntax, disposable & free-provider detection, MX / SPF / DMARC posture and Gravatar presence.',
      'feat.user.t': 'Username sweep', 'feat.user.d': 'Concurrent checks across 45+ global and Iranian platforms with clear found / not found / unknown states.',
      'feat.sec.t': 'Locked-down access', 'feat.sec.d': 'Only verified, signed-in users can run scans — protecting the service and its targets from abuse.',
      'sec.title': 'Security that is actually switched on', 'sec.sub': 'Not a checklist for the brochure — each of these is enforced by the server.',
      'sec.1.t': 'Email OTP verification', 'sec.1.d': '6-digit codes, hashed at rest, 10-minute expiry, 5 tries.',
      'sec.2.t': 'Authenticator 2FA', 'sec.2.d': 'TOTP with replay protection and one-time recovery codes.',
      'sec.3.t': 'Strong password storage', 'sec.3.d': 'scrypt hashes, a policy that blocks common passwords, constant-time checks.',
      'sec.4.t': 'Lockout & rate limits', 'sec.4.d': 'Per-IP, per-account and per-email throttles stop brute force.',
      'sec.5.t': 'Revocable sessions', 'sec.5.d': 'Server-side sessions you can list and end from any device.',
      'sec.6.t': 'Hardened web layer', 'sec.6.d': 'Strict CSP, CSRF tokens, Origin checks and __Host- cookies.',
      'ethics.t': 'Use it responsibly', 'ethics.d': 'WatcherOsint reads public signals only and never bypasses privacy controls. You are responsible for complying with the law and with each platform’s terms.',
      'footer.rights': 'Built for ethical OSINT.',
      'term.title': 'watcher — demo output', 'term.run1': 'analyze phone 0912•••4567', 'term.run2': 'scan username "nova_dev"',
      'auth.side.t1': 'Verified access to', 'auth.side.t2': 'your intelligence console.',
      'auth.side.1': 'Email OTP confirms every new account', 'auth.side.2': 'Optional authenticator-app 2FA', 'auth.side.3': 'Sessions you can revoke at any time',
      'auth.tab.signin': 'Sign in', 'auth.tab.signup': 'Create account', 'auth.tabs.aria': 'Sign in or create an account',
      'auth.signin.t': 'Welcome back', 'auth.signin.d': 'Sign in to open the console.', 'auth.signin.btn': 'Sign in',
      'auth.signup.t': 'Create your account', 'auth.signup.d': 'We’ll email a 6-digit code to confirm it’s really you.', 'auth.signup.btn': 'Create account & send code',
      'f.email': 'Email', 'f.username': 'Username', 'f.identifier': 'Email or username', 'f.password': 'Password', 'f.password.new': 'New password',
      'f.password.current': 'Current password', 'f.remember': 'Keep me signed in for 14 days', 'f.code': 'Code', 'f.recovery': 'Recovery code',
      'f.username.hint': '3–24 characters: letters, digits, dot, dash, underscore.',
      'auth.forgot': 'Forgot password?', 'auth.or': 'or', 'auth.google': 'Google', 'auth.github': 'GitHub',
      'pw.rule.len': 'At least 10 characters', 'pw.rule.mix': '3 of 4: a–z, A–Z, 0–9, symbols (or 16+ characters)', 'pw.rule.common': 'Not a common password', 'pw.rule.me': 'Doesn’t contain your name or email',
      'pw.s0': 'Enter a password', 'pw.s1': 'Weak', 'pw.s2': 'Fair', 'pw.s3': 'Good', 'pw.s4': 'Strong',
      'otp.t': 'Check your email', 'otp.d': 'We sent a 6-digit code to {email}.', 'otp.aria': 'Verification code, 6 digits', 'otp.digit': 'Digit {n} of 6',
      'otp.expires': 'Code expires in', 'otp.resend': 'Resend code', 'otp.resend_in': 'Resend in {s}s', 'otp.sent_again': 'A new code is on its way.',
      'otp.change': 'Use a different email', 'otp.verify': 'Verify & continue', 'otp.expired': 'This code has expired. Request a new one.',
      'otp.tries': '{n} attempts left', 'otp.nomail': 'Email delivery is not configured on this server. The administrator can read the code in the server log.',
      'totp.t': 'Two-step verification', 'totp.d': 'Enter the 6-digit code from your authenticator app.', 'totp.recovery': 'Use a recovery code instead', 'totp.app': 'Use authenticator code instead', 'totp.btn': 'Verify',
      'forgot.t': 'Reset your password', 'forgot.d': 'Enter your email and we’ll send a code.', 'forgot.btn': 'Send code',
      'reset.t': 'Choose a new password', 'reset.d': 'Enter the code we emailed to {email} and pick a new password.', 'reset.btn': 'Update password', 'reset.ok': 'Password updated. Sign in with your new password.',
      'done.t': 'You’re in', 'done.d': 'Redirecting to your console…', 'auth.back': 'Back to sign in',
      'con.t': 'Intelligence console', 'con.d': 'Public-signal analysis. Results are informational — verify before acting.',
      'tab.phone': 'Phone', 'tab.email': 'Email', 'tab.username': 'Username', 'con.tabs.aria': 'Choose a tool',
      'phone.lbl': 'Phone number', 'phone.ph': '09123456789 or +98 912 345 6789', 'phone.btn': 'Analyze number',
      'email.lbl': 'Email address', 'email.ph': 'name@example.com', 'email.btn': 'Analyze email', 'email.iran': 'Include Iranian providers',
      'user.lbl': 'Username', 'user.ph': 'e.g. nova_dev', 'user.btn': 'Scan platforms', 'region.all': 'All', 'region.iran': 'Iran', 'region.global': 'Global', 'region.lbl': 'Region',
      'scanning.phone': 'Analyzing number…', 'scanning.email': 'Checking DNS and providers…', 'scanning.user': 'Scanning platforms — this can take up to a minute.',
      'r.valid': 'Valid', 'r.invalid': 'Invalid', 'r.carrier': 'Carrier', 'r.region': 'Region', 'r.line': 'Line type', 'r.prefix': 'Prefix', 'r.tz': 'Time zone', 'r.e164': 'E.164', 'r.intl': 'International', 'r.country': 'Country',
      'r.spam': 'Risk score', 'r.spam.low': 'Low risk', 'r.spam.med': 'Moderate', 'r.spam.high': 'High risk', 'r.premium': 'Vanity number', 'r.patterns': 'Patterns', 'r.service': 'Service number',
      'r.links': 'Open in messenger', 'r.none': 'None detected', 'r.errors': 'Notes',
      'e.syntax': 'Syntax', 'e.domain': 'Domain', 'e.disposable': 'Disposable', 'e.free': 'Free provider', 'e.iran': 'Iranian provider', 'e.mx': 'Mail servers (MX)', 'e.mx.none': 'No MX records', 'e.provider': 'Hosted by',
      'e.spf': 'SPF', 'e.dmarc': 'DMARC', 'e.gravatar': 'Gravatar', 'e.grav.found': 'Profile found', 'e.grav.none': 'No Gravatar profile', 'e.modules': 'Registration probes',
      'e.modules.n': '{n} modules checked · {k} returned a verified answer', 'e.exists.yes': 'Registered', 'e.exists.no': 'Not registered', 'e.exists.unk': 'No verified adapter',
      'u.checked': 'Checked', 'u.found': 'Found', 'u.filter': 'Filter by status', 'u.open': 'Open profile', 'u.none': 'No results for this filter.',
      'st.FOUND': 'Found', 'st.NOT_FOUND': 'Not found', 'st.UNKNOWN': 'Unknown', 'st.ERROR': 'Error', 'st.TIMEOUT': 'Timeout',
      'x.copy': 'Copy JSON', 'x.download': 'Download JSON',
      'set.t': 'Account & security', 'set.d': 'Manage your sign-in, devices and preferences.',
      'set.profile': 'Profile', 'set.email': 'Email', 'set.username': 'Username', 'set.joined': 'Member since', 'set.provider': 'Signed in via',
      'set.pw.t': 'Change password', 'set.pw.d': 'Changing it signs out every other device.', 'set.pw.btn': 'Update password', 'set.pw.ok': 'Password updated. Other devices were signed out.',
      'set.2fa.t': 'Two-step verification', 'set.2fa.off': 'Add an authenticator app for a second layer of protection.', 'set.2fa.enable': 'Set up 2FA',
      'set.2fa.s1': 'Add this key to your authenticator app (Google Authenticator, Aegis, 1Password…).', 'set.2fa.open': 'Open in authenticator app', 'set.2fa.s2': 'Then enter the 6-digit code it shows:', 'set.2fa.confirm': 'Confirm & enable',
      'set.2fa.on': 'Two-step verification is on', 'set.2fa.rec.t': 'Recovery codes — shown only once', 'set.2fa.rec.d': 'Store them somewhere safe. Each code works a single time if you lose your phone.',
      'set.2fa.dis.t': 'Turn off 2FA', 'set.2fa.dis.btn': 'Turn off two-step verification', 'set.2fa.dis.ok': 'Two-step verification is off.', 'set.2fa.ok': 'Two-step verification enabled.',
      'set.sess.t': 'Active sessions', 'set.sess.all': 'Sign out all other devices', 'set.sess.ok': 'Sessions updated.',
      'set.act.t': 'Security activity', 'set.act.event': 'Event', 'set.act.time': 'Time', 'set.act.ip': 'Network', 'set.act.none': 'No activity yet.',
      'set.pref.t': 'Preferences', 'set.lang': 'Language', 'set.bg': '3D background', 'bg.auto': 'Auto', 'bg.on': 'Always on', 'bg.off': 'Off (battery saver)',
      'ev.signup': 'Account created', 'ev.verify_ok': 'Email verified', 'ev.login_ok': 'Signed in', 'ev.login_fail': 'Failed sign-in attempt', 'ev.locked': 'Account temporarily locked', 'ev.logout': 'Signed out',
      'ev.password_reset': 'Password reset', 'ev.password_changed': 'Password changed', 'ev.2fa_enabled': '2FA enabled', 'ev.2fa_disabled': '2FA disabled', 'ev.sessions_revoked': 'Sessions revoked',
      'ev.recovery_code_used': 'Recovery code used', 'ev.login_fail_2fa': 'Failed 2FA attempt', 'ev.login_google': 'Signed in with Google', 'ev.login_github': 'Signed in with GitHub',
      'err.generic': 'Something went wrong. Please try again.', 'err.network': 'Can’t reach the server. Check your connection.', 'err.rate_limited': 'Too many attempts. Try again in {s}s.',
      'err.csrf_invalid': 'Security token expired. Please retry.', 'err.origin_invalid': 'Request blocked for your safety.', 'err.auth_required': 'Please sign in to continue.',
      'err.email_invalid': 'Enter a valid email address.', 'err.email_disposable': 'Disposable email addresses aren’t allowed.', 'err.username_invalid': 'Username must be 3–24 letters, digits, dot, dash or underscore.',
      'err.username_taken': 'That username is taken.', 'err.pw_short': 'Password must be at least 10 characters.', 'err.pw_long': 'Password is too long.',
      'err.pw_weak': 'Use 3 of: lowercase, uppercase, digits, symbols — or 16+ characters.', 'err.pw_common': 'That password is too common.', 'err.pw_similar': 'Password must not contain your name or email.',
      'err.mail_unavailable': 'Email delivery isn’t set up on this server yet.', 'err.mail_failed': 'We couldn’t send the email. Try again shortly.',
      'err.code_invalid': 'That code isn’t right.', 'err.code_expired': 'The code expired. Request a new one.', 'err.code_locked': 'Too many wrong codes. Request a new one.', 'err.cooldown': 'Please wait before requesting another code.',
      'err.invalid_credentials': 'Wrong email/username or password.', 'err.locked': 'Too many failed attempts — account locked. Try again in {s} min.', 'err.session_expired': 'Your sign-in session expired. Start again.',
      'err.password_incorrect': 'Current password is incorrect.', 'err.twofa_already': 'Two-step verification is already on.', 'err.twofa_not_enabled': 'Two-step verification is not on.', 'err.twofa_setup_missing': 'Start the setup first.',
      'err.oauth_failed': 'Sign-in with that provider failed.', 'err.invalid_input': 'That input isn’t valid.', 'err.missing_dependency': 'This tool is not available on the server.'
    },
    fa: {
      'skip': 'پرش به محتوا', 'brand': 'WatcherOsint',
      'nav.home': 'خانه', 'nav.console': 'کنسول', 'nav.settings': 'تنظیمات', 'nav.signin': 'ورود', 'nav.signup': 'ساخت حساب', 'nav.signout': 'خروج',
      'lang.other': 'English', 'lang.aria': 'تغییر زبان به انگلیسی',
      'common.copy': 'کپی', 'common.copied': 'کپی شد', 'common.download': 'دانلود', 'common.back': 'بازگشت', 'common.show': 'نمایش', 'common.hide': 'پنهان',
      'common.cancel': 'انصراف', 'common.revoke': 'لغو', 'common.this_device': 'این دستگاه', 'common.loading': 'در حال بارگذاری…', 'common.yes': 'بله', 'common.no': 'خیر', 'common.none': 'ندارد',
      'hero.badge': 'اطلاعات متن‌باز، با مسئولیت', 'hero.t1': 'ردپای عمومی', 'hero.t2': 'هر شماره، ایمیل یا نام‌کاربری را ببین.',
      'hero.lead': 'شماره‌ها را دسته‌بندی کن، سلامت ایمیل را بسنج و بیش از ۴۵ پلتفرم را برای یک نام‌کاربری اسکن کن — سریع، خصوصی و فقط بر پایه‌ی نشانه‌های عمومی.',
      'hero.cta.console': 'ورود به کنسول', 'hero.cta.signup': 'ساخت حساب رایگان', 'hero.cta.signin': 'ورود',
      'trust.1': 'فقط داده‌ی عمومی', 'trust.2': 'حساب‌های تاییدشده با ایمیل', 'trust.3': 'بدون ردیابی و تبلیغ',
      'feat.title': 'سه ابزار. یک مسیر کار.', 'feat.sub': 'همه‌چیز روی نشانه‌های عمومی اجرا می‌شود و برای رعایت احترام، محدودیت نرخ دارد.',
      'feat.phone.t': 'تحلیل شماره', 'feat.phone.d': 'اپراتور، منطقه، نوع خط، الگوی شماره‌ی رند، کدهای خدماتی و امتیاز ریسک برای شماره‌های ایرانی و بین‌المللی.',
      'feat.email.t': 'سلامت ایمیل', 'feat.email.d': 'نحو ایمیل، تشخیص ایمیل موقت و رایگان، وضعیت MX / SPF / DMARC و حضور در Gravatar.',
      'feat.user.t': 'جست‌وجوی نام‌کاربری', 'feat.user.d': 'بررسی هم‌زمان بیش از ۴۵ پلتفرم جهانی و ایرانی با وضعیت‌های روشن پیدا شد / پیدا نشد / نامشخص.',
      'feat.sec.t': 'دسترسی قفل‌شده', 'feat.sec.d': 'فقط کاربران تاییدشده و واردشده می‌توانند اسکن بگیرند؛ این کار از سوءاستفاده جلوگیری می‌کند.',
      'sec.title': 'امنیتی که واقعاً فعال است', 'sec.sub': 'این‌ها شعار نیستند؛ هر مورد توسط سرور اعمال می‌شود.',
      'sec.1.t': 'تایید ایمیل با OTP', 'sec.1.d': 'کد ۶ رقمی، ذخیره‌ی هش‌شده، انقضای ۱۰ دقیقه و ۵ بار تلاش.',
      'sec.2.t': 'تایید دومرحله‌ای', 'sec.2.d': 'TOTP با جلوگیری از استفاده‌ی مجدد و کدهای بازیابی یک‌بارمصرف.',
      'sec.3.t': 'ذخیره‌ی امن رمز', 'sec.3.d': 'هش scrypt، سیاست رد رمزهای رایج و مقایسه‌ی هم‌زمان‌ثابت.',
      'sec.4.t': 'قفل حساب و محدودیت نرخ', 'sec.4.d': 'محدودیت بر اساس IP، حساب و ایمیل، جلوی حمله‌ی حدس رمز را می‌گیرد.',
      'sec.5.t': 'نشست‌های قابل لغو', 'sec.5.d': 'نشست‌ها سمت سرور نگه داشته می‌شوند و از هر دستگاه قابل مشاهده و پایان‌دادن‌اند.',
      'sec.6.t': 'لایه‌ی وب مستحکم', 'sec.6.d': 'CSP سخت‌گیرانه، توکن CSRF، بررسی Origin و کوکی‌های __Host-.',
      'ethics.t': 'مسئولانه استفاده کن', 'ethics.d': 'WatcherOsint فقط نشانه‌های عمومی را می‌خواند و هرگز تنظیمات حریم خصوصی را دور نمی‌زند. رعایت قانون و شرایط استفاده‌ی هر پلتفرم بر عهده‌ی توست.',
      'footer.rights': 'ساخته‌شده برای OSINT اخلاقی.',
      'term.title': 'watcher — demo output', 'term.run1': 'analyze phone 0912•••4567', 'term.run2': 'scan username "nova_dev"',
      'auth.side.t1': 'دسترسی تاییدشده به', 'auth.side.t2': 'کنسول اطلاعاتی تو.',
      'auth.side.1': 'هر حساب جدید با OTP ایمیل تایید می‌شود', 'auth.side.2': 'تایید دومرحله‌ای اختیاری با اپ احراز هویت', 'auth.side.3': 'نشست‌هایی که هر لحظه می‌توانی لغو کنی',
      'auth.tab.signin': 'ورود', 'auth.tab.signup': 'ساخت حساب', 'auth.tabs.aria': 'ورود یا ساخت حساب',
      'auth.signin.t': 'خوش برگشتی', 'auth.signin.d': 'برای باز کردن کنسول وارد شو.', 'auth.signin.btn': 'ورود',
      'auth.signup.t': 'حساب خودت را بساز', 'auth.signup.d': 'یک کد ۶ رقمی به ایمیلت می‌فرستیم تا مطمئن شویم خودتی.', 'auth.signup.btn': 'ساخت حساب و ارسال کد',
      'f.email': 'ایمیل', 'f.username': 'نام‌کاربری', 'f.identifier': 'ایمیل یا نام‌کاربری', 'f.password': 'رمز عبور', 'f.password.new': 'رمز عبور جدید',
      'f.password.current': 'رمز عبور فعلی', 'f.remember': 'تا ۱۴ روز واردم نگه دار', 'f.code': 'کد', 'f.recovery': 'کد بازیابی',
      'f.username.hint': '۳ تا ۲۴ کاراکتر: حرف انگلیسی، عدد، نقطه، خط تیره و زیرخط.',
      'auth.forgot': 'رمز را فراموش کرده‌ای؟', 'auth.or': 'یا', 'auth.google': 'گوگل', 'auth.github': 'گیت‌هاب',
      'pw.rule.len': 'حداقل ۱۰ کاراکتر', 'pw.rule.mix': '۳ مورد از ۴: a–z، A–Z، ۰–۹، نماد (یا ۱۶ کاراکتر و بیشتر)', 'pw.rule.common': 'رمز رایج نباشد', 'pw.rule.me': 'شامل نام یا ایمیل تو نباشد',
      'pw.s0': 'رمز را وارد کن', 'pw.s1': 'ضعیف', 'pw.s2': 'متوسط', 'pw.s3': 'خوب', 'pw.s4': 'قوی',
      'otp.t': 'ایمیلت را بررسی کن', 'otp.d': 'یک کد ۶ رقمی به {email} فرستادیم.', 'otp.aria': 'کد تایید، ۶ رقم', 'otp.digit': 'رقم {n} از ۶',
      'otp.expires': 'اعتبار کد', 'otp.resend': 'ارسال دوباره‌ی کد', 'otp.resend_in': 'ارسال دوباره تا {s} ثانیه‌ی دیگر', 'otp.sent_again': 'کد جدید در راه است.',
      'otp.change': 'استفاده از ایمیل دیگر', 'otp.verify': 'تایید و ادامه', 'otp.expired': 'این کد منقضی شده. کد جدید بگیر.',
      'otp.tries': '{n} تلاش باقی مانده', 'otp.nomail': 'ارسال ایمیل روی این سرور تنظیم نشده. مدیر سایت می‌تواند کد را در لاگ سرور ببیند.',
      'totp.t': 'تایید دومرحله‌ای', 'totp.d': 'کد ۶ رقمی را از اپ احراز هویت وارد کن.', 'totp.recovery': 'به‌جای آن از کد بازیابی استفاده کن', 'totp.app': 'به‌جای آن از کد اپ استفاده کن', 'totp.btn': 'تایید',
      'forgot.t': 'بازیابی رمز عبور', 'forgot.d': 'ایمیلت را وارد کن تا کد بفرستیم.', 'forgot.btn': 'ارسال کد',
      'reset.t': 'رمز جدید انتخاب کن', 'reset.d': 'کدی که به {email} فرستادیم را وارد کن و رمز جدید بگذار.', 'reset.btn': 'به‌روزرسانی رمز', 'reset.ok': 'رمز تغییر کرد. با رمز جدید وارد شو.',
      'done.t': 'وارد شدی', 'done.d': 'در حال انتقال به کنسول…', 'auth.back': 'بازگشت به ورود',
      'con.t': 'کنسول اطلاعاتی', 'con.d': 'تحلیل نشانه‌های عمومی. نتایج صرفاً اطلاع‌رسانی است؛ پیش از اقدام راستی‌آزمایی کن.',
      'tab.phone': 'شماره', 'tab.email': 'ایمیل', 'tab.username': 'نام‌کاربری', 'con.tabs.aria': 'یک ابزار انتخاب کن',
      'phone.lbl': 'شماره‌ی تلفن', 'phone.ph': '09123456789 یا ‎+98 912 345 6789', 'phone.btn': 'تحلیل شماره',
      'email.lbl': 'آدرس ایمیل', 'email.ph': 'name@example.com', 'email.btn': 'تحلیل ایمیل', 'email.iran': 'شامل سرویس‌دهنده‌های ایرانی',
      'user.lbl': 'نام‌کاربری', 'user.ph': 'مثلاً nova_dev', 'user.btn': 'اسکن پلتفرم‌ها', 'region.all': 'همه', 'region.iran': 'ایران', 'region.global': 'جهانی', 'region.lbl': 'منطقه',
      'scanning.phone': 'در حال تحلیل شماره…', 'scanning.email': 'در حال بررسی DNS و سرویس‌ها…', 'scanning.user': 'در حال اسکن پلتفرم‌ها — ممکن است تا یک دقیقه طول بکشد.',
      'r.valid': 'معتبر', 'r.invalid': 'نامعتبر', 'r.carrier': 'اپراتور', 'r.region': 'منطقه', 'r.line': 'نوع خط', 'r.prefix': 'پیش‌شماره', 'r.tz': 'منطقه‌ی زمانی', 'r.e164': 'E.164', 'r.intl': 'بین‌المللی', 'r.country': 'کشور',
      'r.spam': 'امتیاز ریسک', 'r.spam.low': 'ریسک کم', 'r.spam.med': 'متوسط', 'r.spam.high': 'ریسک بالا', 'r.premium': 'شماره‌ی رند', 'r.patterns': 'الگوها', 'r.service': 'شماره‌ی خدماتی',
      'r.links': 'باز کردن در پیام‌رسان', 'r.none': 'موردی یافت نشد', 'r.errors': 'نکته‌ها',
      'e.syntax': 'نحو', 'e.domain': 'دامنه', 'e.disposable': 'موقت', 'e.free': 'سرویس رایگان', 'e.iran': 'سرویس ایرانی', 'e.mx': 'سرورهای ایمیل (MX)', 'e.mx.none': 'رکورد MX وجود ندارد', 'e.provider': 'میزبان',
      'e.spf': 'SPF', 'e.dmarc': 'DMARC', 'e.gravatar': 'Gravatar', 'e.grav.found': 'پروفایل پیدا شد', 'e.grav.none': 'پروفایل Gravatar ندارد', 'e.modules': 'بررسی ثبت‌نام',
      'e.modules.n': '{n} ماژول بررسی شد · {k} پاسخ تاییدشده داشت', 'e.exists.yes': 'ثبت‌نام‌شده', 'e.exists.no': 'ثبت‌نام نشده', 'e.exists.unk': 'آداپتر تاییدشده ندارد',
      'u.checked': 'بررسی‌شده', 'u.found': 'پیدا شد', 'u.filter': 'فیلتر بر اساس وضعیت', 'u.open': 'باز کردن پروفایل', 'u.none': 'برای این فیلتر نتیجه‌ای نیست.',
      'st.FOUND': 'پیدا شد', 'st.NOT_FOUND': 'پیدا نشد', 'st.UNKNOWN': 'نامشخص', 'st.ERROR': 'خطا', 'st.TIMEOUT': 'پایان زمان',
      'x.copy': 'کپی JSON', 'x.download': 'دانلود JSON',
      'set.t': 'حساب و امنیت', 'set.d': 'ورود، دستگاه‌ها و تنظیمات خودت را مدیریت کن.',
      'set.profile': 'پروفایل', 'set.email': 'ایمیل', 'set.username': 'نام‌کاربری', 'set.joined': 'عضویت از', 'set.provider': 'روش ورود',
      'set.pw.t': 'تغییر رمز عبور', 'set.pw.d': 'با تغییر رمز، همه‌ی دستگاه‌های دیگر خارج می‌شوند.', 'set.pw.btn': 'به‌روزرسانی رمز', 'set.pw.ok': 'رمز تغییر کرد و دستگاه‌های دیگر خارج شدند.',
      'set.2fa.t': 'تایید دومرحله‌ای', 'set.2fa.off': 'با یک اپ احراز هویت، لایه‌ی دوم محافظت را اضافه کن.', 'set.2fa.enable': 'راه‌اندازی 2FA',
      'set.2fa.s1': 'این کلید را به اپ احراز هویت اضافه کن (Google Authenticator، Aegis، 1Password…).', 'set.2fa.open': 'باز کردن در اپ احراز هویت', 'set.2fa.s2': 'سپس کد ۶ رقمی که نشان می‌دهد را وارد کن:', 'set.2fa.confirm': 'تایید و فعال‌سازی',
      'set.2fa.on': 'تایید دومرحله‌ای فعال است', 'set.2fa.rec.t': 'کدهای بازیابی — فقط یک‌بار نمایش داده می‌شوند', 'set.2fa.rec.d': 'آن‌ها را جای امنی نگه دار. اگر گوشی‌ات را گم کنی، هر کد فقط یک‌بار کار می‌کند.',
      'set.2fa.dis.t': 'خاموش کردن 2FA', 'set.2fa.dis.btn': 'خاموش کردن تایید دومرحله‌ای', 'set.2fa.dis.ok': 'تایید دومرحله‌ای خاموش شد.', 'set.2fa.ok': 'تایید دومرحله‌ای فعال شد.',
      'set.sess.t': 'نشست‌های فعال', 'set.sess.all': 'خروج از همه‌ی دستگاه‌های دیگر', 'set.sess.ok': 'نشست‌ها به‌روز شد.',
      'set.act.t': 'فعالیت امنیتی', 'set.act.event': 'رویداد', 'set.act.time': 'زمان', 'set.act.ip': 'شبکه', 'set.act.none': 'هنوز فعالیتی ثبت نشده.',
      'set.pref.t': 'ترجیحات', 'set.lang': 'زبان', 'set.bg': 'پس‌زمینه‌ی سه‌بعدی', 'bg.auto': 'خودکار', 'bg.on': 'همیشه روشن', 'bg.off': 'خاموش (صرفه‌جویی باتری)',
      'ev.signup': 'حساب ساخته شد', 'ev.verify_ok': 'ایمیل تایید شد', 'ev.login_ok': 'ورود موفق', 'ev.login_fail': 'تلاش ناموفق برای ورود', 'ev.locked': 'حساب موقتاً قفل شد', 'ev.logout': 'خروج',
      'ev.password_reset': 'بازنشانی رمز', 'ev.password_changed': 'تغییر رمز', 'ev.2fa_enabled': 'فعال‌سازی 2FA', 'ev.2fa_disabled': 'غیرفعال‌سازی 2FA', 'ev.sessions_revoked': 'لغو نشست‌ها',
      'ev.recovery_code_used': 'استفاده از کد بازیابی', 'ev.login_fail_2fa': 'تلاش ناموفق 2FA', 'ev.login_google': 'ورود با گوگل', 'ev.login_github': 'ورود با گیت‌هاب',
      'err.generic': 'مشکلی پیش آمد. دوباره تلاش کن.', 'err.network': 'اتصال به سرور برقرار نشد. اینترنتت را بررسی کن.', 'err.rate_limited': 'تلاش بیش از حد. {s} ثانیه‌ی دیگر دوباره امتحان کن.',
      'err.csrf_invalid': 'توکن امنیتی منقضی شد. دوباره تلاش کن.', 'err.origin_invalid': 'درخواست برای امنیت تو مسدود شد.', 'err.auth_required': 'برای ادامه وارد شو.',
      'err.email_invalid': 'یک ایمیل معتبر وارد کن.', 'err.email_disposable': 'ایمیل‌های موقت مجاز نیستند.', 'err.username_invalid': 'نام‌کاربری باید ۳ تا ۲۴ حرف انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.',
      'err.username_taken': 'این نام‌کاربری قبلاً گرفته شده.', 'err.pw_short': 'رمز باید حداقل ۱۰ کاراکتر باشد.', 'err.pw_long': 'رمز بیش از حد طولانی است.',
      'err.pw_weak': 'از ۳ مورد استفاده کن: حروف کوچک، بزرگ، عدد، نماد — یا ۱۶ کاراکتر و بیشتر.', 'err.pw_common': 'این رمز خیلی رایج است.', 'err.pw_similar': 'رمز نباید شامل نام یا ایمیلت باشد.',
      'err.mail_unavailable': 'ارسال ایمیل هنوز روی این سرور تنظیم نشده.', 'err.mail_failed': 'ارسال ایمیل ممکن نشد. کمی بعد دوباره تلاش کن.',
      'err.code_invalid': 'کد درست نیست.', 'err.code_expired': 'کد منقضی شد. کد جدید بگیر.', 'err.code_locked': 'تلاش اشتباه بیش از حد. کد جدید بگیر.', 'err.cooldown': 'قبل از درخواست کد جدید کمی صبر کن.',
      'err.invalid_credentials': 'ایمیل/نام‌کاربری یا رمز اشتباه است.', 'err.locked': 'تلاش ناموفق زیاد — حساب قفل شد. {s} دقیقه‌ی دیگر دوباره امتحان کن.', 'err.session_expired': 'نشست ورود منقضی شد. از اول شروع کن.',
      'err.password_incorrect': 'رمز فعلی درست نیست.', 'err.twofa_already': 'تایید دومرحله‌ای از قبل فعال است.', 'err.twofa_not_enabled': 'تایید دومرحله‌ای فعال نیست.', 'err.twofa_setup_missing': 'ابتدا راه‌اندازی را شروع کن.',
      'err.oauth_failed': 'ورود با این سرویس ناموفق بود.', 'err.invalid_input': 'ورودی معتبر نیست.', 'err.missing_dependency': 'این ابزار روی سرور در دسترس نیست.'
    }
  };

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  WO.store = { get: safeGet, set: safeSet };

  var lang = safeGet('wo_lang');
  if (lang !== 'en' && lang !== 'fa') lang = (navigator.language || '').toLowerCase().indexOf('fa') === 0 ? 'fa' : 'en';
  WO.lang = lang;

  WO.t = function (key, vars) {
    var s = (D[WO.lang] && D[WO.lang][key]) || D.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  };
  WO.dict = D;

  WO.applyI18n = function (root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = WO.t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', WO.t(el.getAttribute('data-i18n-ph'))); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', WO.t(el.getAttribute('data-i18n-aria'))); });
  };

  function setDir() {
    var h = document.documentElement;
    h.lang = WO.lang; h.dir = WO.lang === 'fa' ? 'rtl' : 'ltr';
  }
  setDir();

  WO.setLang = function (l) {
    if (l !== 'en' && l !== 'fa') return;
    safeSet('wo_lang', l); WO.lang = l; setDir(); WO.applyI18n();
    document.dispatchEvent(new CustomEvent('wo:lang', { detail: l }));
  };

  WO.fmtDate = function (ts) {
    try {
      return new Intl.DateTimeFormat(WO.lang === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts * 1000));
    } catch (e) { return new Date(ts * 1000).toLocaleString(); }
  };
  WO.fmtDay = function (ts) {
    try { return new Intl.DateTimeFormat(WO.lang === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'long' }).format(new Date(ts * 1000)); }
    catch (e) { return new Date(ts * 1000).toDateString(); }
  };
  WO.errMsg = function (res) {
    if (!res) return WO.t('err.generic');
    var code = res.error, key = 'err.' + code;
    if (D.en[key]) {
      var v = {};
      if (res.retry_after != null) { v.s = res.retry_after; if (code === 'locked') v.s = Math.max(1, Math.ceil(res.retry_after / 60)); }
      return WO.t(key, v);
    }
    return WO.t('err.generic');
  };
  document.addEventListener('DOMContentLoaded', function () { WO.applyI18n(); });
})();
