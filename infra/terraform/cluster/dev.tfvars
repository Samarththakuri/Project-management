# Development cluster.
#
# Tuned for the smallest bill that still exercises the real architecture: one NAT
# Gateway instead of three, SPOT capacity, and two small nodes. Everything
# structural - private subnets, IRSA, immutable image tags, the ALB path - is
# identical to what a production cluster would use, so what you learn here
# transfers directly.
#
# Apply with:
#   terraform init -backend-config=../backend.hcl
#   terraform apply -var-file=dev.tfvars

aws_region  = "ap-south-1"
environment = "dev"

# Must match this repository exactly. It is written into the IAM trust policy,
# and a mismatch shows up as "Not authorized to perform sts:AssumeRoleWithWebIdentity"
# in GitHub Actions rather than as a Terraform error.
github_repository = "Samarththakuri/Project-management"

vpc_cidr = "10.10.0.0/16"
az_count = 3

# ~32 USD/month saved. Acceptable in dev: if that one AZ has an outage, the
# cluster loses outbound internet until it recovers.
single_nat_gateway = true
enable_flow_logs   = false

kubernetes_version = "1.33"

# SPOT can be reclaimed with a two-minute warning. Fine for dev, and it means
# rolling updates and pod rescheduling get exercised for real rather than in
# theory.
node_instance_type = "t3.medium"
node_capacity_type = "SPOT"
desired_nodes      = 2
min_nodes          = 2
max_nodes          = 4

# Narrow this to your own IP once the cluster is up. Left open so a first-time
# bootstrap from any network works; IAM authentication still applies regardless.
endpoint_public_access_cidrs = ["0.0.0.0/0"]
