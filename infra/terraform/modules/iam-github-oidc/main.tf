/*
 * GitHub Actions -> AWS, without a single long-lived access key.
 *
 *   Workflow requests an OIDC token from GitHub  (permissions: id-token: write)
 *        -> sts:AssumeRoleWithWebIdentity
 *        -> temporary credentials, ~1 hour, scoped to this role
 *
 * Two things keep this tight:
 *
 *   1. The trust policy pins the `sub` claim to this repository AND to a specific
 *      branch or GitHub Environment. A workflow on a feature branch, or in any
 *      other repository, cannot assume the role even with a valid GitHub token.
 *
 *   2. The permission policy grants ECR push on two named repositories and
 *      nothing else. Notably absent: eks:*, ecr:Delete*, ecr:BatchDeleteImage,
 *      secretsmanager:*, iam:*. CI publishes artifacts; it does not deploy, and
 *      it cannot reach the cluster or read a secret.
 */

data "aws_partition" "current" {}

# ---------------------------------------------------------------------------
# The OIDC identity provider. One per AWS account - if another stack already
# created it, set create_oidc_provider = false and pass its ARN instead.
# ---------------------------------------------------------------------------
data "tls_certificate" "github" {
  count = var.create_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # Read from the live certificate chain rather than hardcoded. GitHub has
  # rotated this thumbprint before, and a stale literal breaks every workflow.
  thumbprint_list = [data.tls_certificate.github[0].certificates[0].sha1_fingerprint]

  tags = merge(var.tags, { Name = "github-actions-oidc" })
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_oidc_provider_arn

  /*
   * Allowed `sub` claim values.
   *
   *   repo:<owner>/<repo>:environment:<env>   - job declared `environment: <env>`
   *   repo:<owner>/<repo>:ref:refs/heads/main - job ran on the main branch
   *
   * Note there is no wildcard over the repository or the ref. `repo:owner/repo:*`
   * is the classic mistake: it lets a pull request from a fork, or any branch a
   * contributor can create, assume the role.
   */
  allowed_subjects = concat(
    [for env in var.allowed_environments : "repo:${var.github_repository}:environment:${env}"],
    [for branch in var.allowed_branches : "repo:${var.github_repository}:ref:refs/heads/${branch}"],
  )
}

# ---------------------------------------------------------------------------
# Trust policy
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    # Without the aud condition, a token minted for a different audience would be
    # accepted. This is not optional.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.allowed_subjects
    }
  }
}

resource "aws_iam_role" "ci" {
  name        = var.role_name
  description = "GitHub Actions CI role for ${var.github_repository} (${var.environment})"

  assume_role_policy = data.aws_iam_policy_document.assume.json

  # An hour is plenty for build-and-push and limits the blast radius if a set of
  # credentials leaks out of a workflow log.
  max_session_duration = 3600

  tags = merge(var.tags, {
    Name        = var.role_name
    Environment = var.environment
  })
}

# ---------------------------------------------------------------------------
# Permissions: publish images, nothing else
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ecr_push" {
  # GetAuthorizationToken has no resource-level permissions in the ECR API; it can
  # only be granted on "*". It returns a registry login token, not access to any
  # particular repository - the statement below is what actually bounds access.
  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      # Read-back permissions. Buildx checks which layers the registry already
      # has before uploading, so a push without these still works but re-uploads
      # every layer every time.
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
    ]
    resources = var.ecr_repository_arns
  }
}

resource "aws_iam_policy" "ecr_push" {
  name        = "${var.role_name}-ecr-push"
  description = "Push application images to the ${var.environment} ECR repositories."
  policy      = data.aws_iam_policy_document.ecr_push.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecr_push" {
  role       = aws_iam_role.ci.name
  policy_arn = aws_iam_policy.ecr_push.arn
}

/*
 * Explicit deny boundary.
 *
 * The permissions above already omit these actions, so this is belt and braces -
 * but an explicit Deny cannot be overridden by any future policy attached to the
 * role. If someone later attaches PowerUserAccess to this role by mistake, CI
 * still cannot reach the cluster or delete published artifacts.
 */
data "aws_iam_policy_document" "deny_dangerous" {
  statement {
    sid    = "DenyClusterAndDestructiveActions"
    effect = "Deny"
    actions = [
      "eks:*",
      "ecr:DeleteRepository",
      "ecr:BatchDeleteImage",
      "ecr:DeleteRepositoryPolicy",
      "secretsmanager:*",
      "iam:*",
      "sts:AssumeRole",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "deny_dangerous" {
  name        = "${var.role_name}-deny"
  description = "Hard ceiling on what the CI role can ever do."
  policy      = data.aws_iam_policy_document.deny_dangerous.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "deny_dangerous" {
  role       = aws_iam_role.ci.name
  policy_arn = aws_iam_policy.deny_dangerous.arn
}
