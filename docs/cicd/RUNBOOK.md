# CI/CD Runbook

Reference and day-2 operations for the pipeline: how each piece is configured, what
runs when, how to roll back, and what the common failures mean.

> **Setting this up for the first time?** Follow **[SETUP.md](SETUP.md)** instead —
> a sequential from-scratch walkthrough with every manual edit and placeholder
> called out in order. Come back here once it is running.

Region throughout: **`ap-south-1` (Mumbai)**.

**Topology**

```
PR ──► ci.yml (quality + security gates, publishes nothing)
                                  │
merge to main ──► deploy.yml ──► push image to ECR ──► commit new tag to k8s/overlays/dev
                                                                  │
                                                            ArgoCD ──► EKS
```

CI never touches the cluster. It has no kubeconfig and no cluster credentials.
The handoff is a git commit; ArgoCD is what deploys.

---

## Contents

1. [Local development](#1-local-development)
2. [Repository configuration](#2-repository-configuration)
3. [Static analysis and security scanning](#3-static-analysis-and-security-scanning)
4. [Terraform: cluster and platform](#4-terraform-cluster-and-platform)
5. [Kubernetes and ArgoCD bootstrap](#5-kubernetes-and-argocd-bootstrap)
6. [Operating the pipeline](#6-operating-the-pipeline)
7. [Teardown](#7-teardown)

---

## 1. Local development

Two ways to run the stack. Neither is a deployment mechanism.

**Node directly** — fastest inner loop.

```bash
cd backend  && cp .env.example .env   # fill it in, then:
npm install && npm run dev            # :8000
cd frontend && npm install && npm run dev   # :5173, proxies /api to :8000
```

`PORT` must stay `8000` — `frontend/vite.config.js` hardcodes that proxy target.

**Docker Compose** — mirrors the production request topology, including the
gateway that stands in for the ALB path split.

```bash
docker compose up --build     # http://localhost:8080
```

This brings up `mongo:7`, the backend, the frontend, and an nginx gateway using
`deploy/local/gateway.conf`, which reproduces the `/api` → backend, `/` → frontend
split the ALB Ingress performs in the cluster. Secrets in `docker-compose.yml` are
throwaway values, safe because nothing there is reachable off the machine.

Node 22 or newer is required — both `package.json` files declare
`"engines": { "node": ">=22" }` and CI pins Node 22.

---

## 2. Repository configuration

### Variables

`Settings → Secrets and variables → Actions → Variables`

| Variable | Required | Value |
|---|---|---|
| `AWS_CI_ROLE_ARN` | for deploys | `terraform -chdir=infra/terraform/cluster output -raw ci_role_arn` |
| `AWS_REGION` | for deploys | `ap-south-1` (must match `cluster/dev.tfvars`) |
| `ECR_REPO_PREFIX` | no | Defaults to `projectcamp` |
| `TRIVY_SEVERITY` | no | Defaults to `CRITICAL,HIGH`. `CRITICAL` alone is the documented minimum |

### Secrets

| Secret | Required | Notes |
|---|---|---|
| `SONAR_TOKEN` | for the Sonar gate | See [section 3](#3-static-analysis-and-security-scanning) |
| `SONAR_HOST_URL` | for the Sonar gate | SonarCloud: `https://sonarcloud.io` |

There is deliberately **no** `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`. The
deploy workflow authenticates with GitHub OIDC and receives short-lived STS
credentials; the trust policy pins the subject to
`repo:<owner>/<repo>:ref:refs/heads/main`, so no other branch and no other
repository can assume the role.

### Repository visibility

This repo is public, which matters for three things that would otherwise cost money:

- **Code scanning** — Trivy SARIF upload in `ci.yml` is free on public repos.
  On a private repo it needs GitHub Advanced Security, and the upload step sits
  *before* the security gate, so the gate would never run.
- **Secret scanning** — free, and it overlaps what Trivy's `secret` scanner covers.
- **SonarCloud** — free tier covers public repositories.

If this repo is ever made private, revisit all three.

---

## 3. Static analysis and security scanning

### SonarCloud

`ci.yml`'s `sonarqube` job fails fast with a clear error if `SONAR_TOKEN` or
`SONAR_HOST_URL` is unset, rather than letting the scanner emit a connection error
30 seconds later. To set it up:

1. Sign in at <https://sonarcloud.io> with the GitHub account and import the repo.
2. Choose **"With GitHub Actions"** as the analysis method.
3. Set `SONAR_TOKEN` to the generated token and `SONAR_HOST_URL` to
   `https://sonarcloud.io`.
4. In the project's **Administration → Analysis Method**, turn *off* Automatic
   Analysis — it conflicts with a CI-based scan and the two will fight.

`sonar-project.properties` declares `backend` and `frontend` as separate modules,
each pointing at its own `coverage/lcov.info`. `ci.yml` uploads both LCOV files as
artifacts from the two quality jobs and downloads them into the Sonar job, because
the scan runs on a different runner than the tests.

The checkout uses `fetch-depth: 0` on purpose: Sonar needs full history to
attribute issues and to compute "new code" for the gate. A shallow clone silently
degrades both.

> **Coverage caveat.** `frontend/vitest.config.js` sets
> `coverage.include: ["src/utils/**/*.js"]`, so the frontend coverage figure Sonar
> ingests describes the utils directory only — not the 60-odd component files.
> Read that number accordingly; it is not whole-app coverage.

Self-hosting SonarQube instead is possible but means running and patching a server
reachable from GitHub runners. For this project SonarCloud gives the same gate at
no operating cost.

### Trivy

Two scan surfaces, and they are not redundant:

- **`dependency-scan`** scans the source tree (lockfiles) for both packages. This
  is the *only* place a vulnerable frontend dependency is visible — the frontend
  image contains just the compiled bundle served by nginx, so `node_modules` never
  reaches it and an image scan cannot see it.
- **`build-scan`** scans the built images, catching OS-level CVEs in the base
  layers that a lockfile scan knows nothing about.

Each scan writes a human-readable table artifact and fails the build on findings at
or above `TRIVY_SEVERITY`, with `ignore-unfixed: true` so an unfixable CVE does not
block indefinitely. Artifacts upload with `if: always()`, so the report is
available on exactly the runs where the gate failed and you need it.

**Suppressions** go in `.trivyignore`, which is currently empty of entries by
design. Every entry must carry a CVE id, an expiry date, and a written
justification. "It is noisy" is not a justification.

---

## 4. Terraform: cluster and platform

Two root stacks, applied in order. The split exists because the `helm` and
`kubernetes` providers need a cluster endpoint that does not exist until the first
stack has applied. Two states applied in sequence removes that problem rather than
working around it with `-target`.

Applying is a **human action from a workstation**, not something CI does.
`terraform.yml` runs `fmt -check` and `validate` only, with
`init -backend=false` so it needs no AWS credentials at all. The application is
deployed continuously because it changes often and a bad change is cheap to revert;
infrastructure changes rarely and a bad apply can delete a VPC. Reading the plan
yourself is worth the manual step.

### 4.1 State bucket

Terraform cannot store its state in a bucket it has not created yet, so the bucket
is made out-of-band, once:

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
```

Then point both stacks at it:

```bash
cd infra/terraform
cp backend.hcl.example backend.hcl     # gitignored; set bucket to $BUCKET
```

Locking uses S3 native `use_lockfile` (Terraform 1.11+), so there is no DynamoDB
table to create. The per-stack `key` lives in each stack's `versions.tf`, which is
what keeps `cluster.tfstate` and `platform.tfstate` separate while sharing a bucket.

### 4.2 Cluster stack

```bash
cd infra/terraform/cluster
terraform init -backend-config=../backend.hcl
terraform plan  -var-file=dev.tfvars      # read this
terraform apply -var-file=dev.tfvars      # ~15-20 min, mostly the EKS control plane
```

Provisions the VPC, EKS cluster and node group, both ECR repositories, and the
GitHub OIDC provider and CI role.

Then wire up the three things it produces:

```bash
terraform output -raw ci_role_arn          # → GitHub variable AWS_CI_ROLE_ARN
terraform output    nat_gateway_public_ips  # → MongoDB Atlas IP access list
terraform output -raw kubeconfig_command    # run it, before the platform stack
```

All cluster egress leaves through the NAT gateway, so Atlas sees those addresses
rather than pod IPs. Skipping the Atlas allowlist step is the most common reason
the backend starts but cannot reach the database.

### 4.3 Platform stack

```bash
aws eks update-kubeconfig --name <cluster_name> --region ap-south-1   # required first
cd ../platform
terraform init -backend-config=../backend.hcl
terraform apply -var-file=dev.tfvars -var "state_bucket=$BUCKET"
```

Installs the AWS Load Balancer Controller, ArgoCD, metrics-server, and — when
`enable_monitoring = true` — kube-prometheus-stack. It reads the cluster stack's
outputs through a `terraform_remote_state` data source, which is why
`state_bucket` has to be passed as a plain variable: data sources cannot read
`-backend-config`.

The ownership boundary is strict and worth preserving: **Terraform owns the
platform, ArgoCD owns the application. Nothing appears on both sides.**

### 4.4 Cost

The cluster bills continuously once it exists. Rough monthly, left running:

| Item | ~USD/mo |
|---|---|
| EKS control plane | 73 |
| NAT Gateway | 32 + data |
| ALB | 16 |
| 2× t3.medium SPOT | 12 |
| EBS (10Gi Prometheus + 2Gi Grafana) | 1 |
| CloudWatch control-plane logs | variable |
| **≈ total** | **~135–145** |

`enable_monitoring = false` in `platform/dev.tfvars` is the cheapest single lever:
it removes Prometheus, Grafana, Alertmanager, kube-state-metrics, node-exporter and
12Gi of EBS. If you are not actively demonstrating dashboards, leave it off — and
see [teardown](#7-teardown).

---

## 5. Kubernetes and ArgoCD bootstrap

Four manual steps, once per cluster.

**1. Namespace and application secret.** The ConfigMap holds only values safe in
git forever; everything sensitive lives in a Secret created straight into the
cluster and never committed.

```bash
kubectl create namespace projectcamp-dev    # or let namespace.yaml do it
kubectl -n projectcamp-dev create secret generic projectcamp-backend-secrets \
  --from-literal=MONGO_URI='mongodb+srv://...' \
  --from-literal=ACCESS_TOKEN_SECRET='...' \
  --from-literal=REFRESH_TOKEN_SECRET='...' \
  --from-literal=MAILTRAP_SMTP_HOST='...' \
  --from-literal=MAILTRAP_SMTP_PORT='...' \
  --from-literal=MAILTRAP_SMTP_USER='...' \
  --from-literal=MAILTRAP_SMTP_PASS='...'
```

Git names the Secret; only the cluster holds its values. `optional` is left at its
default of `false` on purpose — a missing Secret makes the pod fail to start
loudly, rather than silently booting with an undefined `MONGO_URI` and
crash-looping later for a confusing reason.

**2. Register the ArgoCD Applications.**

```bash
kubectl apply -f argocd/application.yaml              # the app
kubectl apply -f argocd/application-monitoring.yaml   # Grafana dashboards
```

**3. Reach the ArgoCD UI.** It is deliberately not exposed through an Ingress.

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo
kubectl -n argocd port-forward svc/argocd-server 8080:80
```

**4. Wait for the first real image.** `k8s/overlays/dev/kustomization.yaml` ships
with `newTag: NOT-DEPLOYED`, which is not a real tag on purpose: before CI has ever
run, the pull fails loudly instead of silently starting whatever some floating tag
happens to point at. The first merge to `main` replaces it.

### Enabling TLS

`k8s/overlays/dev/patches/ingress-tls.yaml.example` is staged but not applied.
Until a domain exists the app serves over HTTP at the ALB's own DNS name. To
enable it:

1. Set `domain_name` in `platform/dev.tfvars` and apply — this activates the
   otherwise-inert `route53-acm` module.
2. `terraform -chdir=infra/terraform/platform output -raw certificate_arn`
3. Copy the example to `patches/ingress-tls.yaml`, fill in the ARN and hostname.
4. Add `- path: patches/ingress-tls.yaml` to the `patches:` list.
5. Set the same hostname as `CORS_ORIGIN` in `patches/configmap.yaml`.

Step 5 is not optional. `CORS_ORIGIN` is load-bearing twice over: it is the CORS
allowlist *and* the base URL the backend uses to build emailed verification and
password-reset links. If it does not match the hostname users actually visit,
those emails point somewhere broken.

---

## 6. Operating the pipeline

### What runs when

| Event | Workflow | Effect |
|---|---|---|
| PR to `main` | `ci.yml` | Gates only. Publishes nothing. |
| PR touching `infra/**` | `terraform.yml` | `fmt -check` + `validate`. No credentials. |
| Merge to `main` | `deploy.yml` | Re-runs every gate, pushes to ECR, commits the new tag. |
| Manual | `deploy.yml` | Same, via `workflow_dispatch`. |

The gates run twice — once on the PR, once on the merge commit — because what was
tested on the PR was the merge *preview*, not the commit that actually landed.

### Images

One tag, and it is the commit SHA. Not `latest`: a moving pointer means "which code
is running?" has no answer, and redeploying could silently change what runs. ECR
has tag immutability enabled, so a SHA tag can never be repointed even
deliberately. That is what makes rollback deterministic rather than hopeful.

### Rollback

Revert the commit that changed `k8s/overlays/dev/kustomization.yaml` and push.
ArgoCD reconciles to the previous image. Do **not** roll back by re-running a
pipeline — the whole point of the GitOps handoff is that desired state lives in
git history, not in whatever the last successful run happened to apply.

For an emergency stop, disable auto-sync in the ArgoCD UI first, then revert.

### Common failures

| Symptom | Cause |
|---|---|
| `Deploy` fails at startup requesting `security-events` | `deploy.yml`'s top-level `permissions` must grant everything `ci.yml` asks for — a called workflow cannot escalate beyond its caller. |
| `sonarqube` job fails immediately | `SONAR_TOKEN` / `SONAR_HOST_URL` unset. See [section 3](#3-static-analysis-and-security-scanning). |
| `push-ecr` fails on `AssumeRoleWithWebIdentity` | `AWS_CI_ROLE_ARN` unset, or the push is not from `refs/heads/main` — the trust policy pins the subject. |
| `ImagePullBackOff` on `NOT-DEPLOYED` | CI has never completed a deploy. Expected before the first merge. |
| Pods `CreateContainerConfigError` | `projectcamp-backend-secrets` missing. See [section 5](#5-kubernetes-and-argocd-bootstrap). |
| Backend starts, cannot reach Mongo | NAT gateway IPs not in the Atlas access list. |
| ArgoCD `OutOfSync` and flapping replicas | The `ignoreDifferences` rule on `/spec/replicas` is what stops HPA and self-heal fighting. Do not remove it. |
| Manifest-update push rejected | Someone merged mid-run. The job rebases and retries 3×; if it still fails, re-run it. |

---

## 7. Teardown

The cluster bills whether or not anyone is using it. Destroy in reverse order —
platform first, or the load balancer controller leaves an orphaned ALB behind that
blocks VPC deletion.

```bash
kubectl delete -f argocd/application.yaml     # let ArgoCD prune the workload first
cd infra/terraform/platform && terraform destroy -var-file=dev.tfvars -var "state_bucket=$BUCKET"
cd ../cluster                && terraform destroy -var-file=dev.tfvars
```

ECR repositories have `force_delete = false`, so a repository holding images will
refuse to be destroyed. That is deliberate — it makes you look at what you are
deleting. Empty them explicitly when you do mean it:

```bash
aws ecr batch-delete-image --repository-name projectcamp-backend --region ap-south-1 \
  --image-ids "$(aws ecr list-images --repository-name projectcamp-backend \
                 --region ap-south-1 --query 'imageIds[*]' --output json)"
```

The state bucket is not managed by Terraform and survives. Delete it by hand if you
are finished with the project entirely.
