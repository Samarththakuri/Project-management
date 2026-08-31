/*
 * DNS and TLS for the application hostname.
 *
 * There is an ordering problem worth understanding here: the ALB is not created
 * by Terraform. The AWS Load Balancer Controller creates it in response to the
 * Kubernetes Ingress that ArgoCD deploys. So on a first-time bootstrap there is
 * no ALB for an alias record to point at.
 *
 * This module therefore applies in two passes:
 *
 *   Pass 1 (create_dns_record = false)
 *     Hosted zone + ACM certificate. DNS validation completes automatically
 *     because the validation records land in the zone this module manages.
 *     The certificate ARN is then fed to the Ingress annotation.
 *
 *   Pass 2 (create_dns_record = true), after ArgoCD has synced the Ingress
 *     Looks the ALB up by the tags the controller stamps on it and creates the
 *     alias record. The ALB DNS name is discovered, never hardcoded.
 *
 * ExternalDNS would collapse this into one pass, at the cost of having two
 * systems able to write the same record. One writer is easier to reason about.
 */

# ---------------------------------------------------------------------------
# Hosted zone: created here, or looked up if you already own one
# ---------------------------------------------------------------------------
resource "aws_route53_zone" "this" {
  count = var.create_hosted_zone ? 1 : 0

  name    = var.domain_name
  comment = "Managed by Terraform for ${var.project_name}"

  tags = merge(var.tags, { Name = var.domain_name })
}

data "aws_route53_zone" "existing" {
  count = var.create_hosted_zone ? 0 : 1

  name         = var.domain_name
  private_zone = false
}

locals {
  zone_id = var.create_hosted_zone ? aws_route53_zone.this[0].zone_id : data.aws_route53_zone.existing[0].zone_id

  # The hostname this environment serves, e.g. dev.example.com, or the apex when
  # no subdomain is given.
  fqdn = var.subdomain == "" ? var.domain_name : "${var.subdomain}.${var.domain_name}"
}

# ---------------------------------------------------------------------------
# ACM certificate
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "this" {
  domain_name               = local.fqdn
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  tags = merge(var.tags, { Name = local.fqdn })

  lifecycle {
    # Renewal issues a replacement certificate. Standing the new one up before
    # removing the old avoids a window where the Ingress references nothing.
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = local.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Blocks until ACM has actually issued. Without this, the Ingress could be handed
# a certificate ARN that is still PENDING_VALIDATION, and the HTTPS listener would
# fail to come up.
resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

# ---------------------------------------------------------------------------
# Alias record (pass 2)
# ---------------------------------------------------------------------------
data "aws_lb" "ingress" {
  count = var.create_dns_record ? 1 : 0

  # These tags are applied by the AWS Load Balancer Controller to the ALB it
  # provisions for the Ingress. Matching on them is how Terraform finds a load
  # balancer it did not create.
  #
  # stack-namespace and stack-name are used rather than the combined
  # `ingress.k8s.aws/stack` tag, because that one holds the group name when the
  # Ingress belongs to a group and namespace/name only when it does not.
  tags = {
    "elbv2.k8s.aws/cluster"           = var.cluster_name
    "ingress.k8s.aws/stack-namespace" = var.ingress_namespace
    "ingress.k8s.aws/stack-name"      = var.ingress_name
    "ingress.k8s.aws/resource"        = "LoadBalancer"
  }
}

resource "aws_route53_record" "alias" {
  count = var.create_dns_record ? 1 : 0

  zone_id = local.zone_id
  name    = local.fqdn
  type    = "A"

  # An alias record, not a CNAME: it works at the zone apex, resolves to the ALB's
  # current addresses as they change, and Route53 does not bill for the queries.
  alias {
    name                   = data.aws_lb.ingress[0].dns_name
    zone_id                = data.aws_lb.ingress[0].zone_id
    evaluate_target_health = true
  }
}
