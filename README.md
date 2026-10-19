# Worked For Table Creation

docker compose exec web python -c '
import os
from sqlalchemy import create_engine
from h import models
from h.db import Base, pre_create

engine = create_engine(os.environ["DATABASE_URL"])
pre_create(engine)
Base.metadata.create_all(engine)
print("Hypothesis database tables created.")
'


---

PG_VOLUME=$(docker inspect "$PG_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')

echo "PostgreSQL volume: $PG_VOLUME"



python3 -c "from h.search.client import get_client; es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); es.conn.indices.create(index='hypothesis', ignore=400); print('SUCCESS: Base index created!')"



docker compose exec web sh -lc '
cd /var/lib/hypothesis || exit 1
echo "=== Provider enum ==="
grep -n -A35 -B5 "class IdentityProvider" h/models/user_identity.py
echo "=== OIDC callback and routes ==="
grep -n -E "oidc.redirect|def redirect|add_route|add_view|route_name=" h/views/oidc.py
echo "=== OIDC service ==="
sed -n "1,180p" h/services/oidc.py
echo "=== Login provider buttons ==="
grep -n -E -i "orcid|google|facebook|SocialLoginLink" h/static/scripts/components/LoginForm.tsx
'


curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" http://ip:5005/ws






# Worked For First Time Public Group Creation

docker compose exec -T postgres psql -U postgres -d postgres <<'EOF'
INSERT INTO organization (pubid, name, authority, created, updated)
VALUES ('__default__', 'Hypothesis', 'gitlab.tsip.intratmc.com', now(), now());

INSERT INTO "group"
  (pubid, authority, name, authority_provided_id,
   joinable_by, readable_by, writeable_by,
   enforce_scope, organization_id, created, updated)
VALUES
  ('__world__', 'gitlab.tsip.intratmc.com', 'Public', '__world__',
   NULL, 'world', 'authority',
   false, (SELECT id FROM organization WHERE pubid = '__default__'), now(), now());
EOF

---









# Worked For Mapping Creation And Index

docker compose exec web python3 -c "import json, h.search.config as c; from h.search.client import get_client; c._ensure_icu_plugin = lambda conn: None; s = json.dumps(c.ANALYSIS_SETTINGS).replace('icu_tokenizer', 'standard').replace('icu_folding', 'asciifolding'); c.ANALYSIS_SETTINGS.clear(); c.ANALYSIS_SETTINGS.update(json.loads(s)); es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); c.init(es); print('SUCCESS! Mapping keys:', list(es.conn.indices.get_mapping(index='hypothesis').values())[0]['mappings'].keys())"


---
cat << 'EOF' > apply_gitlab_sso.py
import os, re, shutil

# 1. Patch h/routes.py: Change external URLs from /oidc/.../google to /oidc/.../gitlab
routes_path = "/var/lib/hypothesis/h/routes.py"
if not os.path.exists(routes_path + ".bak"):
    shutil.copy2(routes_path, routes_path + ".bak")
r_txt = open(routes_path + ".bak").read()
r_txt = r_txt.replace('"/oidc/connect/google"', '"/oidc/connect/gitlab"')
r_txt = r_txt.replace('"/oidc/login/google"', '"/oidc/login/gitlab"')
r_txt = r_txt.replace('"/oidc/redirect/google"', '"/oidc/redirect/gitlab"')
open(routes_path, "w").write(r_txt)
print("1. Patched URLs in h/routes.py -> /oidc/.../gitlab")

# 2. Patch h/views/oidc.py: Auto-create first-time users from GitLab username + change flash messages
oidc_path = "/var/lib/hypothesis/h/views/oidc.py"
if not os.path.exists(oidc_path + ".bak"):
    shutil.copy2(oidc_path, oidc_path + ".bak")
o_txt = open(oidc_path + ".bak").read()
o_txt = o_txt.replace('provider_name="Google"', 'provider_name="GitLab"')
o_txt = o_txt.replace('success_message="Google account connected"', 'success_message="GitLab account connected"')

start_marker = '            # Redirect to the "Sign up to Hypothesis with <PROVIDER>" page to'
end_marker = '        headers = login(user, self._request)'

if start_marker not in o_txt or end_marker not in o_txt:
    raise RuntimeError("Markers not found in oidc.py")

before = o_txt.split(start_marker)[0]
after = end_marker + o_txt.split(end_marker, 1)[1]

auto_signup_code = """            # Auto-create user from GitLab username without showing signup form
            raw_uname = (
                decoded_idtoken.get("preferred_username")
                or decoded_idtoken.get("nickname")
                or (decoded_idtoken.get("email") or "").split("@")[0]
                or f"user_{decoded_idtoken['sub']}"
            )
            clean_uname = re.sub(r"[^A-Za-z0-9._]", "_", raw_uname).strip(".")
            if len(clean_uname) < 3:
                clean_uname = f"{clean_uname}_gl"
            clean_uname = clean_uname[:30]
            email = decoded_idtoken.get("email") or f"{clean_uname}@gitlab.local"
            user = self._user_service.fetch_by_email(email, self._request.default_authority)
            if not user:
                signup_svc = self._request.find_service(name="user_signup")
                base_uname = clean_uname
                for suffix in ["", "_1", "_2", "_3", "_4", "_5"]:
                    try_uname = f"{base_uname[:30-len(suffix)]}{suffix}"
                    if not self._user_service.fetch(try_uname, self._request.default_authority):
                        clean_uname = try_uname
                        break
                user = signup_svc.signup(
                    require_activation=False,
                    username=clean_uname,
                    email=email,
                    display_name=decoded_idtoken.get("name") or clean_uname,
                    identities=[{
                        "provider": self.settings.provider,
                        "provider_unique_id": decoded_idtoken["sub"],
                        "email": email,
                        "name": decoded_idtoken.get("name"),
                        "given_name": decoded_idtoken.get("given_name"),
                        "family_name": decoded_idtoken.get("family_name"),
                    }],
                )
            else:
                self._oidc_service.add_identity(
                    user,
                    self.settings.provider,
                    provider_unique_id=decoded_idtoken["sub"],
                    email=email,
                    name=decoded_idtoken.get("name"),
                    given_name=decoded_idtoken.get("given_name"),
                    family_name=decoded_idtoken.get("family_name"),
                )
            self._request.db.flush()

"""

o_txt_new = "import re\n" + before + auto_signup_code + after
open(oidc_path, "w").write(o_txt_new)
print("2. Patched h/views/oidc.py -> Zero-click auto-signup with GitLab username")

# 3. Patch build/scripts/login-forms.bundle.js: Replace Google text & SVG icon with GitLab fox logo
bundle_path = "/var/lib/hypothesis/build/scripts/login-forms.bundle.js"
if not os.path.exists(bundle_path + ".bak"):
    shutil.copy2(bundle_path, bundle_path + ".bak")
b_txt = open(bundle_path + ".bak").read()

gitlab_svg_fn = (
    'function rt({...e}){return Le("svg",{xmlns:"http://www.w3.org/2000/svg",height:"24",viewBox:"0 0 24 24",width:"24",...e,children:['
    'Le("path",{d:"M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z",fill:"#E24329"}),'
    'Le("path",{d:"M12 22.13l3.68-11.33H8.32L12 22.13z",fill:"#E24329"}),'
    'Le("path",{d:"M12 22.13l-3.68-11.33H1.35L12 22.13z",fill:"#FC6D26"}),'
    'Le("path",{d:"M1.35 10.8L.13 14.58a.84.84 0 0 0 .3.94L12 22.13 1.35 10.8z",fill:"#FCA326"}),'
    'Le("path",{d:"M1.35 10.8h6.97L5.51 2.18a.42.42 0 0 0-.8 0L1.35 10.8z",fill:"#E24329"}),'
    'Le("path",{d:"M12 22.13l3.68-11.33h6.97L12 22.13z",fill:"#FC6D26"}),'
    'Le("path",{d:"M22.65 10.8l1.22 3.78a.84.84 0 0 1-.3.94L12 22.13l10.65-11.33z",fill:"#FCA326"}),'
    'Le("path",{d:"M22.65 10.8h-6.97l2.81-8.62a.42.42 0 0 1 .8 0l3.36 8.62z",fill:"#E24329"})'
    ']})}function ot('
)

b_txt, c_icon = re.subn(r"function rt\(\{\.\.\.e\}\)\{return Le\(\"svg\".*?function ot\(", gitlab_svg_fn, b_txt)
b_txt = b_txt.replace('children:"Google"', 'children:"GitLab"')
b_txt = b_txt.replace('"aria-label":"Google icon"', '"aria-label":"GitLab icon"')
b_txt = b_txt.replace('Connect <b>Google</b>', 'Connect <b>GitLab</b>')
open(bundle_path, "w").write(b_txt)
print(f"3. Patched login-forms.bundle.js (icon replaced={c_icon}) -> GitLab text & Fox logo")
EOF
docker compose cp apply_gitlab_sso.py web:/tmp/apply_gitlab_sso.py
docker compose exec -u root web python3 /tmp/apply_gitlab_sso.py
docker compose restart web





docker compose exec -u root web python3 -c '
p = "/var/lib/hypothesis/h/views/oidc.py"
t = open(p).read()
if t.startswith("import re\n"):
    t = t[len("import re\n"):]
t = t.replace("import secrets\n", "import re\nimport secrets\n", 1)
open(p, "w").write(t)
print("FIXED oidc.py import order!")
'


docker compose exec -u root web python3 -c '
import re
p = "/var/lib/hypothesis/h/views/oidc.py"
t = open(p).read()
t = t.replace("self._user_service.fetch_by_email(email, self._request.default_authority)", "self._user_service.fetch(email, self._request.default_authority)")
open(p, "w").write(t)
print("FIXED AttributeError in oidc.py!")
'








docker compose exec -u root web python3 -c '
import re, os
oidc_path = "/var/lib/hypothesis/h/views/oidc.py"
o_txt = open(oidc_path + ".bak").read()
o_txt = o_txt.replace("provider_name=\"Google\"", "provider_name=\"GitLab\"")
o_txt = o_txt.replace("success_message=\"Google account connected\"", "success_message=\"GitLab account connected\"")

start_marker = "            # Redirect to the \"Sign up to Hypothesis with <PROVIDER>\" page to"
end_marker = "        headers = login(user, self._request)"

before = o_txt.split(start_marker)[0]
after = end_marker + o_txt.split(end_marker, 1)[1]

auto_signup_code = """            # Auto-create user from GitLab username without showing signup form
            from h.models import User
            raw_uname = (
                decoded_idtoken.get("preferred_username")
                or decoded_idtoken.get("nickname")
                or (decoded_idtoken.get("email") or "").split("@")[0]
                or f"user_{decoded_idtoken[\"sub\"]}"
            )
            clean_uname = re.sub(r"[^A-Za-z0-9._]", "_", raw_uname).strip(".")
            if len(clean_uname) < 3:
                clean_uname = f"{clean_uname}_gl"
            clean_uname = clean_uname[:30]
            email = decoded_idtoken.get("email") or f"{clean_uname}@gitlab.local"
            
            user = self._request.db.query(User).filter(User.email == email, User.authority == self._request.default_authority).first()
            if not user:
                signup_svc = self._request.find_service(name="user_signup")
                base_uname = clean_uname
                for suffix in ["", "_1", "_2", "_3", "_4", "_5"]:
                    try_uname = f"{base_uname[:30-len(suffix)]}{suffix}"
                    existing = self._request.db.query(User).filter(User.username == try_uname, User.authority == self._request.default_authority).first()
                    if not existing:
                        clean_uname = try_uname
                        break
                user = signup_svc.signup(
                    require_activation=False,
                    username=clean_uname,
                    email=email,
                    display_name=decoded_idtoken.get("name") or clean_uname,
                    identities=[{
                        "provider": self.settings.provider,
                        "provider_unique_id": decoded_idtoken["sub"],
                        "email": email,
                        "name": decoded_idtoken.get("name"),
                        "given_name": decoded_idtoken.get("given_name"),
                        "family_name": decoded_idtoken.get("family_name"),
                    }],
                )
                self._request.db.flush()
            else:
                self._oidc_service.add_identity(
                    user,
                    self.settings.provider,
                    provider_unique_id=decoded_idtoken["sub"],
                    email=email,
                    name=decoded_idtoken.get("name"),
                    given_name=decoded_idtoken.get("given_name"),
                    family_name=decoded_idtoken.get("family_name"),
                )
                self._request.db.flush()
                
            # ROOT CAUSE FIX: Inject the newly created user directly into the memory cache
            # so the cookie generator (AuthTicketService) does not crash and trigger a DB rollback!
            user_svc = self._request.find_service(name="user")
            user_svc._cache[user.userid] = user

"""
o_txt_new = "import re\n" + before + auto_signup_code + after
open(oidc_path, "w").write(o_txt_new)
print("FIXED CACHE CRASH & DB ROLLBACK!")
'










docker compose exec -u root web python3 -c "
p = '/var/lib/hypothesis/h/views/oidc.py'
t = open(p).read()
t = t.replace('f\"user_{decoded_idtoken[\"sub\"]}\"', 'f\"user_{decoded_idtoken[' + chr(39) + 'sub' + chr(39) + ']}\"')
open(p, 'w').write(t)
print('SyntaxError fixed! Single quotes applied.')
"
