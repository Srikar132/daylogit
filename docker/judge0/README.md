# Self-hosting Judge0 on an AWS VM

Judge0 is the sandbox that runs code submitted from the code widget. This is the
whole deployment, start to finish.

**Why self-hosted:** every hosted option dead-ended. Judge0 CE on RapidAPI requires
a card for its `$0` tier. Piston's public API went whitelist-only in Feb 2026. And
self-hosted Piston downloads its runtimes at start-up, which failed behind our
Docker networking — Judge0's image ships every compiler baked in, so it needs no
outbound network at all once pulled.

---

## 1. The instance

| | |
|---|---|
| AMI | **Ubuntu 22.04 or 24.04 LTS** |
| Type | **t3.small** minimum (2 vCPU / 2 GB). `t3.medium` if more than a few people use it at once. |
| Disk | **20 GB** gp3. The Judge0 image alone is ~1.5 GB. |

Judge0 compiles and runs untrusted code. Give it its own instance — not one sharing
a box with anything you care about — and attach no IAM instance profile it doesn't
need, because code running inside it can reach the instance metadata service.

### Security group

| Port | Source | Why |
|---|---|---|
| 22 | **your IP only** | SSH |
| 80 | `0.0.0.0/0` | Let's Encrypt HTTP-01 challenge |
| 443 | `0.0.0.0/0` | the app calls this from a Vercel function, whose egress IPs aren't a fixed list you can allowlist |

**Never open 2358.** Judge0 speaks plain HTTP and authenticates with a shared
header, so exposing it directly puts the token on the wire in clear text. TLS
terminates in front of it (step 4).

---

## 2. cgroups — do this before anything else

**This is the step that breaks deployments.** Judge0 1.13.1 runs submissions under
isolate 1.8, which requires **cgroup v1**. Ubuntu 22.04 and 24.04 boot with cgroup
v2 by default, and on those the workers start fine and then fail every submission
with a cgroup error.

Check which you have:

```bash
stat -fc %T /sys/fs/cgroup/
# cgroup2fs  -> v2, you must do the fix below
# tmpfs      -> v1, skip to step 3
```

Fix it — edit `/etc/default/grub` and append to `GRUB_CMDLINE_LINUX_DEFAULT`:

```
systemd.unified_cgroup_hierarchy=0 cgroup_enable=memory swapaccount=1
```

So a stock Ubuntu line becomes:

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash systemd.unified_cgroup_hierarchy=0 cgroup_enable=memory swapaccount=1"
```

Then:

```bash
sudo update-grub
sudo reboot
```

`swapaccount=1` matters too: without swap accounting, a memory limit can be evaded
by swapping, so `memory_limit` stops being a real ceiling.

After the reboot, `stat -fc %T /sys/fs/cgroup/` must print `tmpfs`.

---

## 3. Docker and Judge0

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
```

Copy `docker-compose.yml` and `judge0.conf.example` from this directory to
`~/judge0/` on the box, then generate the secrets:

```bash
cd ~/judge0
cp judge0.conf.example judge0.conf

sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" judge0.conf
sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$(openssl rand -hex 24)|"       judge0.conf
sed -i "s|^AUTHN_TOKEN=.*|AUTHN_TOKEN=$(openssl rand -hex 32)|"             judge0.conf
sed -i "s|^AUTHZ_TOKEN=.*|AUTHZ_TOKEN=$(openssl rand -hex 32)|"             judge0.conf

grep AUTHN_TOKEN judge0.conf   # keep this — it becomes JUDGE0_KEY in the app
```

> **AUTHN_TOKEN is not optional.** Judge0 executes arbitrary submitted code. An
> internet-reachable instance without it is an open remote-code-execution service
> for anyone who finds the URL: crypto mining, scanning your VPC, using your box as
> a proxy. It is the only thing between the open internet and a shell on this VM.

Start the database and cache **first**, then the rest. Judge0's server runs
migrations at boot, and `depends_on` waits only for the container to exist, not for
Postgres to accept connections:

```bash
docker compose up -d db redis
sleep 15
docker compose up -d
docker compose ps          # server, workers, db, redis all Up
```

Verify on the box:

```bash
TOKEN=$(grep '^AUTHN_TOKEN=' judge0.conf | cut -d= -f2)
curl -s -H "X-Auth-Token: $TOKEN" http://127.0.0.1:2358/about
curl -s -H "X-Auth-Token: $TOKEN" http://127.0.0.1:2358/languages | head -c 300
```

A real submission, end to end:

```bash
curl -s -X POST "http://127.0.0.1:2358/submissions?base64_encoded=false&wait=true" \
  -H "Content-Type: application/json" -H "X-Auth-Token: $TOKEN" \
  -d '{"language_id":71,"source_code":"print(sum(int(x) for x in input().split()))","stdin":"2 3 4"}'
```

Expect `"stdout": "9\n"` and a status description of `Accepted`. If the status is an
internal error instead, read `docker compose logs workers` — a cgroup complaint
there means step 2 didn't take.

---

## 4. TLS

The app calls Judge0 from a serverless function over the public internet, so the
token crosses the wire on every request and the connection has to be encrypted.

Point an A record (`judge0.your-domain.com`) at the instance's **Elastic IP** first —
Let's Encrypt validates over port 80 and won't issue until DNS resolves. Use an
Elastic IP specifically: a stopped-and-started instance otherwise comes back with a
new public IP and `JUDGE0_URL` silently points at nothing.

Caddy is the least work — one line of config, certificates obtained and renewed
automatically:

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

Replace `/etc/caddy/Caddyfile` with:

```
judge0.your-domain.com {
    reverse_proxy 127.0.0.1:2358
}
```

Then:

```bash
sudo systemctl restart caddy
curl -s -H "X-Auth-Token: $TOKEN" https://judge0.your-domain.com/about
```

---

## 5. Point the app at it

In Vercel → Project → Settings → Environment Variables, for Production **and**
Preview (so preview deployments can run code too):

| Variable | Value |
|---|---|
| `JUDGE0_URL` | `https://judge0.your-domain.com` |
| `JUDGE0_KEY` | the `AUTHN_TOKEN` from `judge0.conf` |
| `JUDGE0_HOST` | **leave unset** |

`JUDGE0_HOST` exists only to switch authentication over to Judge0 CE's RapidAPI
headers. Setting it against a self-hosted instance sends the wrong headers and every
request comes back 401.

Environment variables are read when a deployment is built, so **add them before the
deploy that should use them**, or redeploy afterwards. Adding a variable does not
retroactively change a deployment that is already running.

With `JUDGE0_URL` unset the app still deploys and works normally; only Run reports
`Code execution isn't configured on this server (JUDGE0_URL).`

---

## 6. Operating it

```bash
docker compose logs -f server           # API
docker compose logs -f workers          # sandbox — cgroup problems show up here
docker compose restart
docker compose down                     # keeps the judge0_db volume
docker compose pull && docker compose up -d   # upgrade
```

**Keep the ceilings above what the app asks for.** The limits in `judge0.conf`
(`MAX_CPU_TIME_LIMIT`, `MAX_WALL_TIME_LIMIT`, `MAX_MEMORY_LIMIT`) must be at or
above the values in `lib/judge0.ts` — currently `cpu_time_limit: 5`,
`wall_time_limit: 10`, `memory_limit: 128000`. Judge0 rejects a submission that
exceeds its configured maximum outright rather than clamping it, so a ceiling set
too low fails every run.

**Submissions accumulate in Postgres forever.** Judge0 has no retention policy, so
either add a cron job or watch the disk:

```bash
docker compose exec db psql -U judge0 -c "DELETE FROM submissions WHERE created_at < now() - interval '7 days';"
```

**Back up `judge0.conf`** somewhere that isn't this repo — it's gitignored and holds
real credentials. Losing it means regenerating the token and updating Vercel.
