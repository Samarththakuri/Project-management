/*
 * IAM Roles for Service Accounts (IRSA).
 *
 * A pod annotated with `eks.amazonaws.com/role-arn` exchanges its projected
 * ServiceAccount token with STS for temporary AWS credentials. That means an
 * individual workload gets exactly the AWS permissions it needs, rather than
 * inheriting the node role - which every pod on that node would share.
 *
 * The trust policy pins both the audience and the exact
 * system:serviceaccount:<namespace>:<name> subject, so another workload in
 * another namespace cannot assume the role even inside the same cluster.
 */

data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = [for sa in var.service_accounts : "system:serviceaccount:${var.namespace}:${sa}"]
    }
  }
}

resource "aws_iam_role" "this" {
  name        = var.name
  description = var.description

  assume_role_policy = data.aws_iam_policy_document.assume.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "managed" {
  for_each = toset(var.policy_arns)

  role       = aws_iam_role.this.name
  policy_arn = each.value
}

resource "aws_iam_policy" "inline" {
  count = var.inline_policy_json == null ? 0 : 1

  name        = "${var.name}-policy"
  description = "Least-privilege policy for ${var.name}."
  policy      = var.inline_policy_json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "inline" {
  count = var.inline_policy_json == null ? 0 : 1

  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.inline[0].arn
}
