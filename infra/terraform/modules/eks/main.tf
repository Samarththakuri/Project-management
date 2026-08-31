/*
 * EKS cluster with a managed control plane and a managed node group in private
 * subnets.
 *
 * Deliberate choices worth being able to defend:
 *
 *   - Access Entries, not the aws-auth ConfigMap. aws-auth is legacy: a bad edit
 *     locks everyone out of the cluster with no IAM-level recovery path. Access
 *     Entries are real API objects that Terraform can manage and repair.
 *
 *   - Envelope encryption of Kubernetes Secrets with a customer-managed KMS key.
 *     Without it, Secrets are only base64 in etcd.
 *
 *   - IRSA for the VPC CNI and the EBS CSI driver rather than attaching their
 *     policies to the node role. On the node role, every pod on the node inherits
 *     the permission to manipulate ENIs and EBS volumes.
 */

data "aws_partition" "current" {}

locals {
  # Strip the scheme: IAM condition keys are built from the bare host and path.
  oidc_provider_url = replace(aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "")
}

# ---------------------------------------------------------------------------
# KMS key for Secret envelope encryption and control plane log encryption
# ---------------------------------------------------------------------------
resource "aws_kms_key" "eks" {
  description             = "EKS secret envelope encryption for ${var.cluster_name}"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = merge(var.tags, { Name = "${var.cluster_name}-eks" })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.cluster_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# ---------------------------------------------------------------------------
# Control plane IAM
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "cluster_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cluster" {
  name               = "${var.cluster_name}-cluster"
  assume_role_policy = data.aws_iam_policy_document.cluster_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "cluster" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_cloudwatch_log_group" "cluster" {
  # EKS writes to this exact log group name. Creating it here means Terraform owns
  # the retention setting; left to EKS it would be created with never-expire.
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = var.cluster_log_retention_days

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Cluster
# ---------------------------------------------------------------------------
resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  version  = var.kubernetes_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = var.private_subnet_ids

    # Private access is always on: in-cluster clients reach the API over the VPC
    # rather than hairpinning out to the internet.
    endpoint_private_access = true
    endpoint_public_access  = var.endpoint_public_access
    public_access_cidrs     = var.endpoint_public_access_cidrs
  }

  access_config {
    # API_AND_CONFIG_MAP rather than API alone, so an existing aws-auth ConfigMap
    # keeps working during a migration. New clusters effectively use API only.
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = var.cluster_log_types

  tags = merge(var.tags, { Name = var.cluster_name })

  depends_on = [
    aws_iam_role_policy_attachment.cluster,
    aws_cloudwatch_log_group.cluster,
  ]
}

# ---------------------------------------------------------------------------
# IAM OIDC provider - the foundation every IRSA role is built on
# ---------------------------------------------------------------------------
data "tls_certificate" "oidc" {
  url = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "this" {
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.oidc.certificates[0].sha1_fingerprint]

  tags = merge(var.tags, { Name = "${var.cluster_name}-oidc" })
}

# ---------------------------------------------------------------------------
# Node group IAM
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "node_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "node" {
  name               = "${var.cluster_name}-node"
  assume_role_policy = data.aws_iam_policy_document.node_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy",

    # This is what allows the kubelet to pull application images from ECR. It is
    # read-only: nodes can pull, they can never push.
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",

    # Lets you open a shell on a node through SSM Session Manager. Nodes have no
    # public IP and no SSH key, so this is the only debugging path in.
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.node.name
  policy_arn = each.value
}

resource "aws_eks_node_group" "this" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.cluster_name}-ng"
  node_role_arn   = aws_iam_role.node.arn

  # Private subnets only. Combined with map_public_ip_on_launch = false on those
  # subnets, nodes get no public address and are unreachable from the internet.
  subnet_ids = var.private_subnet_ids

  instance_types = [var.node_instance_type]
  capacity_type  = var.node_capacity_type
  disk_size      = var.node_disk_size

  scaling_config {
    desired_size = var.desired_nodes
    min_size     = var.min_nodes
    max_size     = var.max_nodes
  }

  update_config {
    # Replace at most one node at a time so capacity never dips during an upgrade.
    max_unavailable = 1
  }

  tags = merge(var.tags, { Name = "${var.cluster_name}-ng" })

  lifecycle {
    # The cluster autoscaler (or a manual scale) owns desired_size at runtime.
    # Without this, every apply would reset the node count.
    ignore_changes = [scaling_config[0].desired_size]
  }

  depends_on = [aws_iam_role_policy_attachment.node]
}

# ---------------------------------------------------------------------------
# Addon IRSA roles
# ---------------------------------------------------------------------------
module "vpc_cni_irsa" {
  source = "../irsa"

  name              = "${var.cluster_name}-vpc-cni"
  description       = "VPC CNI ENI and IP address management for ${var.cluster_name}"
  oidc_provider_arn = aws_iam_openid_connect_provider.this.arn
  oidc_provider_url = local.oidc_provider_url
  namespace         = "kube-system"
  service_accounts  = ["aws-node"]
  policy_arns       = ["arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKS_CNI_Policy"]

  tags = var.tags
}

module "ebs_csi_irsa" {
  count  = var.enable_ebs_csi ? 1 : 0
  source = "../irsa"

  name              = "${var.cluster_name}-ebs-csi"
  description       = "EBS CSI driver volume management for ${var.cluster_name}"
  oidc_provider_arn = aws_iam_openid_connect_provider.this.arn
  oidc_provider_url = local.oidc_provider_url
  namespace         = "kube-system"
  service_accounts  = ["ebs-csi-controller-sa"]
  policy_arns       = ["arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"]

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Addons
#
# Ordering matters. coredns schedules onto nodes, so it cannot become healthy
# until the node group exists; vpc-cni and kube-proxy must be in place before a
# node can join at all.
# ---------------------------------------------------------------------------
resource "aws_eks_addon" "vpc_cni" {
  cluster_name             = aws_eks_cluster.this.name
  addon_name               = "vpc-cni"
  service_account_role_arn = module.vpc_cni_irsa.role_arn

  # The AWS VPC CNI does not enforce NetworkPolicy unless its policy controller is
  # switched on. Shipping NetworkPolicy manifests without this produces objects
  # that exist, look correct in kubectl, and enforce nothing - which is worse than
  # having no policies at all, because it looks like protection.
  configuration_values = jsonencode({
    enableNetworkPolicy = var.enable_network_policy ? "true" : "false"
  })

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.this.name
  addon_name   = "kube-proxy"

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.this.name
  addon_name   = "coredns"

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags

  depends_on = [aws_eks_node_group.this]
}

resource "aws_eks_addon" "ebs_csi" {
  count = var.enable_ebs_csi ? 1 : 0

  cluster_name             = aws_eks_cluster.this.name
  addon_name               = "aws-ebs-csi-driver"
  service_account_role_arn = module.ebs_csi_irsa[0].role_arn

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.tags

  depends_on = [aws_eks_node_group.this]
}

# ---------------------------------------------------------------------------
# Additional cluster administrators
# ---------------------------------------------------------------------------
resource "aws_eks_access_entry" "admin" {
  for_each = toset(var.admin_access_entries)

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value
  type          = "STANDARD"

  tags = var.tags
}

resource "aws_eks_access_policy_association" "admin" {
  for_each = toset(var.admin_access_entries)

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value
  policy_arn    = "arn:${data.aws_partition.current.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}
