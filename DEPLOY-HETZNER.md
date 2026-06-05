# Shipping OWFC Harris to harris.football on your Hetzner server

This is the full, click-by-click guide. It assumes a Hetzner Cloud server running **Ubuntu/Debian** that you can SSH into as `root` (or a sudo user). The site is just static files, so this is straightforward — no app server, no build step.

> **Mental model:** your Hetzner box serves the website files. Supabase holds the changing data (fixtures, results, photos). Day-to-day content is edited in the **Admin panel** on the live site — you only ever touch the server again when you want a *code/design* change.

---

## 0. Before you start
- Your server's **public IP** (Hetzner Cloud console → your server).
- Access to your **domain registrar** for `harris.football` (where you bought it) to set DNS.
- Your finished **Supabase keys** pasted into `js/config.js` (see `README.md`). You can also do this later.
- The site code in a **GitHub repo** (recommended — makes updates one command). If you'd rather not use Git, there's a no-Git option in step 4.

---

## 1. Point the domain at the server
At your registrar, set two DNS records to your server's IP:

| Type | Name | Value |
|------|------|-------|
| A | `@`   | `YOUR_SERVER_IP` |
| A | `www` | `YOUR_SERVER_IP` |

DNS can take anywhere from a few minutes to a couple of hours. Check with:
```bash
dig +short harris.football
```
When it returns your IP, you're ready.

---

## 2. Install nginx
SSH in, then:
```bash
ssh root@YOUR_SERVER_IP
apt update && apt install -y nginx git
```
Allow web traffic through the firewall (if you use `ufw`):
```bash
ufw allow 'Nginx Full'
```

---

## 3. Create the web folder
```bash
mkdir -p /var/www/harris
```

---

## 4. Put the site files on the server

**Option A — Git (recommended).** Push this project folder to a GitHub repo (e.g. `harris-football`), then on the server:
```bash
git clone https://github.com/YOUR-USERNAME/harris-football.git /var/www/harris
```
From now on, updating the live site is just `git pull` (see "Updating" below).

**Option B — No Git (copy from your computer).** From your **local machine** (not the server), in the folder that contains this project:
```bash
rsync -avz --delete ./ root@YOUR_SERVER_IP:/var/www/harris/
```
You'd re-run this each time you change the code.

Either way, set permissions so nginx can read the files:
```bash
chown -R www-data:www-data /var/www/harris
```

---

## 5. Switch on the nginx site
A ready-made config is included at `deploy/nginx-harris.conf`. Install it:
```bash
cp /var/www/harris/deploy/nginx-harris.conf /etc/nginx/sites-available/harris.football
ln -s /etc/nginx/sites-available/harris.football /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default      # remove the nginx welcome page
nginx -t && systemctl reload nginx
```
Visit `http://harris.football` — the site should load (still plain http for one more step).

---

## 6. Add HTTPS (free, automatic)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d harris.football -d www.harris.football
```
Answer the prompts (enter your email, agree, choose redirect-to-HTTPS). Certbot edits nginx for you and auto-renews the certificate. Done — **https://harris.football** is live and secure.

---

## 7. Lock down the login
- The login screen is a real gate. In **live mode** (Supabase keys set), only people you add as users in **Supabase → Authentication → Users** can get in.
- Make yourself admin: in **Supabase → Table editor → profiles**, add a row with your user `id`, your child's `player_id`, and `is_admin = true`. The **⚙ Admin** tab then appears for you on the site.
- Until you add Supabase keys, the site runs in preview mode behind the shared password in `js/config.js` — fine for testing, but switch to Supabase before sharing widely.

---

## Updating it from now on

**Content (the weekly stuff) — no server needed:**
Fixtures, results, scorers, Man of the Match, players, training, events → add them in the **⚙ Admin** panel on the live site. Attendance and photo/video uploads happen on the site too. All saved to Supabase instantly. This is 95% of your updates.

**Code / design changes — one command:**
1. The change is made in the project files (by you, or by me in Cowork).
2. Push it to GitHub (`git add -A && git commit -m "..." && git push`).
3. On the server, run the included helper:
   ```bash
   /var/www/harris/deploy/update.sh
   ```
   (First time only: `chmod +x /var/www/harris/deploy/update.sh`.)

That pulls the latest files and they're live immediately. Because it's `git reset --hard origin/main`, you can always roll back by reverting a commit and re-running it.

> **Optional later:** auto-deploy on every push via a GitHub Action that SSHes in and runs `update.sh`. Ask me when you want it — it removes the manual server step entirely.

---

## Quick troubleshooting
- **Site won't load:** `nginx -t` (config OK?), `systemctl status nginx`, and confirm `dig +short harris.football` shows your IP.
- **HTTPS failed:** DNS must point at the server *before* running certbot. Wait for `dig` to resolve, then re-run step 6.
- **Updated but I see the old version:** hard-refresh (Ctrl/Cmd+Shift+R). The config already sets `no-store` on `index.html` and `config.js` to minimise this.
- **Login won't accept anyone:** in live mode the user must exist in Supabase Auth; in preview mode use the password in `js/config.js`.
