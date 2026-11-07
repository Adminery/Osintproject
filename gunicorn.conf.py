# Username scans can take 30-60s (45 sites, 12 at a time), so the default 30s timeout would kill the worker.
import os
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
workers = 1          # free tier = 1 small CPU; also keeps the in-memory rate limiter consistent
threads = 4
timeout = 120
