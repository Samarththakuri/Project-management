/*
 * Platform stack: the components that have to exist inside the cluster before an
 * application can be deployed into it.
 *
 *   AWS Load Balancer Controller  - turns an Ingress object into a real ALB
 *   ArgoCD                        - the thing that actually deploys the app
 *   metrics-server                - supplies the CPU numbers the HPA reads
 *   kube-prometheus-stack         - Prometheus + Grafana
 *   Route53 + ACM                 - optional, only once you own a domain
 *
 * Applied after the cluster stack. Once this has run, deployment stops being a
 * Terraform concern entirely: ArgoCD takes over, and the only thing that changes
 * the running application is a commit under k8s/.
 *
 * Note what is NOT here: the application's Deployments, Services and Ingress.
 * Those live in k8s/ and are owned by ArgoCD. The boundary is deliberate -
 * Terraform owns infrastructure that changes rarely, Git owns application state
 * that changes on every merge.
 */

locals {
  cluster_name = data.terraform_remote_state.cluster.outputs.cluster_name
}

module "platform" {
  source = "../modules/platform-helm"

  cluster_name = local.cluster_name
  region       = var.aws_region
  vpc_id       = data.terraform_remote_state.cluster.outputs.vpc_id
  environment  = var.environment

  # IRSA: the load balancer controller gets its AWS permissions from a role bound
  # to its ServiceAccount, not from node credentials or a mounted access key.
  oidc_provider_arn = data.terraform_remote_state.cluster.outputs.oidc_provider_arn
  oidc_provider_url = data.terraform_remote_state.cluster.outputs.oidc_provider_url

  enable_monitoring       = var.enable_monitoring
  prometheus_retention    = var.prometheus_retention
  prometheus_storage_size = var.prometheus_storage_size
  grafana_storage_size    = var.grafana_storage_size
}

/*
 * DNS and TLS.
 *
 * Skipped entirely while domain_name is empty, so the cluster can be stood up and
 * the whole pipeline exercised over the ALB's own hostname before you own a
 * domain. Nothing else depends on this module.
 */
module "dns" {
  count  = var.domain_name == "" ? 0 : 1
  source = "../modules/route53-acm"

  project_name = var.project_name
  domain_name  = var.domain_name
  subdomain    = var.subdomain

  create_hosted_zone = var.create_hosted_zone

  # Pass 1 leaves this false: the alias record points at an ALB that does not
  # exist until ArgoCD has synced the Ingress. Flip it to true and re-apply once
  # `kubectl get ingress -n projectcamp-dev` shows an address.
  create_dns_record = var.create_dns_record

  cluster_name      = local.cluster_name
  ingress_namespace = var.ingress_namespace
  ingress_name      = var.ingress_name
}
