terraform {
  # 1.11+ for native S3 state locking (use_lockfile). Earlier versions needed a
  # separate DynamoDB table just to hold a lock; that option has since been
  # removed, and not needing it is one less resource to explain.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  /*
   * Remote state in S3.
   *
   * Local state would work for one person on one laptop, but it cannot be locked,
   * cannot be recovered if the laptop dies, and cannot be read by the platform
   * stack. The bucket itself is created out-of-band with a single aws-cli command
   * (see docs/cicd/RUNBOOK.md section 4.1) rather than by Terraform, because
   * Terraform cannot store its own state in a bucket it has not created yet.
   *
   * The bucket name embeds an AWS account id, so it is not committed:
   *   terraform init -backend-config=../backend.hcl
   */
  backend "s3" {
    key          = "cluster.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  # Applied to every resource this stack creates, so `terraform destroy` is never
  # the only way to find out what belongs to this project.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Stack       = "cluster"
    }
  }
}
