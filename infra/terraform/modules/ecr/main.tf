/*
 * Private ECR repository for one application image.
 *
 * The single most important setting here is image_tag_mutability = IMMUTABLE.
 * The whole traceability story - git commit -> image tag -> GitOps commit ->
 * running pod - collapses if a tag can be repointed at different content after
 * the fact. Immutable tags also mean a rollback by `git revert` deterministically
 * restores the exact bytes that were running before.
 */

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

resource "aws_ecr_repository" "this" {
  name = var.repository_name

  image_tag_mutability = "IMMUTABLE"

  # Free CVE scan on every push. This is a safety net behind the Trivy gate in CI,
  # not a replacement for it: Trivy blocks *before* publication, this catches
  # vulnerabilities disclosed after an image was already pushed.
  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = var.kms_key_arn == null ? "AES256" : "KMS"
    kms_key         = var.kms_key_arn
  }

  # Refuse to destroy a repository that still holds images. Deleting published
  # artifacts would break rollback for every environment still pointing at them.
  force_delete = false

  tags = merge(var.tags, { Name = var.repository_name })
}

/*
 * Lifecycle policy.
 *
 * Rules are evaluated in priority order and each image matches only the first
 * rule that applies, so the untagged rule must come first.
 */
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after ${var.untagged_expiry_days} days. These are orphaned layers from overwritten manifests and multi-arch builds; nothing can deploy them."
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_expiry_days
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the most recent ${var.keep_last_images} images. Deep enough that any environment's current image, and several rollback targets behind it, always survive."
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.keep_last_images
        }
        action = { type = "expire" }
      },
    ]
  })
}

/*
 * Repository policy.
 *
 * Only created when other AWS accounts need pull access. In the single-account
 * setup there is nothing to add here: the CI role's push permission comes from
 * its own identity policy, and nodes pull via AmazonEC2ContainerRegistryReadOnly.
 * An unnecessary resource policy is a way to accidentally widen access.
 */
data "aws_iam_policy_document" "cross_account_pull" {
  count = length(var.cross_account_pull_arns) > 0 ? 1 : 0

  statement {
    sid    = "AllowCrossAccountPull"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = var.cross_account_pull_arns
    }

    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
    ]
  }
}

resource "aws_ecr_repository_policy" "this" {
  count = length(var.cross_account_pull_arns) > 0 ? 1 : 0

  repository = aws_ecr_repository.this.name
  policy     = data.aws_iam_policy_document.cross_account_pull[0].json
}
