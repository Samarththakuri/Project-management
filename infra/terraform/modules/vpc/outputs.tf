output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "VPC CIDR, used by security group rules in dependent modules."
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet ids. ALBs and NAT Gateways only."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet ids. EKS nodes and application pods."
  value       = aws_subnet.private[*].id
}

output "availability_zones" {
  description = "Availability Zones actually used."
  value       = local.azs
}

output "nat_gateway_public_ips" {
  description = "Stable egress IPs for the cluster. These are the addresses to allowlist in the MongoDB Atlas network access list."
  value       = aws_eip.nat[*].public_ip
}
