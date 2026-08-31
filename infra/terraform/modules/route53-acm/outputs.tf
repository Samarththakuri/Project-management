output "zone_id" {
  description = "Route53 hosted zone id."
  value       = local.zone_id
}

output "name_servers" {
  description = "Nameservers to configure at the registrar. Only populated when this module created the zone; DNS validation and every record below it stay pending until the registrar points here."
  value       = var.create_hosted_zone ? aws_route53_zone.this[0].name_servers : []
}

output "certificate_arn" {
  description = "Validated ACM certificate ARN. Goes into the Ingress alb.ingress.kubernetes.io/certificate-arn annotation."
  value       = aws_acm_certificate_validation.this.certificate_arn
}

output "fqdn" {
  description = "Hostname this environment serves. Must match the Ingress host rule and the backend's CORS_ORIGIN."
  value       = local.fqdn
}

output "app_url" {
  description = "Public URL, and the exact value CORS_ORIGIN must be set to - it also builds the emailed verification and password-reset links."
  value       = "https://${local.fqdn}"
}
