# Platform layer for the dev cluster.
#
# Apply AFTER cluster/, and after running the kubeconfig command that stack
# outputs - this stack talks to the Kubernetes API directly.
#
#   terraform init -backend-config=../backend.hcl
#   terraform apply -var-file=dev.tfvars

aws_region  = "ap-south-1"
environment = "dev"

# Same bucket as backend.hcl. Needed here as a plain value because the
# terraform_remote_state data source cannot read -backend-config.
state_bucket = "projectcamp-tfstate-435958718012"

# Monitoring is on in dev because dev is where you learn to read the dashboards
# before you need them. Retention and volumes are small to keep the bill down.
# Set enable_monitoring = false if you want the cheapest possible cluster; no
# other part of the pipeline depends on it.
enable_monitoring       = true
prometheus_retention    = "7d"
prometheus_storage_size = "10Gi"
grafana_storage_size    = "2Gi"

# --- DNS and TLS -----------------------------------------------------------
#
# Leave domain_name empty until you own a domain. With it empty the Ingress still
# creates a real ALB and the app is reachable at the ALB's own hostname over HTTP,
# which is enough to demonstrate the entire pipeline.
domain_name        = ""
subdomain          = "dev"
create_hosted_zone = false

# Stays false on the first apply: the alias record needs an ALB that does not
# exist until ArgoCD has synced the Ingress. See the two-pass note in
# modules/route53-acm.
create_dns_record = false

# Must match k8s/overlays/dev exactly - these two values are how Terraform finds
# the ALB the load balancer controller created.
# Verify with: kubectl kustomize k8s/overlays/dev | grep -B5 "kind: Ingress"
ingress_namespace = "projectcamp-dev"
ingress_name      = "projectcamp"
