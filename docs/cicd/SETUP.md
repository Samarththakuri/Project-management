# Pipeline Setup — From Scratch

A sequential walkthrough: empty AWS account and a fresh clone, to a running
deployment reconciled by ArgoCD. Execute it top to bottom.

**Region: `ap-south-1` (Mumbai)** throughout. The repository currently ships
`eu-west-1` defaults; [Stage 2](#stage-2--manual-edits) changes them.

For day-2 operations — rollback, failure triage, cost levers — see
[RUNBOOK.md](RUNBOOK.md). This document is the one-time build-out.

> **Cost warning.** Stages 5–7 create billable AWS resources: roughly **$120–150
> per month** if left running, most of it the EKS control plane (~$73/mo, charged
> whether or not anything is deployed). Nothing here is free-tier. Work through to
> [Stage 11](#stage-11--verify-end-to-end), take your screenshots, then
> [tear it down](#teardown). Treat these figures as indicative and confirm against
> the AWS pricing calculator for `ap-south-1`.

---

## Contents

- [Stage 0 — Prerequisites](#stage-0--prerequisites)
- [Stage 1 — Manual changes at a glance](#stage-1--manual-changes-at-a-glance)
- [Stage 2 — Manual edits](#stage-2--manual-edits)
- [Stage 3 — Verify locally first](#stage-3--verify-locally-first)
- [Stage 4 — GitHub and SonarCloud](#stage-4--github-and-sonarcloud)
- [Stage 5 — AWS account and state bucket](#stage-5--aws-account-and-state-bucket)
- [Stage 6 — Terraform: cluster stack](#stage-6--terraform-cluster-stack)
- [Stage 7 — Wire up outputs](#stage-7--wire-up-outputs)
- [Stage 8 — Terraform: platform stack](#stage-8--terraform-platform-stack)
- [Stage 9 — Cluster secret and ArgoCD](#stage-9--cluster-secret-and-argocd)
- [Stage 10 — First deployment](#stage-10--first-deployment)
- [Stage 11 — Verify end to end](#stage-11--verify-end-to-end)
- [Optional — Domain and TLS](#optional--domain-and-tls)
- [Teardown](#teardown)
- [Troubleshooting](#troubleshooting)

---

## Stage 0 — Prerequisites

### Accounts

| Account | Needed for | Notes |
|---|---|---|
| AWS | Everything from Stage 5 | Needs permission to create IAM roles, VPCs, EKS. Admin is simplest. |
| GitHub | The whole pipeline | Repo must be **public**, or see the note below. |
| MongoDB Atlas | The application database | Free M0 tier is enough. Create it in `ap-south-1` to keep latency low. |
| SonarCloud | The quality gate | Free for public repositories. |
| SMTP provider | Verification / reset email | Mailtrap works; any SMTP host does. |

> **Repository visibility.** A public repo gets code scanning (Trivy SARIF upload),
> secret scanning, and SonarCloud for free. On a private repo the SARIF upload in
> `ci.yml` needs GitHub Advanced Security and will fail the `build-scan` job —
> that step runs *before* the security gate, so the gate never executes. If you
> must stay private, delete the `Publish SARIF to code scanning` step.

### Tools

```bash
aws --version          # v2.x
terraform version      # >= 1.11  (native S3 state locking; earlier needs DynamoDB)
kubectl version --client
helm version           # only if you want to inspect the platform releases
node --version         # >= 22
docker --version
git --version
```

Install anything missing before continuing. Terraform **1.11+** is a hard
requirement — the backend uses `use_lockfile`, which older versions reject.

Authenticate the AWS CLI and confirm you are in the right account:

```bash
aws configure          # set default region to ap-south-1
aws sts get-caller-identity
```

### Mumbai specifics

- `ap-south-1` has three AZs (`ap-south-1a/b/c`), so the shipped `az_count = 3`
  works unchanged.
- `t3.medium` SPOT capacity is available.
- Confirm the pinned EKS version exists in the region before applying:

```bash
aws eks describe-cluster-versions --region ap-south-1 \
  --query 'clusterVersions[].clusterVersion' --output table
```

If `1.33` is absent, set `kubernetes_version` in `cluster/dev.tfvars` to a listed
version.

---

## Stage 1 — Manual changes at a glance

Every value you must set by hand. Details and commands follow; this is the
checklist to audit against when something does not work.

### Files

| # | File | Key | Ships as | Set to |
|---|---|---|---|---|
| 1 | `infra/terraform/backend.hcl` *(you create it)* | `bucket` | `...REPLACE_WITH_ACCOUNT_ID` | `projectcamp-tfstate-<account-id>` |
| 2 | `infra/terraform/backend.hcl` | `region` | `eu-west-1` | `ap-south-1` |
| 3 | `infra/terraform/cluster/dev.tfvars` | `aws_region` | `eu-west-1` | `ap-south-1` |
| 4 | `infra/terraform/cluster/dev.tfvars` | `github_repository` | `Samarththakuri/Project-management` | `<owner>/<repo>` |
| 5 | `infra/terraform/platform/dev.tfvars` | `aws_region` | `eu-west-1` | `ap-south-1` |
| 6 | `infra/terraform/platform/dev.tfvars` | `state_bucket` | `...REPLACE_WITH_ACCOUNT_ID` | same bucket as #1 |
| 7 | `sonar-project.properties` | `sonar.organization` | commented out | your SonarCloud org key |
| 8 | `sonar-project.properties` | `sonar.projectKey` | `projectcamp` | the key SonarCloud generates |
| 9 | `k8s/overlays/dev/patches/configmap.yaml` | `CORS_ORIGIN` | `https://dev.example.com` | the ALB hostname — **[Stage 11](#stage-11--verify-end-to-end)**, not before |
| 10 | `k8s/overlays/dev/patches/configmap.yaml` | `NODE_ENV` | inherits `production` | `development` while on HTTP — see the [cookie trap](#the-cookie-trap) |

Optional, only if you attach a domain — see [Optional — Domain and TLS](#optional--domain-and-tls):

| # | File | Key |
|---|---|---|
| 11 | `infra/terraform/platform/dev.tfvars` | `domain_name`, `create_hosted_zone`, `create_dns_record` |
| 12 | `k8s/overlays/dev/patches/ingress-tls.yaml` *(copy of `.example`)* | `certificate-arn`, `host` |
| 13 | `k8s/overlays/dev/kustomization.yaml` | add the patch to `patches:` |

### GitHub repository settings

`Settings → Secrets and variables → Actions`

| Kind | Name | Value |
|---|---|---|
| Variable | `AWS_REGION` | `ap-south-1` |
| Variable | `AWS_CI_ROLE_ARN` | Terraform output `ci_role_arn` ([Stage 7](#stage-7--wire-up-outputs)) |
| Variable | `ECR_REPO_PREFIX` | Optional; defaults to `projectcamp` |
| Variable | `TRIVY_SEVERITY` | Optional; defaults to `CRITICAL,HIGH` |
| Secret | `SONAR_TOKEN` | From SonarCloud |
| Secret | `SONAR_HOST_URL` | `https://sonarcloud.io` |

There is deliberately **no** AWS access key. Authentication is OIDC only.

### Created by hand in the cluster

| What | Where | Stage |
|---|---|---|
| `projectcamp-backend-secrets` | namespace `projectcamp-dev` | [Stage 9](#stage-9--cluster-secret-and-argocd) |

### External

| What | Stage |
|---|---|
| MongoDB Atlas: NAT gateway IPs added to the access list | [Stage 7](#stage-7--wire-up-outputs) |

---

## Stage 2 — Manual edits

Clone, then make edits 1–8 from the table. Leave 9 and 10 alone until Stage 11 —
the ALB hostname does not exist yet.

```bash
git clone https://github.com/<owner>/<repo>.git projectmanagement
cd projectmanagement
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "$ACCOUNT_ID"
```

### Region and repository

```bash
# Edits 3 and 5 — region in both stacks
sed -i 's/eu-west-1/ap-south-1/' \
  infra/terraform/cluster/dev.tfvars \
  infra/terraform/platform/dev.tfvars

# Edit 4 — must match your repo exactly (IAM trust policy is built from it)
sed -i 's|Samarththakuri/Project-management|<owner>/<repo>|' \
  infra/terraform/cluster/dev.tfvars
```

On macOS use `sed -i ''` instead of `sed -i`. Verify:

```bash
grep -n "aws_region\|github_repository" \
  infra/terraform/cluster/dev.tfvars infra/terraform/platform/dev.tfvars
```

### Backend config

```bash
cd infra/terraform
cp backend.hcl.example backend.hcl        # gitignored — never commit it
sed -i "s/REPLACE_WITH_ACCOUNT_ID/${ACCOUNT_ID}/; s/eu-west-1/ap-south-1/" backend.hcl
cat backend.hcl

# Edit 6 — the platform stack needs the bucket as a plain variable too,
# because terraform_remote_state cannot read -backend-config
sed -i "s/REPLACE_WITH_ACCOUNT_ID/${ACCOUNT_ID}/" platform/dev.tfvars
cd ../..
```

`github_repository` is the one most likely to bite. It is written into the IAM
trust policy, and a mismatch surfaces in GitHub Actions as
`Not authorized to perform sts:AssumeRoleWithWebIdentity` — never as a Terraform
error.

---

## Stage 3 — Verify locally first

Do not debug the application for the first time inside Kubernetes. Prove it runs
on your machine.

```bash
cd backend
cp .env.example .env
```

Fill in `.env`. Generate the two token secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # run twice
```

Then the full local stack, which mirrors the production request topology
including the gateway that stands in for the ALB path split:

```bash
cd ..
docker compose up --build      # http://localhost:8080
```

Register an account, create a project, drag a task across the Kanban board. Then
run what CI will run, so you find failures locally rather than in Actions:

```bash
cd backend  && npm ci && npm run lint && npm run test:coverage
cd ../frontend && npm ci && npm run lint && npm run test:coverage && npm run build
```

All of it must pass before you continue. `docker compose down -v` when finished.

---

## Stage 4 — GitHub and SonarCloud

### SonarCloud

1. Sign in at <https://sonarcloud.io> with GitHub; import the repository.
2. Choose **"With GitHub Actions"** as the analysis method.
3. **Administration → Analysis Method → turn OFF Automatic Analysis.** If you skip
   this, automatic analysis and the CI scan fight and the gate behaves erratically.
4. Note the organization key and the generated project key.

Apply edits 7 and 8:

```properties
# sonar-project.properties
sonar.projectKey=<owner>_<repo>
sonar.organization=<your-org-key>
```

Uncomment the `sonar.organization` line. SonarCloud namespaces project keys as
`<organization>_<repository>`; a self-hosted SonarQube ignores the organization
entirely.

### Repository variables and secrets

Set `SONAR_TOKEN`, `SONAR_HOST_URL` (`https://sonarcloud.io`), and `AWS_REGION`
(`ap-south-1`) now. `AWS_CI_ROLE_ARN` comes in Stage 7.

The `sonarqube` job fails immediately with an explicit error if either secret is
missing, rather than letting the scanner emit a connection error 30 seconds later.

### Push and confirm CI is green

```bash
git checkout -b setup/pipeline
git add -A
git commit -m "chore(ci): configure pipeline for ap-south-1"
git push -u origin setup/pipeline
```

Open a PR. `ci.yml` runs: backend quality, frontend quality, dependency scan,
SonarQube gate, build and scan. **Do not merge until it is green.** Nothing has
touched AWS yet — this workflow has no code path that authenticates to it.

---

## Stage 5 — AWS account and state bucket

Terraform cannot store its state in a bucket it has not created, so the bucket is
made once, out of band.

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-south-1
BUCKET="projectcamp-tfstate-${ACCOUNT_ID}"

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api head-bucket --bucket "$BUCKET" && echo "bucket ready: $BUCKET"
```

Versioning matters: it is the only way back from a corrupted state file.

Unlike every other region, `ap-south-1` **requires** `LocationConstraint`. Omitting
it fails with `IllegalLocationConstraintException`.

There is no DynamoDB lock table. Terraform 1.11+ locks natively in S3 via
`use_lockfile`, which is one less resource to create and explain.

---

## Stage 6 — Terraform: cluster stack

Provisions the VPC, EKS cluster and node group, both ECR repositories, and the
GitHub OIDC provider and CI role.

```bash
cd infra/terraform/cluster
terraform init -backend-config=../backend.hcl
terraform validate
terraform plan -var-file=dev.tfvars -out=cluster.tfplan
```

**Read the plan.** It should create roughly 60–70 resources and destroy nothing.
Confirm every ARN says `ap-south-1`. Then:

```bash
terraform apply cluster.tfplan
```

**This takes 15–20 minutes**, most of it the EKS control plane. It is normal for
`aws_eks_cluster.this` to sit apparently idle for 10+ minutes.

Applying is a deliberate human action. `terraform.yml` in CI only runs `fmt` and
`validate` with `-backend=false`, and holds no AWS credentials at all: the
application deploys continuously because a bad change is cheap to revert, whereas
a bad `terraform apply` can delete a VPC.

---

## Stage 7 — Wire up outputs

Three outputs feed three different systems.

```bash
terraform output                      # everything
terraform output -raw ci_role_arn     # → GitHub variable AWS_CI_ROLE_ARN
terraform output    nat_gateway_public_ips
terraform output -raw kubeconfig_command
```

**1. GitHub.** Set `AWS_CI_ROLE_ARN` to the `ci_role_arn` value. The trust policy
pins the subject to `repo:<owner>/<repo>:ref:refs/heads/main`, so no other branch
and no other repository can assume it.

**2. MongoDB Atlas.** Add every address from `nat_gateway_public_ips` to
`Network Access → IP Access List`. All cluster egress leaves through the NAT
gateway, so Atlas sees those addresses, not pod IPs.

> Skipping this is the single most common reason the backend starts, passes its
> liveness probe, and still fails readiness — the liveness probe deliberately does
> not check Mongo, so the pod stays up while never becoming ready.

Create the database user and grab the connection string while you are there. Set
the database name to `projectcamp`.

**3. kubectl.** Run the `kubeconfig_command` output, which is:

```bash
aws eks update-kubeconfig --region ap-south-1 --name <cluster_name>
kubectl get nodes           # expect 2 nodes, STATUS Ready
```

Both nodes must be `Ready` before Stage 8. The platform stack talks to the
Kubernetes API directly and will fail against an unreachable cluster.

---

## Stage 8 — Terraform: platform stack

Installs the AWS Load Balancer Controller, ArgoCD, metrics-server, and
kube-prometheus-stack.

```bash
cd ../platform
terraform init -backend-config=../backend.hcl
terraform plan -var-file=dev.tfvars -var "state_bucket=${BUCKET}" -out=platform.tfplan
terraform apply platform.tfplan
```

`state_bucket` is passed as a plain variable because the `terraform_remote_state`
data source that reads the cluster stack's outputs cannot read `-backend-config`.

Allow 10–15 minutes; kube-prometheus-stack alone has a 1800-second timeout.

```bash
kubectl get pods -A
```

Wait for `aws-load-balancer-controller` (2 replicas), `argocd-*`, and
`metrics-server` to be `Running`.

> **Cost lever.** `enable_monitoring = false` in `platform/dev.tfvars` removes
> Prometheus, Grafana, Alertmanager, kube-state-metrics, node-exporter and 12Gi of
> EBS. It is the cheapest single saving, and nothing else in the pipeline depends
> on it. Leave it `true` only while you actually want the dashboards.

The ownership boundary is strict and worth keeping: **Terraform owns the platform,
ArgoCD owns the application. Nothing appears on both sides.**

---

## Stage 9 — Cluster secret and ArgoCD

### The application secret

The ConfigMap holds only what is safe in git forever. Everything sensitive is
created straight into the cluster and never committed.

```bash
kubectl create namespace projectcamp-dev --dry-run=client -o yaml | kubectl apply -f -

kubectl -n projectcamp-dev create secret generic projectcamp-backend-secrets \
  --from-literal=MONGO_URI='mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/projectcamp' \
  --from-literal=ACCESS_TOKEN_SECRET='<64-hex>' \
  --from-literal=REFRESH_TOKEN_SECRET='<64-hex-different>' \
  --from-literal=MAILTRAP_SMTP_HOST='<host>' \
  --from-literal=MAILTRAP_SMTP_PORT='<port>' \
  --from-literal=MAILTRAP_SMTP_USER='<user>' \
  --from-literal=MAILTRAP_SMTP_PASS='<pass>'

kubectl -n projectcamp-dev get secret projectcamp-backend-secrets \
  -o jsonpath='{.data}' | tr ',' '\n' | cut -d'"' -f2
```

That last command lists the **keys only**, which is what you want to verify — all
seven must be present. A missing key makes the pod fail to start loudly, which is
deliberate: `optional` is left at its default of `false` so you never get a
container that silently booted with an undefined `MONGO_URI` and crash-looped
later for a confusing reason.

Use a different value for each token secret. Reusing one means a refresh token
validates as an access token.

### Register the ArgoCD Applications

```bash
cd ../../..           # repository root
kubectl apply -f argocd/application.yaml
kubectl apply -f argocd/application-monitoring.yaml
kubectl -n argocd get applications
```

Both will report `OutOfSync` / `Degraded`, and pods will be `ImagePullBackOff` on
tag `NOT-DEPLOYED`. **This is correct.** That placeholder is deliberately not a
real tag, so that before CI has ever run the pull fails loudly instead of silently
starting whatever some floating tag happens to point at. Stage 10 fixes it.

### Reach the ArgoCD UI

Deliberately not exposed through an Ingress — there is no public front door to
secure.

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo
kubectl -n argocd port-forward svc/argocd-server 8080:80
```

Open <http://localhost:8080>, user `admin`.

> The platform stack also emits `argocd_port_forward_command`, but it maps
> `8080:443` and its description says `https://localhost:8080`. The chart is
> installed with `server.insecure = true`
> (`modules/platform-helm/main.tf`), so the server speaks plain HTTP and the
> `https://` scheme fails with a TLS error. Use the port-80 form above.

---

## Stage 10 — First deployment

Merge the Stage 4 PR. That fires `deploy.yml`:

1. `quality` — every gate from `ci.yml`, re-run against the merge commit
2. `push-ecr` — OIDC into AWS, build and push both images tagged with the commit SHA
3. `update-manifests` — `kustomize edit set image`, then commit the new tags back to `main`

Watch it in the Actions tab. The whole run is roughly 8–12 minutes.

```bash
git checkout main && git pull
git log --oneline -1          # expect "chore(deploy): update image to <sha>"
grep -A4 "^images:" k8s/overlays/dev/kustomization.yaml
```

The tag must now be a real SHA pointing at
`<account>.dkr.ecr.ap-south-1.amazonaws.com/projectcamp-backend:<sha>`.

One tag, and it is the commit SHA — never `latest`. ECR has tag immutability
enabled, so that tag can never be repointed even deliberately. That is what makes
rollback deterministic rather than hopeful.

ArgoCD polls every 3 minutes; press **Refresh** in the UI to skip the wait.

```bash
kubectl -n projectcamp-dev get pods -w      # expect 2 backend + 2 frontend Running
kubectl -n projectcamp-dev get ingress projectcamp
```

The ALB takes 2–3 minutes to provision and report an `ADDRESS`.

---

## Stage 11 — Verify end to end

```bash
ALB=$(kubectl -n projectcamp-dev get ingress projectcamp \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "$ALB"

curl -i "http://${ALB}/healthz"          # frontend nginx  → 200
curl -i "http://${ALB}/api/v1/healthcheck"   # backend      → 200
```

Both must return 200 before you go further.

### Now apply edits 9 and 10

`CORS_ORIGIN` still says `https://dev.example.com`. It is load-bearing twice over:
the CORS allowlist **and** the base URL for emailed verification and password-reset
links. Wrong value means logins that work and emails that point nowhere.

#### The cookie trap

The base ConfigMap sets `NODE_ENV: production`, and
[`auth.controllers.js`](../../backend/src/controllers/auth.controllers.js) sets
`secure: process.env.NODE_ENV === "production"` on the auth cookies. A `Secure`
cookie is not stored or sent over plain HTTP. Without a domain the ALB serves HTTP
only — so login returns 200, sets nothing, and every subsequent request is
unauthenticated. It looks like a broken backend and is not.

Until TLS is on, edit `k8s/overlays/dev/patches/configmap.yaml`:

```yaml
data:
  CORS_ORIGIN: "http://<your-alb-hostname>"   # http, and no trailing slash
  NODE_ENV: "development"                     # temporary: allows non-Secure cookies
  ACCESS_TOKEN_EXPIRY: "15m"
  REFRESH_TOKEN_EXPIRY: "1d"
```

Revert `NODE_ENV` to `production` the moment you attach a real certificate.

```bash
git add k8s/overlays/dev/patches/configmap.yaml
git commit -m "chore(k8s): point CORS_ORIGIN at the ALB hostname"
git push
```

`deploy.yml` ignores pushes that only touch `k8s/**`, so this does not rebuild
anything — ArgoCD simply picks it up. Restart to pick up the new environment:

```bash
kubectl -n projectcamp-dev rollout restart deployment projectcamp-backend
kubectl -n projectcamp-dev rollout status  deployment projectcamp-backend
```

### Final checks

Open `http://<alb-hostname>`, register, verify the email link points at the ALB
hostname, sign in, create a project, drag a task.

```bash
# GitOps self-healing — the whole point of the architecture
kubectl -n projectcamp-dev scale deployment projectcamp-frontend --replicas=5
# ArgoCD reverts it within ~3 minutes. The backend is exempt via ignoreDifferences
# on /spec/replicas, so the HPA and self-heal do not fight.

# Metrics and dashboards
kubectl -n projectcamp-dev port-forward svc/projectcamp-backend 8000:8000
curl -s localhost:8000/metrics | head

kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
# admin / prom-operator → "Project Camp - Golden Signals"
```

Screenshot the Grafana dashboard, the ArgoCD topology, and a green Actions run now
— those are the artifacts worth keeping once the cluster is gone.

---

## Optional — Domain and TLS

Only with a registered domain. Two passes, because the alias record needs an ALB
that does not exist until ArgoCD has synced the Ingress.

**Pass 1 — certificate.** In `platform/dev.tfvars`:

```hcl
domain_name        = "yourdomain.com"
subdomain          = "dev"
create_hosted_zone = true    # false if the zone already exists
create_dns_record  = false   # still false
```

```bash
cd infra/terraform/platform
terraform apply -var-file=dev.tfvars -var "state_bucket=${BUCKET}"
terraform output -raw certificate_arn
terraform output -raw app_url        # this exact value becomes CORS_ORIGIN
```

If you created the hosted zone, set its nameservers at your registrar. The
platform stack does not surface them as an output (the `route53-acm` module has a
`name_servers` output, but `platform/outputs.tf` does not re-export it), so read
them from the API:

```bash
aws route53 list-hosted-zones-by-name --dns-name yourdomain.com \
  --query 'HostedZones[0].Id' --output text        # /hostedzone/ZXXXXXXXXXXXXX
aws route53 get-hosted-zone --id <that-id> \
  --query 'DelegationSet.NameServers' --output table
```

DNS validation blocks until the nameservers propagate — up to an hour on a fresh
zone.

**Pass 2 — Ingress and record.**

```bash
cd ../../..
cp k8s/overlays/dev/patches/ingress-tls.yaml.example \
   k8s/overlays/dev/patches/ingress-tls.yaml
```

Replace `REPLACE_WITH_CERTIFICATE_ARN` and `dev.example.com`, then add it to
`k8s/overlays/dev/kustomization.yaml`:

```yaml
patches:
  - path: patches/configmap.yaml
  - path: patches/resources.yaml
  - path: patches/ingress-tls.yaml
```

Set `CORS_ORIGIN: "https://dev.yourdomain.com"` and **restore
`NODE_ENV: "production"`** in `patches/configmap.yaml`. Verify and push:

```bash
kubectl kustomize k8s/overlays/dev | grep -A3 "certificate-arn"
git add -A && git commit -m "feat(k8s): enable TLS" && git push
```

Then set `create_dns_record = true` and apply the platform stack once more.

---

## Teardown

**Do this as soon as you are finished.** The cluster bills whether or not anyone
uses it.

Order matters: delete the workload first, or the load balancer controller leaves an
orphaned ALB that blocks VPC deletion and turns `terraform destroy` into a manual
console hunt.

```bash
# 1. Let ArgoCD prune the application, then remove ArgoCD's own objects
kubectl delete -f argocd/application.yaml
kubectl delete -f argocd/application-monitoring.yaml
kubectl -n projectcamp-dev get ingress      # wait until empty

# 2. Platform
cd infra/terraform/platform
terraform destroy -var-file=dev.tfvars -var "state_bucket=${BUCKET}"

# 3. Empty ECR, which refuses to delete while it holds images
for REPO in projectcamp-backend projectcamp-frontend; do
  IDS=$(aws ecr list-images --repository-name "$REPO" --region ap-south-1 \
        --query 'imageIds[*]' --output json)
  [ "$IDS" != "[]" ] && aws ecr batch-delete-image --repository-name "$REPO" \
        --region ap-south-1 --image-ids "$IDS"
done

# 4. Cluster
cd ../cluster
terraform destroy -var-file=dev.tfvars
```

`force_delete = false` on the ECR repositories is deliberate — it makes you look at
what you are deleting.

Confirm nothing survives:

```bash
aws eks list-clusters --region ap-south-1
aws ec2 describe-nat-gateways --region ap-south-1 \
  --filter Name=state,Values=available --query 'NatGateways[].NatGatewayId'
aws elbv2 describe-load-balancers --region ap-south-1 --query 'LoadBalancers[].LoadBalancerName'
```

All three should be empty. A surviving NAT gateway or ALB is the usual cause of a
surprise bill. The state bucket is not managed by Terraform and remains; delete it
by hand when you are done with the project entirely.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `IllegalLocationConstraintException` creating the bucket | `ap-south-1` requires `--create-bucket-configuration LocationConstraint=ap-south-1`. |
| `Error acquiring the state lock` | A previous run died. Confirm nothing else is applying, then `terraform force-unlock <id>`. |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | `github_repository` in `cluster/dev.tfvars` does not match the real repo, or the push is not from `refs/heads/main`. Re-apply the cluster stack after fixing. |
| `Deploy` fails instantly requesting `security-events` | `deploy.yml`'s top-level `permissions` must grant everything `ci.yml` asks for; a called workflow cannot escalate beyond its caller. |
| `sonarqube` job fails at the preflight | `SONAR_TOKEN` / `SONAR_HOST_URL` unset. |
| Sonar results look erratic | SonarCloud Automatic Analysis is still on. Turn it off. |
| `ImagePullBackOff` on `NOT-DEPLOYED` | Expected until the first successful `deploy.yml`. |
| `ImagePullBackOff` on a real SHA | Region mismatch: the `AWS_REGION` variable and `aws_region` in tfvars must both be `ap-south-1`. |
| Pods `CreateContainerConfigError` | `projectcamp-backend-secrets` missing or in the wrong namespace. |
| Backend `Running` but never `Ready` | Atlas access list is missing the NAT gateway IPs. Liveness deliberately does not check Mongo; readiness does. |
| Ingress has no `ADDRESS` after 5 min | `kubectl -n kube-system logs -l app.kubernetes.io/name=aws-load-balancer-controller`. Usually missing subnet tags or IRSA. |
| Login returns 200 but the session does not persist | The [cookie trap](#the-cookie-trap). `NODE_ENV=production` sets `Secure` cookies, which browsers drop over HTTP. |
| Verification emails link to `dev.example.com` | `CORS_ORIGIN` never updated — edit 9. |
| Backend replicas keep changing in ArgoCD | Expected: the HPA owns that field, and `ignoreDifferences` on `/spec/replicas` keeps self-heal from fighting it. Do not remove it. |
| `terraform destroy` hangs on the VPC | An ALB or ENI survives. Delete the Ingress first, then retry. |
